import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import MercadoPagoProviderService from "./service"

const services = [MercadoPagoProviderService]

export default ModuleProvider(Modules.PAYMENT, {
  services,
})
