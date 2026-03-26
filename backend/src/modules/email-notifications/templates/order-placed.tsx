import { Text, Section, Hr, Img, Link, Row, Column } from '@react-email/components'
import * as React from 'react'
import { Base } from './base'
import { OrderDTO, OrderAddressDTO } from '@medusajs/framework/types'

export const ORDER_PLACED = 'order-placed'

const BRAND_COLOR = '#6B2D8B'
const ACCENT_COLOR = '#4CAF50'

function formatCLP(amount: number) {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
  }).format(amount)
}

interface OrderPlacedPreviewProps {
  order: OrderDTO & { display_id: string; summary: { raw_current_order_total: { value: number } } }
  shippingAddress: OrderAddressDTO
}

export interface OrderPlacedTemplateProps {
  order: OrderDTO & { display_id: string; summary: { raw_current_order_total: { value: number } } }
  shippingAddress: OrderAddressDTO
  preview?: string
}

export const isOrderPlacedTemplateData = (data: any): data is OrderPlacedTemplateProps =>
  typeof data.order === 'object' && typeof data.shippingAddress === 'object'

export const OrderPlacedTemplate: React.FC<OrderPlacedTemplateProps> & {
  PreviewProps: OrderPlacedPreviewProps
} = ({ order, shippingAddress, preview = '¡Tu pedido ha sido confirmado!' }) => {
  const total = order.summary?.raw_current_order_total?.value || 0
  const orderDate = new Date(order.created_at).toLocaleDateString('es-CL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <Base preview={preview}>
      <Section>
        {/* Success icon + title */}
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: '#e8f5e9',
            margin: '0 auto 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            lineHeight: '64px',
            textAlign: 'center',
          }}>
            <Text style={{
              fontSize: '32px',
              margin: '0',
              lineHeight: '64px',
            }}>✓</Text>
          </div>
          <Text style={{
            fontSize: '26px',
            fontWeight: 'bold',
            color: BRAND_COLOR,
            margin: '0 0 8px',
            lineHeight: '1.3',
          }}>
            ¡Pedido Confirmado!
          </Text>
          <Text style={{
            fontSize: '14px',
            color: '#888',
            margin: '0',
          }}>
            Pedido #{order.display_id}
          </Text>
        </div>

        {/* Greeting */}
        <Text style={{
          fontSize: '16px',
          color: '#333',
          margin: '0 0 8px',
          lineHeight: '1.6',
        }}>
          Hola {shippingAddress.first_name},
        </Text>

        <Text style={{
          fontSize: '15px',
          color: '#555',
          margin: '0 0 30px',
          lineHeight: '1.6',
        }}>
          ¡Gracias por tu compra! Tu pedido ha sido procesado exitosamente.
          A continuación encontrarás los detalles de tu compra.
        </Text>

        {/* Order summary card */}
        <div style={{
          backgroundColor: '#f8f6fb',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px',
          border: '1px solid #ece8f0',
        }}>
          <Text style={{
            fontSize: '14px',
            fontWeight: 'bold',
            color: BRAND_COLOR,
            textTransform: 'uppercase',
            letterSpacing: '1px',
            margin: '0 0 16px',
          }}>
            Resumen del Pedido
          </Text>

          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td style={{ padding: '6px 0', color: '#777', fontSize: '14px' }}>Nº de Pedido</td>
                <td style={{ padding: '6px 0', color: '#333', fontSize: '14px', fontWeight: 'bold', textAlign: 'right' as const }}>
                  #{order.display_id}
                </td>
              </tr>
              <tr>
                <td style={{ padding: '6px 0', color: '#777', fontSize: '14px' }}>Fecha</td>
                <td style={{ padding: '6px 0', color: '#333', fontSize: '14px', textAlign: 'right' as const }}>
                  {orderDate}
                </td>
              </tr>
              <tr>
                <td style={{ padding: '6px 0', color: '#777', fontSize: '14px' }}>Estado</td>
                <td style={{ padding: '6px 0', textAlign: 'right' as const }}>
                  <span style={{
                    backgroundColor: '#e8f5e9',
                    color: ACCENT_COLOR,
                    padding: '3px 10px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                  }}>
                    Pagado
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Items */}
        <Text style={{
          fontSize: '14px',
          fontWeight: 'bold',
          color: BRAND_COLOR,
          textTransform: 'uppercase',
          letterSpacing: '1px',
          margin: '0 0 16px',
        }}>
          Detalle de Productos
        </Text>

        {order.items.map((item) => (
          <div key={item.id} style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px',
            marginBottom: '8px',
            backgroundColor: '#fafafa',
            borderRadius: '8px',
            border: '1px solid #f0f0f0',
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                <tr>
                  <td style={{ verticalAlign: 'top', width: '70%' }}>
                    <Text style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#333',
                      margin: '0 0 4px',
                    }}>
                      {item.product_title || item.title}
                    </Text>
                    {item.variant_title && item.variant_title !== 'Default' && (
                      <Text style={{
                        fontSize: '12px',
                        color: '#999',
                        margin: '0',
                      }}>
                        {item.variant_title}
                      </Text>
                    )}
                    <Text style={{
                      fontSize: '12px',
                      color: '#999',
                      margin: '4px 0 0',
                    }}>
                      Cant: {item.quantity}
                    </Text>
                  </td>
                  <td style={{ verticalAlign: 'top', textAlign: 'right' as const }}>
                    <Text style={{
                      fontSize: '15px',
                      fontWeight: 'bold',
                      color: BRAND_COLOR,
                      margin: '0',
                    }}>
                      {formatCLP(item.unit_price * item.quantity)}
                    </Text>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        ))}

        {/* Total */}
        <div style={{
          marginTop: '16px',
          padding: '16px 20px',
          backgroundColor: BRAND_COLOR,
          borderRadius: '10px',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td>
                  <Text style={{
                    fontSize: '16px',
                    color: 'rgba(255,255,255,0.8)',
                    margin: '0',
                    fontWeight: '500',
                  }}>
                    Total Pagado
                  </Text>
                </td>
                <td style={{ textAlign: 'right' as const }}>
                  <Text style={{
                    fontSize: '22px',
                    color: '#ffffff',
                    margin: '0',
                    fontWeight: 'bold',
                  }}>
                    {formatCLP(total)}
                  </Text>
                </td>
              </tr>
              <tr>
                <td colSpan={2} style={{ textAlign: 'right' as const }}>
                  <Text style={{
                    fontSize: '11px',
                    color: 'rgba(255,255,255,0.6)',
                    margin: '4px 0 0',
                  }}>
                    IVA incluido
                  </Text>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <Hr style={{ borderColor: '#eee', margin: '30px 0' }} />

        {/* Shipping / Billing Address */}
        <Text style={{
          fontSize: '14px',
          fontWeight: 'bold',
          color: BRAND_COLOR,
          textTransform: 'uppercase',
          letterSpacing: '1px',
          margin: '0 0 12px',
        }}>
          Datos de Facturación
        </Text>
        <div style={{
          backgroundColor: '#fafafa',
          borderRadius: '8px',
          padding: '16px',
          border: '1px solid #f0f0f0',
          marginBottom: '24px',
        }}>
          <Text style={{ fontSize: '14px', color: '#333', margin: '0 0 4px', fontWeight: '600' }}>
            {shippingAddress.first_name} {shippingAddress.last_name}
          </Text>
          <Text style={{ fontSize: '13px', color: '#666', margin: '0 0 2px' }}>
            {shippingAddress.address_1}
          </Text>
          <Text style={{ fontSize: '13px', color: '#666', margin: '0 0 2px' }}>
            {shippingAddress.city}, {shippingAddress.province} {shippingAddress.postal_code}
          </Text>
        </div>

        {/* Call to action */}
        <div style={{ textAlign: 'center', marginTop: '10px' }}>
          <Text style={{
            fontSize: '15px',
            color: '#555',
            margin: '0 0 20px',
            lineHeight: '1.6',
          }}>
            Si tienes alguna consulta sobre tu pedido, no dudes en contactarnos.
          </Text>

          <Link
            href="https://calisf.cl"
            style={{
              display: 'inline-block',
              backgroundColor: BRAND_COLOR,
              color: '#ffffff',
              padding: '14px 32px',
              borderRadius: '10px',
              fontWeight: 'bold',
              fontSize: '14px',
              textDecoration: 'none',
            }}
          >
            Ir a Calisf.cl
          </Link>
        </div>
      </Section>
    </Base>
  )
}

OrderPlacedTemplate.PreviewProps = {
  order: {
    id: 'test-order-id',
    display_id: '42',
    created_at: new Date().toISOString(),
    email: 'test@example.com',
    currency_code: 'clp',
    items: [
      { id: 'item-1', title: 'Prevención Listeria', product_title: 'Prevención y eliminación de listeria en la industria de alimentos', variant_title: 'Default', quantity: 1, unit_price: 100 },
    ],
    shipping_address: {
      first_name: 'Felipe',
      last_name: 'Aguilar',
      address_1: 'San Eugenio 123',
      city: 'Santiago',
      province: 'RM',
      postal_code: '7500000',
      country_code: 'cl'
    },
    summary: { raw_current_order_total: { value: 100 } }
  },
  shippingAddress: {
    first_name: 'Felipe',
    last_name: 'Aguilar',
    address_1: 'San Eugenio 123',
    city: 'Santiago',
    province: 'RM',
    postal_code: '7500000',
    country_code: 'cl'
  }
} as OrderPlacedPreviewProps

export default OrderPlacedTemplate
