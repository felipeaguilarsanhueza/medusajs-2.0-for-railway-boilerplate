import { AbstractPaymentProvider } from "@medusajs/framework/utils"
// @ts-ignore
import { MercadoPagoConfig, Payment } from 'mercadopago';

type Options = {
  access_token: string;
  webhook_secret?: string;
}

export default class MercadoPagoProviderService extends AbstractPaymentProvider<Options> {
  static identifier = "mercadopago"
  protected config_: Options;
  protected mpConfig: MercadoPagoConfig;
  protected paymentClient: Payment;

  constructor(container: any, options: Options) {
    super(container, options)
    this.config_ = options

    this.mpConfig = new MercadoPagoConfig({
      accessToken: this.config_.access_token,
      options: { timeout: 5000 }
    });
    this.paymentClient = new Payment(this.mpConfig);
  }

  async initiatePayment(input: any): Promise<any> {
    try {
      const { amount, currency_code, context } = input;
      return {
        data: {
          id: `${context?.resource_id}_${Date.now()}`,
          amount,
          currency: currency_code,
          status: 'pending',
        }
      }
    } catch (e) {
      return this.buildError("An error occurred in initiatePayment", e)
    }
  }

  async authorizePayment(input: any): Promise<any> {
    try {
      const { amount, context } = input;
      const paymentDataSession = input.data || {};
      const { token, payment_method_id, issuer_id, installments, payer } = paymentDataSession as any;

      if (!token && !payment_method_id) {
         return {
           data: paymentDataSession,
           status: "pending"
         }
      }

      const paymentDataParams = {
        transaction_amount: Number(amount),
        description: `Medusa Order`,
        payment_method_id: payment_method_id,
        token: token,
        installments: Number(installments || 1),
        payer: {
          email: payer?.email || context?.email,
          identification: payer?.identification,
        },
      };

      const payment = await this.paymentClient.create({ body: paymentDataParams });
      const status = this.getMedusaStatus(payment.status);

      return {
        data: {
          ...paymentDataSession,
          mp_payment_id: payment.id,
          status: payment.status,
          mp_status_detail: payment.status_detail
        },
        status
      }
    } catch (e) {
      return this.buildError("An error occurred in authorizePayment", e)
    }
  }

  async cancelPayment(input: any): Promise<any> {
    try {
      const paymentDataSession = input.data || input;
      const mpPaymentId = paymentDataSession.mp_payment_id;
      if (mpPaymentId) {
        await this.paymentClient.cancel({ id: mpPaymentId });
      }
      return {
        ...paymentDataSession,
        status: "canceled"
      }
    } catch (e) {
      return this.buildError("An error occurred in cancelPayment", e)
    }
  }

  async capturePayment(input: any): Promise<any> {
    try {
      const paymentDataSession = input.data || input;
      const mpPaymentId = paymentDataSession.mp_payment_id;
      if (mpPaymentId) {
         const payment = await this.paymentClient.capture({ id: mpPaymentId });
         return {
           ...paymentDataSession,
           status: payment.status
         }
      }
      return { ...paymentDataSession, status: "captured" }
    } catch (e) {
      return this.buildError("An error occurred in capturePayment", e)
    }
  }

  async deletePayment(input: any): Promise<any> {
    return this.cancelPayment(input)
  }

  async refundPayment(input: any): Promise<any> {
    try {
      const paymentDataSession = input.data || input;
      const mpPaymentId = paymentDataSession.mp_payment_id;
      if (!mpPaymentId) {
         return this.buildError("No MercadoPago Payment ID found correctly.", Error("Missing ID"));
      }
      // Note: we can use Refund API from MercadoPago here if needed
      return {
        ...paymentDataSession,
        status: "refunded"
      }
    } catch (e) {
      return this.buildError("An error occurred in refundPayment", e)
    }
  }

  async getPaymentStatus(input: any): Promise<any> {
    const paymentDataSession = input.data || input;
    const mpPaymentId = paymentDataSession.mp_payment_id;
    if (!mpPaymentId) return { status: 'pending' };

    try {
      const payment = await this.paymentClient.get({ id: mpPaymentId });
      return { status: this.getMedusaStatus(payment.status) };
    } catch (e) {
      return { status: "error" };
    }
  }

  async retrievePayment(input: any): Promise<any> {
    try {
      const paymentDataSession = input.data || input;
      const mpPaymentId = paymentDataSession.mp_payment_id;
      if (!mpPaymentId) return paymentDataSession;

      const payment = await this.paymentClient.get({ id: mpPaymentId });
      return {
          ...paymentDataSession,
          ...payment
      }
    } catch (e) {
        return this.buildError("An error occurred in retrievePayment", e)
    }
  }

  async updatePayment(input: any): Promise<any> {
    try {
      return {
        ...input.data,
        ...input.context,
        id: input.data?.id,
      }
    } catch (e) {
      return this.buildError("An error occurred in updatePayment", e)
    }
  }

  async getWebhookActionAndData(payload: any): Promise<any> {
    try {
      const { data } = payload;
      
      const body = data as any;
      if (body.type === "payment" && body.data?.id) {
         const payment = await this.paymentClient.get({ id: body.data.id });
         
         const status = this.getMedusaStatus(payment.status);
         let action = "not_supported";
         
         if (status === "captured") {
            action = "captured";
         } else if (status === "authorized") {
            action = "authorized";
         } else if (status === "error" || status === "canceled") {
            action = "failed";
         }

         return {
           action,
           data: {
             session_id: payment.external_reference || payment.id,
             amount: payment.transaction_amount,
           }
         }
      }

      return {
        action: "not_supported"
      }
    } catch (e: any) {
      return {
        action: "failed",
        data: {
          error: e.message
        }
      }
    }
  }

  private getMedusaStatus(mpStatus: string | undefined): string {
    switch (mpStatus) {
      case "approved":
        return "captured";
      case "in_process":
      case "pending":
      case "authorized":
        return "authorized";
      case "cancelled":
      case "rejected":
        return "canceled";
      case "refunded":
      case "charged_back":
         return "error"; 
      default:
        return "pending";
    }
  }

  private buildError(message: string, e: any): any {
    return {
      error: message,
      code: e?.code || "unknown",
      detail: e?.message || e?.detail || "Unknown error occurred",
    }
  }
}
