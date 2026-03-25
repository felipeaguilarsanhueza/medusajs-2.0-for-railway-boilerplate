import {
  AbstractPaymentProvider,
  PaymentProviderError,
  PaymentProviderSessionResponse,
  CreatePaymentProviderSession,
  UpdatePaymentProviderSession,
  ProviderWebhookPayload,
  WebhookActionResult,
  PaymentSessionStatus,
} from "@medusajs/framework/utils"
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

  async initiatePayment(
    input: CreatePaymentProviderSession
  ): Promise<PaymentProviderError | PaymentProviderSessionResponse> {
    try {
      // In a headless flow, you might return the transaction data 
      // needed by the frontend, such as the total amount.
      // MercadoPago checkout Pro uses preferences. Here we prepare a transparent checkout session.
      return {
        ...input,
        data: {
          id: `${input.context.resource_id}_${Date.now()}`,
          amount: input.amount,
          currency: input.currency_code,
          status: 'pending',
        }
      }
    } catch (e) {
      return this.buildError("An error occurred in initiatePayment", e)
    }
  }

  async authorizePayment(
    paymentSessionData: Record<string, unknown>,
    context: Record<string, unknown>
  ): Promise<PaymentProviderError | {
    data: PaymentProviderSessionResponse["data"]
    status: PaymentSessionStatus
  }> {
    try {
      const { amount, currency_code } = context as any;
      const { token, payment_method_id, issuer_id, installments, payer } = paymentSessionData as any;

      // If missing basic MP fields, we might just be initializing or authorizing via another method.
      // Mercado Pago creates payments immediately in most cases.
      if (!token && !payment_method_id) {
         return {
           data: paymentSessionData,
           status: "pending" as PaymentSessionStatus
         }
      }

      const paymentData = {
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

      const payment = await this.paymentClient.create({ body: paymentData });

      const status = this.getMedusaStatus(payment.status);

      return {
        data: {
          ...paymentSessionData,
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

  async cancelPayment(
    paymentSessionData: Record<string, unknown>
  ): Promise<PaymentProviderError | PaymentProviderSessionResponse["data"]> {
    try {
      const mpPaymentId = paymentSessionData.mp_payment_id as string;
      if (mpPaymentId) {
        await this.paymentClient.cancel({ id: mpPaymentId });
      }
      return {
        ...paymentSessionData,
        status: "cancelled"
      }
    } catch (e) {
      return this.buildError("An error occurred in cancelPayment", e)
    }
  }

  async capturePayment(
    paymentSessionData: Record<string, unknown>
  ): Promise<PaymentProviderError | PaymentProviderSessionResponse["data"]> {
    try {
      // With MercadoPago, capture is typically done automatically upon authorization for most payment methods
      // If manual capture is enabled, you use the Capture API.
      const mpPaymentId = paymentSessionData.mp_payment_id as string;
      if (mpPaymentId) {
         const payment = await this.paymentClient.capture({ id: mpPaymentId });
         return {
           ...paymentSessionData,
           status: payment.status
         }
      }
      return { ...paymentSessionData, status: "captured" }
    } catch (e) {
      return this.buildError("An error occurred in capturePayment", e)
    }
  }

  async deletePayment(
    paymentSessionData: Record<string, unknown>
  ): Promise<PaymentProviderError | PaymentProviderSessionResponse["data"]> {
    return this.cancelPayment(paymentSessionData)
  }

  async refundPayment(
    paymentSessionData: Record<string, unknown>,
    refundAmount: number
  ): Promise<PaymentProviderError | PaymentProviderSessionResponse["data"]> {
    try {
      const mpPaymentId = paymentSessionData.mp_payment_id as string | number;
      if (!mpPaymentId) {
         return this.buildError("No MercadoPago Payment ID found correctly.", new Error("Missing ID"));
      }

      // We'd typically use the Refunds API or cancel it entirely
       return {
         ...paymentSessionData,
         status: "refunded"
       }
    } catch (e) {
      return this.buildError("An error occurred in refundPayment", e)
    }
  }

  async getPaymentStatus(
    paymentSessionData: Record<string, unknown>
  ): Promise<PaymentSessionStatus> {
    const mpPaymentId = paymentSessionData.mp_payment_id as string | number;
    if (!mpPaymentId) return "pending" as PaymentSessionStatus;

    try {
      const payment = await this.paymentClient.get({ id: mpPaymentId });
      return this.getMedusaStatus(payment.status);
    } catch (e) {
      return "error" as PaymentSessionStatus;
    }
  }

  async updatePayment(
    input: UpdatePaymentProviderSession
  ): Promise<PaymentProviderError | PaymentProviderSessionResponse> {
    try {
      return {
        ...input.data,
        ...input.context,
        id: input.data.id,
      } as PaymentProviderSessionResponse
    } catch (e) {
      return this.buildError("An error occurred in updatePayment", e)
    }
  }

  async getWebhookActionAndData(
    payload: ProviderWebhookPayload
  ): Promise<WebhookActionResult> {
    try {
      const { data, rawData, headers } = payload;
      
      const body = data as any;
      if (body.type === "payment" && body.data?.id) {
         const payment = await this.paymentClient.get({ id: body.data.id });
         
         const status = this.getMedusaStatus(payment.status);
         let action: WebhookActionResult["action"] = "not_supported";
         
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
             mp_payment_id: payment.id
           }
         }
      }

      return {
        action: "not_supported"
      }
    } catch (e) {
      return {
        action: "failed",
        data: {
          error: e.message
        }
      }
    }
  }

  private getMedusaStatus(mpStatus: string | undefined): PaymentSessionStatus {
    switch (mpStatus) {
      case "approved":
        return "captured" as PaymentSessionStatus;
      case "in_process":
      case "pending":
      case "authorized":
        return "authorized" as PaymentSessionStatus;
      case "cancelled":
      case "rejected":
        return "canceled" as PaymentSessionStatus;
      case "refunded":
      case "charged_back":
         return "error" as PaymentSessionStatus; // Or mapped to something else based on medusa flow
      default:
        return "pending" as PaymentSessionStatus;
    }
  }

  private buildError(
    message: string,
    e: any
  ): PaymentProviderError {
    return {
      error: message,
      code: e.code || "unknown",
      detail: e.message || e.detail,
    }
  }
}
