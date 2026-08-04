import React from 'react'

export interface ReceiptProps {
  order: any
  paymentMethod: string
  taxRate: number
  serviceChargeRate?: number
}

export function Receipt({ order, paymentMethod, taxRate, serviceChargeRate = 0 }: ReceiptProps) {
  if (!order) return null

  const s = {
    root: { fontFamily: 'monospace', fontSize: '13px', fontWeight: '500', lineHeight: '1.3', color: '#000000', background: '#FFFFFF', padding: '12px 8px', width: '100%', maxWidth: '300px', margin: '0 auto' },
    center: { textAlign: 'center' as const },
    right: { textAlign: 'right' as const },
    left: { textAlign: 'left' as const },
    bold: { fontWeight: '800' },
    uppercase: { textTransform: 'uppercase' as const },
    capitalize: { textTransform: 'capitalize' as const },
    flexBetween: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' },
    divider: { borderTop: '2px dashed #000000', margin: '10px 0' },
    thickDivider: { borderTop: '3px solid #000000', margin: '14px 0 6px 0' },
    wLabel: { width: '85px', flexShrink: 0 },
    wQty: { width: '28px', flexShrink: 0 },
    wTotal: { width: '60px', flexShrink: 0, textAlign: 'right' as const },
    flex1: { flex: 1, padding: '0 4px', wordBreak: 'break-word' as const },
    h1: { fontSize: '18px', margin: '0 0 4px 0' },
    h2: { fontSize: '16px', margin: '0 0 6px 0' },
    p0: { margin: '0 0 4px 0', fontSize: '12px' }
  }

  return (
    <div id="print-root" style={s.root} className="hidden">
      <div style={{ ...s.center, marginBottom: '16px' }}>
        <h1 style={{ ...s.h1, ...s.bold, ...s.uppercase }}>Khukuri Restaurant</h1>
        <h2 style={{ ...s.h2, ...s.bold, ...s.uppercase }}>&amp; Resort</h2>
        <p style={s.p0}>Hetauda, Makwanpur, Nepal</p>
        <p style={s.p0}>+977-985-5073719</p>
      </div>

      <div style={s.divider}></div>

      <div style={{ marginBottom: '8px' }}>
        <div style={s.flexBetween}>
          <span style={s.wLabel}>Invoice No</span>
          <span style={s.flex1}>: {order.order_number ? `ORD-${order.order_number}` : '-'}</span>
        </div>
        <div style={s.flexBetween}>
          <span style={s.wLabel}>Date</span>
          <span style={s.flex1}>: {new Date(order.created_at || Date.now()).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
        </div>
        <div style={s.flexBetween}>
          <span style={s.wLabel}>Time</span>
          <span style={s.flex1}>: {new Date(order.created_at || Date.now()).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
        </div>
        <div style={s.flexBetween}>
          <span style={s.wLabel}>Type</span>
          <span style={{ ...s.flex1, ...s.capitalize }}>: {order.order_type?.replace('_', '-') || 'Dine-in'}</span>
        </div>
        <div style={s.flexBetween}>
          <span style={s.wLabel}>Payment</span>
          <span style={{ ...s.flex1, ...s.capitalize }}>: {paymentMethod}</span>
        </div>
      </div>

      <div style={s.divider}></div>

      <div style={{ marginBottom: '8px' }}>
        <div style={{ ...s.flexBetween, ...s.bold }}>
          <span style={s.wQty}>Qty</span>
          <span style={{ ...s.flex1, ...s.left }}>Item</span>
          <span style={s.wTotal}>Total</span>
        </div>
        <div style={s.divider}></div>
        {order.items?.map((item: any, i: number) => (
          <div key={i} style={s.flexBetween}>
            <span style={s.wQty}>{item.quantity}</span>
            <span style={{ ...s.flex1, ...s.left }}>{item.name}</span>
            <span style={s.wTotal}>{Number(item.price * item.quantity).toFixed(0)}</span>
          </div>
        ))}
      </div>

      <div style={s.divider}></div>

      <div style={{ marginBottom: '16px' }}>
        <div style={s.flexBetween}>
          <span>Subtotal</span>
          <span>NPR {Number(order.subtotal || 0).toFixed(0)}</span>
        </div>
        {Number(order.discountAmount || 0) > 0 && (
          <div style={s.flexBetween}>
            <span>Discount</span>
            <span>- NPR {Number(order.discountAmount).toFixed(0)}</span>
          </div>
        )}
        {taxRate > 0 && (
          <div style={s.flexBetween}>
            <span>VAT ({taxRate}%)</span>
            <span>NPR {Number(order.tax || 0).toFixed(0)}</span>
          </div>
        )}
        {serviceChargeRate > 0 && Number(order.serviceCharge || 0) > 0 && (
          <div style={s.flexBetween}>
            <span>Service ({serviceChargeRate}%)</span>
            <span>NPR {Number(order.serviceCharge).toFixed(0)}</span>
          </div>
        )}
        <div style={{ ...s.divider, marginTop: '4px', marginBottom: '4px' }}></div>
        <div style={{ ...s.flexBetween, ...s.bold, fontSize: '15px' }}>
          <span>GRAND TOTAL</span>
          <span>NPR {Number(order.total || 0).toFixed(0)}</span>
        </div>
      </div>

      <div style={s.divider}></div>

      <div style={{ ...s.center, marginTop: '16px', marginBottom: '8px' }}>
        <p style={{ ...s.bold, margin: '0 0 2px 0' }}>Thank you for visiting!</p>
        <p style={{ margin: 0 }}>Please visit us again ❤️</p>
      </div>
      
      <div style={s.thickDivider}></div>
    </div>
  )
}
