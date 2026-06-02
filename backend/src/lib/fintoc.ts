import crypto from "crypto"

export const FINTOC_API_URL =
  process.env.FINTOC_API_URL?.replace(/\/$/, "") || "https://api.fintoc.com/v2"

export function normalizeAmount(amount: unknown): number {
  if (typeof amount === "number") {
    return Math.round(amount)
  }

  if (typeof amount === "string") {
    return Math.round(Number(amount))
  }

  if (amount && typeof amount === "object" && "value" in amount) {
    return normalizeAmount((amount as { value: unknown }).value)
  }

  return 0
}

function firstPositiveAmount(values: unknown[]): number {
  for (const value of values) {
    const amount = normalizeAmount(value)
    if (amount > 0) {
      return amount
    }
  }

  return 0
}

export function getLineItemUnitAmount(item: any): number {
  const quantity = Math.max(Number(item?.quantity || 1), 1)
  const totalAmount = firstPositiveAmount([
    item?.total,
    item?.raw_total,
    item?.subtotal,
    item?.raw_subtotal,
  ])

  return firstPositiveAmount([
    item?.unit_price,
    item?.raw_unit_price,
    totalAmount ? Math.round(totalAmount / quantity) : 0,
  ])
}

export function getCartAmount(cart: any): number {
  const directAmount = firstPositiveAmount([
    cart?.total,
    cart?.raw_total,
    cart?.subtotal,
    cart?.raw_subtotal,
    cart?.item_total,
    cart?.raw_item_total,
  ])

  if (directAmount > 0) {
    return directAmount
  }

  const items = Array.isArray(cart?.items) ? cart.items : []

  return items.reduce((sum: number, item: any) => {
    const quantity = Math.max(Number(item?.quantity || 1), 1)
    const lineAmount = firstPositiveAmount([
      item?.total,
      item?.raw_total,
      item?.subtotal,
      item?.raw_subtotal,
    ])

    if (lineAmount > 0) {
      return sum + lineAmount
    }

    return sum + getLineItemUnitAmount(item) * quantity
  }, 0)
}

export function formatErrorMessage(value: unknown, fallback = "Unknown error"): string {
  if (!value) {
    return fallback
  }

  if (typeof value === "string") {
    return value
  }

  if (Array.isArray(value)) {
    const messages = value
      .map((item) => formatErrorMessage(item, ""))
      .filter(Boolean)

    return messages.length ? messages.join("; ") : fallback
  }

  if (typeof value === "object") {
    const objectValue = value as Record<string, unknown>

    for (const key of ["message", "detail", "description", "title"]) {
      if (typeof objectValue[key] === "string") {
        return objectValue[key] as string
      }
    }

    for (const key of ["error", "errors", "details"]) {
      if (objectValue[key]) {
        const nestedMessage = formatErrorMessage(objectValue[key], "")
        if (nestedMessage) {
          return nestedMessage
        }
      }
    }

    try {
      return JSON.stringify(value)
    } catch {
      return fallback
    }
  }

  return String(value)
}

export function normalizeRut(rut?: string): string | undefined {
  const cleaned = rut?.replace(/[^0-9kK]/g, "").toUpperCase()
  return cleaned || undefined
}

export function getRawBody(rawBody: unknown, parsedBody: unknown): string {
  if (Buffer.isBuffer(rawBody)) {
    return rawBody.toString("utf8")
  }

  if (typeof rawBody === "string") {
    return rawBody
  }

  return JSON.stringify(parsedBody ?? {})
}

export function verifyFintocSignature({
  rawBody,
  signatureHeader,
  secret,
  toleranceSeconds = 300,
}: {
  rawBody: string
  signatureHeader?: string
  secret: string
  toleranceSeconds?: number
}): { valid: true } | { valid: false; reason: string } {
  if (!signatureHeader) {
    return { valid: false, reason: "Missing Fintoc-Signature header" }
  }

  const values = signatureHeader.split(",").reduce<Record<string, string>>(
    (acc, part) => {
      const [key, ...rest] = part.trim().split("=")
      if (key && rest.length) {
        acc[key] = rest.join("=")
      }
      return acc
    },
    {}
  )

  const timestamp = Number(values.t)
  const incomingSignature = values.v1

  if (!timestamp || !incomingSignature) {
    return { valid: false, reason: "Malformed Fintoc-Signature header" }
  }

  const now = Math.floor(Date.now() / 1000)
  if (Math.abs(now - timestamp) > toleranceSeconds) {
    return { valid: false, reason: "Fintoc webhook timestamp is outside tolerance" }
  }

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`, "utf8")
    .digest("hex")

  if (expectedSignature.length !== incomingSignature.length) {
    return { valid: false, reason: "Fintoc webhook signature length mismatch" }
  }

  const isValid = crypto.timingSafeEqual(
    Buffer.from(expectedSignature, "utf8"),
    Buffer.from(incomingSignature, "utf8")
  )

  return isValid
    ? { valid: true }
    : { valid: false, reason: "Invalid Fintoc webhook signature" }
}
