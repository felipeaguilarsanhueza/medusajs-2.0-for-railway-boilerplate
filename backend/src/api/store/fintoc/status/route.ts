import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const cartId = req.query?.cart_id as string | undefined

  if (!cartId) {
    res.status(400).json({ success: false, error: "Missing cart_id" })
    return
  }

  try {
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY) as any
    let orders: any[] = []

    try {
      const result = await query.graph({
        entity: "order",
        fields: ["id", "display_id", "cart_id", "status", "payment_status"],
        filters: {
          cart_id: cartId,
        },
      })
      orders = result.data || []
    } catch {
      orders = []
    }

    if (orders?.[0]) {
      res.status(200).json({
        success: true,
        status: "succeeded",
        order: orders[0],
      })
      return
    }

    let completedAt: string | null = null

    try {
      const { data: carts } = await query.graph({
        entity: "cart",
        fields: ["id", "completed_at"],
        filters: {
          id: cartId,
        },
      })
      completedAt = carts?.[0]?.completed_at || null
    } catch {
      try {
        const cartModuleService = req.scope.resolve(Modules.CART) as any
        const cart = await cartModuleService.retrieveCart(cartId)
        completedAt = cart?.completed_at || null
      } catch {
        completedAt = null
      }
    }

    res.status(200).json({
      success: true,
      status: completedAt ? "succeeded" : "pending",
    })
  } catch (error: any) {
    res.status(200).json({
      success: true,
      status: "pending",
      error: error?.message,
    })
  }
}
