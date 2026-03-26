import { Html, Body, Container, Preview, Head, Img, Section, Text, Hr, Row, Column, Link } from '@react-email/components'
import * as React from 'react'

interface BaseProps {
  preview?: string
  children: React.ReactNode
}

const LOGO_URL = 'https://calisf.cl/logo.png'
const BRAND_COLOR = '#6B2D8B' // Purple from logo
const ACCENT_COLOR = '#4CAF50' // Green from logo
const SITE_URL = 'https://calisf.cl'

export const Base: React.FC<BaseProps> = ({ preview, children }) => {
  return (
    <Html>
      <Head>
        <meta charSet="UTF-8" />
      </Head>
      <Preview>{preview}</Preview>
      <Body style={{
        backgroundColor: '#f4f4f7',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        margin: '0',
        padding: '0',
      }}>
        <Container style={{
          maxWidth: '600px',
          margin: '0 auto',
          padding: '0',
        }}>
          {/* Header with logo */}
          <Section style={{
            backgroundColor: '#ffffff',
            padding: '30px 40px',
            borderRadius: '12px 12px 0 0',
            textAlign: 'center',
            borderBottom: '2px solid #f4f4f7'
          }}>
            <Img
              src={LOGO_URL}
              alt="Calisf"
              width="200"
              style={{
                margin: '0 auto',
                display: 'block',
              }}
            />
          </Section>

          {/* Main content */}
          <Section style={{
            backgroundColor: '#ffffff',
            padding: '40px',
          }}>
            {children}
          </Section>

          {/* Footer */}
          <Section style={{
            backgroundColor: '#2d2d3f',
            padding: '30px 40px',
            borderRadius: '0 0 12px 12px',
            textAlign: 'center',
          }}>
            <Text style={{
              color: '#a0a0b0',
              fontSize: '13px',
              margin: '0 0 8px',
              lineHeight: '1.5',
            }}>
              Calisf — Formación y Asesoría en Inocuidad Alimentaria
            </Text>
            <Text style={{
              color: '#a0a0b0',
              fontSize: '12px',
              margin: '0 0 8px',
              lineHeight: '1.5',
            }}>
              Santiago, Chile
            </Text>
            <Text style={{
              color: '#a0a0b0',
              fontSize: '12px',
              margin: '0 0 16px',
              lineHeight: '1.5',
            }}>
              <Link href="mailto:contacto@calisf.cl" style={{ color: '#a0a0b0', textDecoration: 'underline' }}>
                contacto@calisf.cl
              </Link>
              {' | '}
              <Link href={SITE_URL} style={{ color: '#a0a0b0', textDecoration: 'underline' }}>
                www.calisf.cl
              </Link>
            </Text>
            <Hr style={{ borderColor: '#3d3d50', margin: '16px 0' }} />
            <Text style={{
              color: '#707080',
              fontSize: '11px',
              margin: '0',
              lineHeight: '1.5',
            }}>
              © {new Date().getFullYear()} Calisf. Todos los derechos reservados.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
