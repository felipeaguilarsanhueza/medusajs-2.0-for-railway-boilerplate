import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import MercadopagoProviderService from "./service"

const services = [MercadopagoProviderService]

export default ModuleProvider(Modules.PAYMENT, {
  services,
})
