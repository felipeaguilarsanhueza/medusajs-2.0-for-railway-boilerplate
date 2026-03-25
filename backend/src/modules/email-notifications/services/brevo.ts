import { Logger, NotificationTypes } from '@medusajs/framework/types'
import { AbstractNotificationProviderService, MedusaError } from '@medusajs/framework/utils'
import { ReactNode } from 'react'
import { generateEmailTemplate } from '../templates'

type InjectedDependencies = {
  logger: Logger
}

interface BrevoServiceConfig {
  api_key: string
  from: string
}

export interface BrevoNotificationServiceOptions {
  api_key: string
  from: string
}

/**
 * Service to handle email notifications using the Brevo API.
 */
export class BrevoNotificationService extends AbstractNotificationProviderService {
  static identifier = "BREVO_NOTIFICATION_SERVICE"
  protected config_: BrevoServiceConfig
  protected logger_: Logger

  constructor({ logger }: InjectedDependencies, options: BrevoNotificationServiceOptions) {
    super()
    this.config_ = {
      api_key: options.api_key,
      from: options.from
    }
    this.logger_ = logger
  }

  async send(
    notification: NotificationTypes.ProviderSendNotificationDTO
  ): Promise<NotificationTypes.ProviderSendNotificationResultsDTO> {
    if (!notification) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, `No notification information provided`)
    }
    if (notification.channel === 'sms') {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, `SMS notification not supported`)
    }

    let emailContent: ReactNode

    try {
      emailContent = generateEmailTemplate(notification.template, notification.data)
    } catch (error) {
      if (error instanceof MedusaError) throw error
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Failed to generate email content for template: ${notification.template}`
      )
    }

    const { render } = await import('@react-email/components')
    const htmlString = await render(emailContent as any, { pretty: true })

    const emailOptions = notification.data.emailOptions as any || {}

    const payload: any = {
      sender: {
        email: notification.from?.trim() ?? this.config_.from
      },
      to: [
        { email: notification.to }
      ],
      subject: emailOptions.subject ?? 'You have a new notification',
      htmlContent: htmlString
    }

    if (Array.isArray(notification.attachments) && notification.attachments.length > 0) {
      payload.attachment = notification.attachments.map((attachment) => ({
        content: attachment.content, // Brevo expects base64 encoded content
        name: attachment.filename
      }))
    }

    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': this.config_.api_key,
          'content-type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(`Brevo API error: ${JSON.stringify(errorData)}`)
      }

      this.logger_.info(
        `Successfully sent "${notification.template}" email to ${notification.to} via Brevo`
      )
      return {}
    } catch (error: any) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Failed to send "${notification.template}" email to ${notification.to} via Brevo: ${error.message}`
      )
    }
  }
}
