import { ModuleProviderExports } from '@medusajs/framework/types'
import { ResendNotificationService } from './services/resend'
import { BrevoNotificationService } from './services/brevo'

const services = [ResendNotificationService, BrevoNotificationService]

const providerExport: ModuleProviderExports = {
  services,
}

export default providerExport
