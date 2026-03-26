import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
// @ts-ignore
import { MercadoPagoConfig, Payment } from 'mercadopago';

export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  try {
    const { paymentData } = req.body as any;

    if (!paymentData) {
      res.status(400).json({ success: false, error: "Missing paymentData" });
      return;
    }

    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!accessToken) {
      res.status(500).json({ success: false, error: "MERCADOPAGO_ACCESS_TOKEN not configured" });
      return;
    }

    // Initialize MercadoPago SDK directly (no DI container needed)
    const mpConfig = new MercadoPagoConfig({
      accessToken,
      options: { timeout: 5000 }
    });
    const paymentClient = new Payment(mpConfig);

    // Create payment with MercadoPago
    const mpResult = await paymentClient.create({
      body: {
        transaction_amount: Number(paymentData.transaction_amount || paymentData.transactionAmount),
        description: paymentData.description || "Compra en Cali SF",
        payment_method_id: paymentData.payment_method_id || paymentData.paymentMethodId,
        token: paymentData.token,
        installments: Number(paymentData.installments || 1),
        payer: {
          email: paymentData.payer?.email,
          identification: paymentData.payer?.identification,
        },
      }
    });

    console.log("MercadoPago result:", mpResult.id, mpResult.status, mpResult.status_detail);

    if (mpResult.status === 'approved' || mpResult.status === 'in_process' || mpResult.status === 'pending') {
      res.status(200).json({
        success: true,
        mp_payment_id: mpResult.id,
        status: mpResult.status,
        status_detail: mpResult.status_detail,
      });
    } else {
      res.status(400).json({
        success: false,
        error: `Pago ${mpResult.status}: ${mpResult.status_detail}`,
        mp_payment_id: mpResult.id,
        status: mpResult.status,
      });
    }
  } catch (error: any) {
    console.error("MercadoPago payment error:", error);
    res.status(500).json({
      success: false,
      error: error?.message || "Error interno al procesar el pago",
    });
  }
}
