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
    ...(order.restaurant_tables?.table_number ? [row('Table', order.restaurant_tables.table_number)] : []),
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
// printReceiptImageDirectly — DISABLED
// window.print() / browser print dialogs are never used.
// All printing goes through Supabase relay → Android POS → ESC/POS printer.
// This function is kept as a no-op so existing call sites don't break.
// ─────────────────────────────────────────────────────────────────────────────
export function printReceiptImageDirectly(
  _order: any,
  _paymentMethod: string,
  _taxRate: number,
  _serviceChargeRate: number = 0
): void {
  console.warn('[receipt] printReceiptImageDirectly is disabled — use printReceipt() from print-bridge instead')
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

// ─────────────────────────────────────────────────────────────────────────────
// printReceiptCanvas — for Desktop/Laptop USB thermal printers
//
// Renders the receipt as a canvas image (identical to the thermal layout)
// then opens a browser print window showing ONLY that image.
// When printed on a USB thermal printer this produces output identical to
// the ESC/POS Android receipt.
// ─────────────────────────────────────────────────────────────────────────────
export function printReceiptCanvas(
  order: any,
  paymentMethod: string,
  taxRate: number,
  serviceChargeRate: number = 0
): void {
  if (!order) return
  const lines = buildReceiptLines(order, paymentMethod, taxRate, serviceChargeRate)

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const fontSize   = 18
  const lineHeight = 22
  const padding    = 12

  canvas.width  = 384
  canvas.height = (lines.length * lineHeight) + (padding * 2)

  // White background
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // Draw receipt text lines
  ctx.fillStyle    = '#000000'
  ctx.font         = `bold ${fontSize}px "Courier New", Courier, monospace`
  ctx.textBaseline = 'top'

  lines.forEach((line, index) => {
    ctx.fillText(line, padding, padding + (index * lineHeight))
  })

  const dataUrl = canvas.toDataURL('image/png')

  // Open a minimal print window containing only the receipt image
  const win = window.open('', '_blank', 'width=500,height=700')
  if (!win) {
    alert('Please allow popups for this site to print the receipt.')
    return
  }

  win.document.write(`<!DOCTYPE html>
<html>
  <head>
    <title>Receipt - ${order.order_number || ''}</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { background: #fff; display: flex; justify-content: center; }
      img  { display: block; width: 384px; max-width: 100%; }
      @media print {
        body { margin: 0; }
        img  { width: 100%; page-break-after: avoid; }
      }
    </style>
  </head>
  <body>
    <img src="${dataUrl}" />
    <script>
      window.onload = function() {
        setTimeout(function() { window.print(); window.close(); }, 200)
      }
    <\/script>
  </body>
</html>`)
  win.document.close()
}
