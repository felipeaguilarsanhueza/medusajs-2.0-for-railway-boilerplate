import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import {
  FINTOC_API_URL,
  getCartAmount,
  getLineItemUnitAmount,
  normalizeRut,
} from "lib/fintoc"

type CreateFintocSessionBody = {
  cart_id?: string
  success_url?: string
  cancel_url?: string
  customer?: {
    first_name?: string
    last_name?: string
    email?: string
    phone?: string
    rut?: string
  }
}

async function retrieveCart(scope: MedusaRequest["scope"], cartId: string) {
  const cartModuleService = scope.resolve(Modules.CART) as any
  const query = scope.resolve(ContainerRegistrationKeys.QUERY) as any

  const retrieveCartFromQuery = async () => {
    const { data } = await query.graph({
      entity: "cart",
      fields: [
        "id",
        "email",
        "total",
        "raw_total",
        "subtotal",
        "raw_subtotal",
        "item_total",
        "raw_item_total",
        "currency_code",
        "items.id",
        "items.title",
        "items.quantity",
        "items.total",
        "items.raw_total",
        "items.subtotal",
        "items.raw_subtotal",
        "items.unit_price",
        "items.raw_unit_price",
        "items.thumbnail",
      ],
      filters: {
        id: cartId,
      },
    })

    return data?.[0]
  }

  try {
    const cart = await cartModuleService.retrieveCart(cartId, {
      relations: ["items"],
    })
    const queriedCart = await retrieveCartFromQuery().catch(() => null)

    if (!queriedCart) {
      return cart
    }

    return {
      ...cart,
      ...queriedCart,
      items: queriedCart.items?.length ? queriedCart.items : cart.items,
    }
  } catch (error) {
    return retrieveCartFromQuery()
  }
}

function getFallbackStoreUrl(req: MedusaRequest) {
  const origin = req.headers.origin
  if (typeof origin === "string" && origin.startsWith("http")) {
    return origin
  }

  const corsOrigin = process.env.STORE_CORS?.split(",")?.find((url) =>
    url.startsWith("http")
  )

  return (
    process.env.FRONTEND_URL ||
    process.env.STOREFRONT_URL ||
    corsOrigin ||
    "http://localhost:5173"
  ).replace(/\/$/, "")
}

function isHttpUrl(url?: string) {
  return Boolean(url && /^https?:\/\//i.test(url))
}

export async function POST(
  req: MedusaRequest<CreateFintocSessionBody>,
  res: MedusaResponse
) {
  try {
    const { cart_id: cartId, customer, success_url, cancel_url } = req.body

    if (!cartId) {
      res.status(400).json({ success: false, error: "Missing cart_id" })
      return
    }

    const secretKey = process.env.FINTOC_SECRET_KEY
    if (!secretKey) {
      res.status(500).json({
        success: false,
        error: "FINTOC_SECRET_KEY is not configured",
      })
      return
    }

    const cart = await retrieveCart(req.scope, cartId)
    if (!cart) {
      res.status(404).json({ success: false, error: "Cart not found" })
      return
    }

    const amount = getCartAmount(cart)
    if (!amount || amount <= 0) {
      res.status(400).json({
        success: false,
        error: "Cart total must be greater than zero",
      })
      return
    }

    const storeUrl = getFallbackStoreUrl(req)
    const safeSuccessUrl = isHttpUrl(success_url)
      ? success_url!
      : `${storeUrl}/checkout?payment=fintoc&status=success&cart_id=${encodeURIComponent(cartId)}`
    const safeCancelUrl = isHttpUrl(cancel_url)
      ? cancel_url!
      : `${storeUrl}/checkout?payment=fintoc&status=cancel&cart_id=${encodeURIComponent(cartId)}`

    const fullName = [customer?.first_name, customer?.last_name]
      .filter(Boolean)
      .join(" ")
      .trim()
    const customerEmail = customer?.email || cart.email
    const rut = normalizeRut(customer?.rut)
    const items = Array.isArray(cart.items) ? cart.items : []
    const lineItems = items
      .map((item: any) => {
        const unitAmount = getLineItemUnitAmount(item)
        if (unitAmount <= 0) {
          return null
        }

        const imageUrl =
          typeof item.thumbnail === "string" && item.thumbnail.startsWith("https://")
            ? item.thumbnail
            : undefined

        return {
          quantity: item.quantity || 1,
          price_data: {
            unit_amount: unitAmount,
            product_data: {
              name: item.title || "Curso Calisf",
              ...(imageUrl ? { image_url: imageUrl } : {}),
            },
          },
        }
      })
      .filter(Boolean)

    const payload = {
      amount,
      currency: (cart.currency_code || "CLP").toUpperCase(),
      success_url: safeSuccessUrl,
      cancel_url: safeCancelUrl,
      payment_method_types: ["bank_transfer"],
      customer: {
        ...(fullName ? { name: fullName } : {}),
        ...(customerEmail ? { email: customerEmail } : {}),
        ...(rut
          ? {
              tax_id: {
                type: "cl_rut",
                value: rut,
              },
            }
          : {}),
        metadata: {
          cart_id: cartId,
        },
      },
      ...(lineItems.length ? { line_items: lineItems } : {}),
      metadata: {
        cart_id: cartId,
        provider: "fintoc",
        source: "calisf-landing",
        customer_email: customerEmail,
      },
    }

    const fintocResponse = await fetch(`${FINTOC_API_URL}/checkout_sessions`, {
      method: "POST",
      headers: {
        Authorization: secretKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    const session = await fintocResponse.json().catch(() => null)

    if (!fintocResponse.ok || !session?.redirect_url) {
      res.status(fintocResponse.status || 502).json({
        success: false,
        error:
          session?.message ||
          session?.error ||
          "Fintoc could not create a checkout session",
        details: session,
      })
      return
    }

    res.status(200).json({
      success: true,
      checkout_session_id: session.id,
      redirect_url: session.redirect_url,
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error?.message || "Internal error creating Fintoc checkout session",
    })
  }
}
