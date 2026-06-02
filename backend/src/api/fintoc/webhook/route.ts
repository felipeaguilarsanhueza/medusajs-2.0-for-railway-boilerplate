import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { completeCartWorkflow } from "@medusajs/medusa/core-flows"
import {
  getRawBody,
  normalizeAmount,
  verifyFintocSignature,
} from "lib/fintoc"

function getHeader(req: MedusaRequest, name: string) {
  const value = req.headers[name.toLowerCase()]
  return Array.isArray(value) ? value[0] : value
}

function getMetadata(event: any) {
  return (
    event?.data?.metadata ||
    event?.data?.payment_resource?.payment_intent?.metadata ||
    event?.data?.checkout_session?.metadata ||
    {}
  )
}

function getCartId(event: any) {
  return getMetadata(event)?.cart_id
}

function getEventAmount(event: any) {
  return normalizeAmount(
    event?.data?.amount ??
      event?.data?.payment_resource?.payment_intent?.amount ??
      event?.data?.payment_intent?.amount
  )
}

function isSuccessfulPaymentEvent(event: any) {
  const type = event?.type
  const data = event?.data
  const paymentIntent = data?.payment_resource?.payment_intent

  if (type === "payment_intent.succeeded") {
    return data?.status === "succeeded"
  }

  if (type === "checkout_session.finished") {
    return (
      data?.status === "finished" &&
      (data?.payment_status === "succeeded" ||
        paymentIntent?.status === "succeeded")
    )
  }

  return false
}

async function retrieveCart(scope: MedusaRequest["scope"], cartId: string) {
  const cartModuleService = scope.resolve(Modules.CART) as any

  try {
    return await cartModuleService.retrieveCart(cartId)
  } catch (error) {
    const query = scope.resolve(ContainerRegistrationKeys.QUERY) as any
    const { data } = await query.graph({
      entity: "cart",
      fields: ["id", "total", "raw_total"],
      filters: {
        id: cartId,
      },
    })

    return data?.[0]
  }
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER) as any
  const rawBody = getRawBody(req.rawBody, req.body)
  const signatureHeader = getHeader(req, "fintoc-signature")
  const webhookSecret = process.env.FINTOC_WEBHOOK_SECRET

  if (webhookSecret) {
    const toleranceSeconds = Number(
      process.env.FINTOC_WEBHOOK_TOLERANCE_SECONDS || 300
    )
    const verification = verifyFintocSignature({
      rawBody,
      signatureHeader,
      secret: webhookSecret,
      toleranceSeconds,
    })

    if (verification.valid === false) {
      logger.warn(`Fintoc webhook rejected: ${verification.reason}`)
      res.status(400).json({ received: false, error: verification.reason })
      return
    }
  } else if (process.env.NODE_ENV === "production") {
    logger.error("FINTOC_WEBHOOK_SECRET is required in production")
    res.status(500).json({
      received: false,
      error: "FINTOC_WEBHOOK_SECRET is not configured",
    })
    return
  } else {
    logger.warn("FINTOC_WEBHOOK_SECRET is not configured; skipping signature check")
  }

  let event: any
  try {
    event = typeof req.body === "object" ? req.body : JSON.parse(rawBody)
  } catch (error) {
    res.status(400).json({ received: false, error: "Invalid JSON payload" })
    return
  }

  if (!isSuccessfulPaymentEvent(event)) {
    logger.info(`Fintoc webhook received and ignored: ${event?.type}`)
    res.status(200).json({ received: true, ignored: true })
    return
  }

  const cartId = getCartId(event)
  if (!cartId) {
    logger.warn(`Fintoc webhook ${event?.id} has no cart_id metadata`)
    res.status(200).json({ received: true, ignored: true })
    return
  }

  try {
    const cart = await retrieveCart(req.scope, cartId)
    if (!cart) {
      res.status(404).json({ received: false, error: "Cart not found" })
      return
    }

    const cartTotal = normalizeAmount(cart.total ?? cart.raw_total)
    const eventAmount = getEventAmount(event)

    if (cartTotal && eventAmount && cartTotal !== eventAmount) {
      logger.error(
        `Fintoc amount mismatch for cart ${cartId}: cart=${cartTotal}, event=${eventAmount}`
      )
      res.status(409).json({
        received: false,
        error: "Fintoc payment amount does not match cart total",
      })
      return
    }

    const { result } = await completeCartWorkflow(req.scope).run({
      input: {
        id: cartId,
      },
    })

    logger.info(
      `Fintoc payment confirmed for cart ${cartId}; completed order ${result.id}`
    )

    res.status(200).json({
      received: true,
      order_id: result.id,
    })
  } catch (error: any) {
    logger.error(`Fintoc webhook failed for cart ${cartId}: ${error?.message}`)
    res.status(500).json({
      received: false,
      error: error?.message || "Error completing Fintoc order",
    })
  }
}
