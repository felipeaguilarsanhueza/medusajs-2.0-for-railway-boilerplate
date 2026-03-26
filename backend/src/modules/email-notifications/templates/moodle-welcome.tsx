import { Text, Section, Hr, Link } from '@react-email/components'
import * as React from 'react'
import { Base } from './base'

export const MOODLE_WELCOME = 'moodle-welcome'

const BRAND_COLOR = '#6B2D8B'
const ACCENT_COLOR = '#4CAF50'

interface MoodleWelcomePreviewProps {
  userFirstName: string
  userEmail: string
  tempPassword?: string
}

export interface MoodleWelcomeTemplateProps {
  userFirstName: string
  userEmail: string
  tempPassword?: string
  preview?: string
}

export const isMoodleWelcomeTemplateData = (data: any): data is MoodleWelcomeTemplateProps =>
  typeof data.userEmail === 'string' && typeof data.userFirstName === 'string'

export const MoodleWelcomeTemplate: React.FC<MoodleWelcomeTemplateProps> & {
  PreviewProps: MoodleWelcomePreviewProps
} = ({ userFirstName, userEmail, tempPassword, preview = 'Tus accesos para el Aula Virtual' }) => {
  return (
    <Base preview={preview}>
      <Section>
        {/* Welcome Header */}
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <Text style={{
            fontSize: '26px',
            fontWeight: 'bold',
            color: BRAND_COLOR,
            margin: '0 0 8px',
            lineHeight: '1.3',
          }}>
            ¡Bienvenido(a) al Aula Virtual!
          </Text>
        </div>

        {/* Greeting */}
        <Text style={{
          fontSize: '16px',
          color: '#333',
          margin: '0 0 16px',
          lineHeight: '1.6',
        }}>
          Hola {userFirstName},
        </Text>

        <Text style={{
          fontSize: '15px',
          color: '#555',
          margin: '0 0 24px',
          lineHeight: '1.6',
        }}>
          Tu inscripción ha sido procesada exitosamente. Ya tienes acceso a tu aula virtual donde encontrarás todos los materiales y recursos de los cursos que adquiriste.
        </Text>

        {/* Credentials Box */}
        {tempPassword ? (
          <div style={{
            backgroundColor: '#f8f6fb',
            borderRadius: '12px',
            padding: '24px',
            marginBottom: '32px',
            border: '1px solid #ece8f0',
            textAlign: 'center'
          }}>
            <Text style={{
              fontSize: '14px',
              fontWeight: 'bold',
              color: BRAND_COLOR,
              margin: '0 0 16px',
              textTransform: 'uppercase',
              letterSpacing: '1px',
            }}>
              Tus Datos de Acceso
            </Text>
            
            <div style={{ marginBottom: '16px' }}>
              <Text style={{ fontSize: '13px', color: '#777', margin: '0 0 4px' }}>Usuario / Email:</Text>
              <Text style={{ fontSize: '16px', fontWeight: 'bold', color: '#333', margin: '0' }}>{userEmail}</Text>
            </div>
            
            <div>
              <Text style={{ fontSize: '13px', color: '#777', margin: '0 0 4px' }}>Contraseña Temporal:</Text>
              <Text style={{ 
                fontSize: '18px', 
                fontWeight: 'bold', 
                color: BRAND_COLOR, 
                margin: '0',
                backgroundColor: '#fff',
                padding: '8px 16px',
                borderRadius: '6px',
                display: 'inline-block',
                border: '1px dashed #ccc'
              }}>
                {tempPassword}
              </Text>
            </div>

            <Text style={{
              fontSize: '13px',
              color: '#666',
              margin: '16px 0 0',
              fontStyle: 'italic'
            }}>
              * Se te pedirá que cambies esta contraseña por una nueva cuando ingreses por primera vez.
            </Text>
          </div>
        ) : (
          <div style={{
            backgroundColor: '#e8f5e9',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '32px',
            border: '1px solid #c8e6c9',
            textAlign: 'center'
          }}>
            <Text style={{
              fontSize: '15px',
              color: '#2e7d32',
              margin: '0',
              fontWeight: '500'
            }}>
              Tu cuenta ya estaba creada previamente. Puedes ingresar con tu correo ({userEmail}) y la contraseña que ya tenías configurada.
            </Text>
          </div>
        )}

        {/* Call to action */}
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <Link
            href="https://aula.calisf.cl"
            style={{
              display: 'inline-block',
              backgroundColor: ACCENT_COLOR,
              color: '#ffffff',
              padding: '16px 36px',
              borderRadius: '10px',
              fontWeight: 'bold',
              fontSize: '15px',
              textDecoration: 'none',
              boxShadow: '0 4px 6px rgba(76, 175, 80, 0.2)'
            }}
          >
            Ir al Aula Virtual
          </Link>
          <Text style={{ fontSize: '12px', color: '#999', marginTop: '16px' }}>
            Si el botón no funciona, copia y pega este enlace: https://aula.calisf.cl
          </Text>
        </div>
        
        <Hr style={{ borderColor: '#eee', margin: '30px 0' }} />
        
        <Text style={{
          fontSize: '14px',
          color: '#555',
          margin: '0',
          lineHeight: '1.6',
          textAlign: 'center'
        }}>
          Si tienes problemas para ingresar o no recuerdas tu contraseña, puedes usar la opción "Olvidó su contraseña" en la página de inicio de sesión o contactarnos a soporte.
        </Text>

      </Section>
    </Base>
  )
}

MoodleWelcomeTemplate.PreviewProps = {
  userFirstName: 'Felipe',
  userEmail: 'contacto@calisf.cl',
  tempPassword: 'Calisf_2026_XyZ!'
} as MoodleWelcomePreviewProps

export default MoodleWelcomeTemplate
