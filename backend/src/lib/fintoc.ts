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
