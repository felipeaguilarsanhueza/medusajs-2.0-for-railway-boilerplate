import { SubscriberArgs, SubscriberConfig } from '@medusajs/medusa'
import { IOrderModuleService, Logger } from '@medusajs/framework/types'
import { Modules } from '@medusajs/framework/utils'

export default async function moodleEnrollmentHandler({
  event: { data },
  container,
}: SubscriberArgs<any>) {
  const logger = container.resolve<Logger>('logger')
  const orderModuleService: IOrderModuleService = container.resolve(Modules.ORDER)
  
  const MOODLE_URL = process.env.MOODLE_URL
  const MOODLE_TOKEN = process.env.MOODLE_TOKEN

  if (!MOODLE_URL || !MOODLE_TOKEN) {
    logger.warn('⚠️ Moodle Integration: MOODLE_URL o MOODLE_TOKEN no están configurados en Railway (.env). No se ejecutará la matriculación automática.')
    return
  }

  // 1. Helper para hacer llamadas estándar a la API REST de Moodle
  const moodleCall = async (wsfunction: string, params: URLSearchParams) => {
    params.append('wstoken', MOODLE_TOKEN)
    params.append('wsfunction', wsfunction)
    params.append('moodlewsrestformat', 'json')

    const response = await fetch(MOODLE_URL, {
      method: 'POST',
      body: params,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
    
    let json
    try {
      json = await response.json()
    } catch(e) {
      throw new Error(`Error parseando JSON de Moodle en funcion [${wsfunction}]`)
    }

    if (json.exception) {
      throw new Error(`Moodle API Error [${wsfunction}]: ${json.message}`)
    }
    // Moodle returns arrays of exceptions or faults as standard returns sometimes
    if (Array.isArray(json) && json.length > 0 && json[0]?.exception) {
        throw new Error(`Moodle API Error [${wsfunction}]: ${json[0].message}`)
    }
    
    return json
  }

  try {
    const order = await orderModuleService.retrieveOrder(data.id, { relations: ['items', 'shipping_address'] })
    const userEmail = order.email
    const userFirstName = order.shipping_address?.first_name || 'Estudiante'
    const userLastName = order.shipping_address?.last_name || 'Calisf'

    logger.info(`🎓 Iniciando matriculación en Moodle para orden ${order.display_id} (${userEmail})`)

    // 2. Verificar si el usuario ya existe en Moodle (búsqueda estricta por email)
    const userParams = new URLSearchParams()
    userParams.append('field', 'email')
    userParams.append('values[0]', userEmail)
    let existingUsers: any[] = []
    
    try {
        existingUsers = await moodleCall('core_user_get_users_by_field', userParams)
    } catch(err) {
        logger.error(`Moodle Get Users Error: ${err}`)
    }
    
    let moodleUserId: number

    // Existing array, not empty and ID > 0
    if (existingUsers && Array.isArray(existingUsers) && existingUsers.length > 0 && existingUsers[0].id) {
      moodleUserId = existingUsers[0].id
      logger.info(`✓ Usuario de Moodle encontrado exitosamente con ID interno: ${moodleUserId}`)
    } else {
      // 3. Crear el usuario en Moodle si no existe (con Autogeneración de clave)
      logger.info(`+ Creando nuevo usuario de Moodle para: ${userEmail}`)
      const createParams = new URLSearchParams()
      createParams.append('users[0][username]', userEmail.toLowerCase())
      // IMPORTANTE: Al ser = '1', Moodle mandará solito el correo de: Bienvenido, dale clic aquí para establecer tu clave
      createParams.append('users[0][createpassword]', '1') 
      createParams.append('users[0][email]', userEmail)
      createParams.append('users[0][firstname]', userFirstName)
      createParams.append('users[0][lastname]', userLastName)
      
      const newUsers = await moodleCall('core_user_create_users', createParams)
      
      if (!newUsers || !newUsers[0] || !newUsers[0].id) {
          throw new Error('Moodle API no retornó ID de usuario después de la creación.')
      }

      moodleUserId = newUsers[0].id
      logger.info(`✓ Usuario de Moodle creado con nuevo ID: ${moodleUserId}`)
    }

    // 4. Enrollar usuario por cada producto del carrito usando su SKU (idnumber en moodle)
    for (const item of order.items) {
      const courseSku = item.variant_sku
      if (!courseSku) {
        logger.info(`Skipping Moodle para ítem sin SKU: ${item.title}`)
        continue
      }

      // Buscar si este SKU/idnumber efectivamente existe en Moodle como curso
      const courseParams = new URLSearchParams()
      courseParams.append('field', 'idnumber')
      courseParams.append('value', courseSku)
      
      const coursesResp = await moodleCall('core_course_get_courses_by_field', courseParams)
      
      if (!coursesResp || !coursesResp.courses || coursesResp.courses.length === 0) {
        logger.warn(`⚠ No se encontró un curso en Moodle con Número ID coincidente con el SKU de Medusa: ${courseSku}`)
        continue
      }
      
      const moodleCourseId = coursesResp.courses[0].id
      
      // El Rol "5" de Moodle corresponde a "Estudiante". Rol "3" es profesor. Usaremos "5".
      logger.info(`+ Matriculando al usuario ${moodleUserId} en el curso ID Moodle ${moodleCourseId} (SKU: ${courseSku})`)
      const enrollParams = new URLSearchParams()
      enrollParams.append('enrolments[0][roleid]', '5') 
      enrollParams.append('enrolments[0][userid]', moodleUserId.toString())
      enrollParams.append('enrolments[0][courseid]', moodleCourseId.toString())
      
      await moodleCall('enrol_manual_enrol_users', enrollParams)
      
      logger.info(`✅ Matriculación exitosa y completada! Usuario (${moodleUserId}) enrolado en el curso: SKU [${courseSku}]`)
    }

  } catch (error: any) {
    logger.error(`❌ Error general en la automatización Moodle para la orden ${data.id}: ${error.message}`)
  }
}

export const config: SubscriberConfig = {
  event: 'order.placed', // Se dispara exacto en el momento del "Pago exitoso" de MercadoPago
}
