import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  try {
    const { paymentSessionId, paymentData } = req.body as any;

    if (!paymentSessionId || !paymentData) {
      res.status(400).json({ success: false, error: "Missing required fields" });
      return;
    }

    let mpService;
    try {
      mpService = req.scope.resolve("mercadopagoProviderService");
    } catch(e) {
      res.status(500).json({ success: false, error: "MP Provider not found in DI container" });
      return;
    }

    const input = {
      amount: paymentData?.transactionAmount || paymentData?.transaction_amount || 0,
      data: paymentData,
      context: {}
    };

    const result = await mpService.authorizePayment(input);

    res.status(200).json({ success: true, result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || "Internal error" });
  }
}
