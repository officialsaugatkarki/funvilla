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
// buildReceiptHtml — generates a complete, print-ready HTML document.
// Used by printReceiptBrowser() in print-bridge.ts to trigger window.print()
// on desktop/laptop devices (Mac, Windows) via the OS native print dialog.
// ─────────────────────────────────────────────────────────────────────────────
export function buildReceiptHtml(
  order: any,
  paymentMethod: string,
  taxRate: number,
  serviceChargeRate: number = 0
): string {
  if (!order) return ''

  const fmt = (n: number | string) => Math.round(Number(n) || 0).toLocaleString()
  const date = new Date(order.created_at || Date.now())
  const dateStr = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
  const orderType = (order.order_type || 'dine_in').replace(/_/g, ' ')
  const subtotal  = Number(order.subtotal || 0)
  const discount  = Number(order.discountAmount || 0)
  const tax       = Number(order.tax || 0)
  const service   = Number(order.serviceCharge || 0)
  const total     = Number(order.total || 0)
  const items: any[] = order.items || []

  const tableRow = (label: string, value: string, bold = false, color = '') =>
    `<tr>
      <td style="padding:2px 4px;color:#555;font-size:12px;">${label}</td>
      <td style="padding:2px 4px;text-align:right;${bold ? 'font-weight:bold;' : ''}${color ? `color:${color};` : ''}font-size:12px;">${value}</td>
    </tr>`

  const itemRows = items.map((item: any) => {
    const qty   = item.quantity || 1
    const price = Number(item.price || 0) * qty
    return `<tr>
      <td style="padding:3px 4px;font-size:12px;">${qty}× ${item.name || ''}</td>
      <td style="padding:3px 4px;text-align:right;font-size:12px;">NPR ${fmt(price)}</td>
    </tr>`
  }).join('')

  const tableNum = order.restaurant_tables?.table_number
    ? tableRow('Table', order.restaurant_tables.table_number) : ''

  const tableSection = order.restaurant_tables?.section
    ? tableRow('Area', order.restaurant_tables.section) : ''

  const discountRow = discount > 0
    ? tableRow('Discount', `− NPR ${fmt(discount)}`, false, '#16a34a') : ''

  const taxRow = taxRate > 0 && tax > 0
    ? tableRow(`VAT (${taxRate}%)`, `NPR ${fmt(tax)}`) : ''

  const serviceRow = serviceChargeRate > 0 && service > 0
    ? tableRow(`Service (${serviceChargeRate}%)`, `NPR ${fmt(service)}`) : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Receipt - ${order.order_number || ''}</title>
  <style>
    @page {
      size: 80mm auto;
      margin: 4mm 4mm;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 12px;
      color: #000;
      background: #fff;
      width: 72mm;
    }
    .center { text-align: center; }
    .bold   { font-weight: bold; }
    .lg     { font-size: 14px; }
    .xl     { font-size: 16px; }
    .divider-dash  { border-top: 1px dashed #000; margin: 4px 0; }
    .divider-solid { border-top: 2px solid  #000; margin: 4px 0; }
    table { width: 100%; border-collapse: collapse; }
    .total-row td { font-weight: bold; font-size: 14px; padding: 4px 4px; }
    .footer { text-align: center; margin-top: 8px; font-size: 11px; color: #444; }
    @media print {
      body { width: 72mm; }
      button { display: none; }
    }
  </style>
</head>
<body>
  <div class="center">
    <p class="bold lg">KHUKURI RESTAURANT</p>
    <p class="bold">&amp; BAR FUN VILLA</p>
    <p>Hetauda, Makwanpur, Nepal</p>
    <p>+977-985-5073719</p>
  </div>

  <div class="divider-dash"></div>

  <table>
    ${tableRow('Invoice', order.order_number || '-')}
    ${tableRow('Date', dateStr)}
    ${tableRow('Time', timeStr)}
    ${tableRow('Type', orderType.charAt(0).toUpperCase() + orderType.slice(1))}
    ${tableSection}
    ${tableNum}
    ${tableRow('Payment', paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1))}
  </table>

  <div class="divider-dash"></div>

  <table>
    <thead>
      <tr>
        <th style="text-align:left;font-size:12px;padding:2px 4px;">Item</th>
        <th style="text-align:right;font-size:12px;padding:2px 4px;">Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
  </table>

  <div class="divider-dash"></div>

  <table>
    ${tableRow('Subtotal', 'NPR ' + fmt(subtotal))}
    ${discountRow}
    ${taxRow}
    ${serviceRow}
  </table>

  <div class="divider-solid"></div>

  <table>
    <tr class="total-row">
      <td>GRAND TOTAL</td>
      <td style="text-align:right;">NPR ${fmt(total)}</td>
    </tr>
  </table>

  <div class="divider-solid"></div>

  <div class="footer">
    <p>Thank you for visiting!</p>
    <p>Please visit us again</p>
  </div>

  <script>
    // Auto-print when opened in a popup/iframe
    window.onload = function() {
      window.print()
    }
  </script>
</body>
</html>`
}

// ─────────────────────────────────────────────────────────────────────────────
// printReceiptImageDirectly — DISABLED
// window.print() / browser print dialogs are never used for the relay path.
// All relay printing goes through Supabase relay → Android POS → ESC/POS printer.
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
