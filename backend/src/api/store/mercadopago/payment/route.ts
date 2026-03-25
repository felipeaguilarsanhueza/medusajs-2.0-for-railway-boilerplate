import { MedusaRequest, MedusaResponse } from "@medusajs/framework";

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
      mpService = req.scope.resolve("payment_mercadopago");
    } catch(e) {
      try {
        mpService = req.scope.resolve("pp_mercadopago");
      } catch(e2) {
        try {
           mpService = req.scope.resolve("mercadopago");
        } catch(e3) {
           res.status(500).json({ success: false, error: "MP Provider not found in DI container" });
           return;
        }
      }
    }

    const input = {
      amount: paymentData?.transactionAmount || paymentData?.transaction_amount || 0,
      data: paymentData,
      context: {}
    };

    const result = await mpService.authorizePayment(input);

    res.status(200).json({ success: true, result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function OPTIONS(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  res.sendStatus(200);
}
