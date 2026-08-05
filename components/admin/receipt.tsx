import React from 'react'

export interface ReceiptProps {
  order: any
  paymentMethod: string
  taxRate: number
  serviceChargeRate?: number
}

// Stub component – actual receipt is generated via buildReceiptHtml
export function Receipt(_props: ReceiptProps) {
  return null
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers for fixed-width monospace text layout (32 chars wide)
// ─────────────────────────────────────────────────────────────────────────────
const W = 31 // Reduced slightly to ensure it fits 58mm printers

function center(text: string): string {
  const t = text.slice(0, W)
  const pad = Math.max(0, Math.floor((W - t.length) / 2))
  return ' '.repeat(pad) + t
}

function row(label: string, value: string): string {
  const maxLabel = 10
  const l = label.slice(0, maxLabel).padEnd(maxLabel)
  const v = value.slice(0, W - maxLabel - 2).padStart(W - maxLabel - 2)
  return `${l}: ${v}`
}

function itemRow(name: string, total: string): string {
  const maxName = W - total.length - 1
  const n = name.length > maxName ? name.slice(0, maxName - 1) + '-' : name.padEnd(maxName)
  return `${n} ${total}`
}

function divider(char = '-'): string {
  return char.repeat(W)
}

function buildReceiptLines(order: any, paymentMethod: string, taxRate: number, serviceChargeRate: number): string[] {
  const fmt = (n: number | string) => Math.round(Number(n) || 0).toString()
  const date = new Date(order.created_at || Date.now())
  const dateStr = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
  const orderType = (order.order_type || 'dine_in').replace('_', ' ')
  const subtotal  = Number(order.subtotal || 0)
  const discount  = Number(order.discountAmount || 0)
  const tax       = Number(order.tax || 0)
  const service   = Number(order.serviceCharge || 0)
  const total     = Number(order.total || 0)
  const items: any[] = order.items || []

  return [
    '',
    center('KHUKURI RESTAURANT'),
    center('& BAR FUN VILLA'),
    center('Hetauda, Makwanpur, Nepal'),
    center('+977-985-5073719'),
    '',
    divider('-'),
    row('Invoice', order.order_number || '-'),
    row('Date', dateStr),
    row('Time', timeStr),
    row('Type', orderType),
    row('Payment', paymentMethod),
    divider('-'),
    itemRow('Item', 'Total'),
    divider('-'),
    ...items.map((item: any) => {
      const name  = `${item.quantity}x ${item.name}`
      const price = fmt(Number(item.price) * Number(item.quantity))
      return itemRow(name, price)
    }),
    divider('-'),
    row('Subtotal', 'NPR ' + fmt(subtotal)),
    ...(discount > 0 ? [row('Discount', '-NPR ' + fmt(discount))] : []),
    ...(taxRate > 0 && tax > 0 ? [row('VAT ' + taxRate + '%', 'NPR ' + fmt(tax))] : []),
    ...(serviceChargeRate > 0 && service > 0 ? [row('Service', 'NPR ' + fmt(service))] : []),
    divider('='),
    itemRow('GRAND TOTAL', 'NPR ' + fmt(total)),
    divider('='),
    '',
    center('Thank you for visiting!'),
    center('Please visit us again'),
    '',
  ]
}

// ─────────────────────────────────────────────────────────────────────────────
// Print receipt directly via hidden iframe using the perfect canvas image format
// ─────────────────────────────────────────────────────────────────────────────
export function printReceiptImageDirectly(
  order: any,
  paymentMethod: string,
  taxRate: number,
  serviceChargeRate: number = 0
): void {
  if (!order) return
  const lines = buildReceiptLines(order, paymentMethod, taxRate, serviceChargeRate)
  
  // Create a canvas
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  
  // Set dimensions (384px is typical 58mm printer width at 8 dots/mm)
  const fontSize = 18 
  const lineHeight = 22
  const padding = 12
  
  canvas.width = 384 
  canvas.height = (lines.length * lineHeight) + (padding * 2)
  
  // Draw background
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  
  // Draw text
  ctx.fillStyle = '#000000'
  ctx.font = `bold ${fontSize}px "Courier New", Courier, monospace`
  ctx.textBaseline = 'top'
  
  lines.forEach((line, index) => {
    ctx.fillText(line, padding, padding + (index * lineHeight))
  })
  
  const url = canvas.toDataURL('image/png')

  // Create a hidden iframe for printing
  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = 'none'
  document.body.appendChild(iframe)

  const doc = iframe.contentWindow?.document
  if (!doc) return

  doc.open()
  doc.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Receipt - ${order.order_number || ''}</title>
      <style>
        @page {
          margin: 0;
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body {
          width: 100%;
          background: #fff;
          display: flex;
          justify-content: center;
        }
        img {
          width: 100%;
          max-width: 384px; /* Matches the canvas width so it doesn't get pixelated */
          height: auto;
          display: block;
        }
      </style>
    </head>
    <body>
      <img src="${url}" onload="window.print();" />
    </body>
    </html>
  `)
  doc.close()

  // Clean up iframe after a delay to ensure printing dialog has opened
  setTimeout(() => {
    if (document.body.contains(iframe)) {
      document.body.removeChild(iframe)
    }
  }, 10000)
}

// ─────────────────────────────────────────────────────────────────────────────
// Download receipt as an Image file (for mobile users to print via Bluetooth apps)
// ─────────────────────────────────────────────────────────────────────────────
export function downloadReceiptImage(
  order: any,
  paymentMethod: string,
  taxRate: number,
  serviceChargeRate: number = 0
): void {
  if (!order) return
  const lines = buildReceiptLines(order, paymentMethod, taxRate, serviceChargeRate)
  
  // Create a canvas
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  
  // Set dimensions (384px is typical 58mm printer width at 8 dots/mm)
  // Adjusted font size and padding so 31 chars fit perfectly inside 384px
  const fontSize = 18 
  const lineHeight = 22
  const padding = 12
  
  canvas.width = 384 
  canvas.height = (lines.length * lineHeight) + (padding * 2)
  
  // Draw background
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  
  // Draw text
  ctx.fillStyle = '#000000'
  ctx.font = `bold ${fontSize}px "Courier New", Courier, monospace`
  ctx.textBaseline = 'top'
  
  lines.forEach((line, index) => {
    ctx.fillText(line, padding, padding + (index * lineHeight))
  })
  
  // Trigger download
  const url = canvas.toDataURL('image/png')
  const a = document.createElement('a')
  a.href = url
  a.download = `receipt-${order.order_number || 'unknown'}.png`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}
