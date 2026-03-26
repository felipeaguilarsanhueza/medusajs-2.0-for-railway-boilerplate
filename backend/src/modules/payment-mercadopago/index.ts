import { ModuleProviderExports } from '@medusajs/framework/types'
import MercadopagoProviderService from './service'

const services = [MercadopagoProviderService]

const providerExport: ModuleProviderExports = {
  services,
}

export default providerExport
