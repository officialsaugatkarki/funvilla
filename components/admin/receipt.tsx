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
const W = 32 // characters per line for 58mm paper

function center(text: string): string {
  const t = text.slice(0, W)
  const pad = Math.max(0, Math.floor((W - t.length) / 2))
  return ' '.repeat(pad) + t
}

function row(label: string, value: string): string {
  const maxLabel = 10
  const l = label.slice(0, maxLabel).padEnd(maxLabel)
  const v = value.slice(0, W - maxLabel - 2)
  return `${l}: ${v}`
}

function itemRow(name: string, total: string): string {
  // e.g. "1x Plain Lassi             120"
  const maxName = W - total.length - 1
  const n = name.length > maxName ? name.slice(0, maxName - 1) + '-' : name.padEnd(maxName)
  return `${n} ${total}`
}

function divider(char = '-'): string {
  return char.repeat(W)
}

// ─────────────────────────────────────────────────────────────────────────────
// Build a complete printable HTML page
// ─────────────────────────────────────────────────────────────────────────────
export function buildReceiptHtml(
  order: any,
  paymentMethod: string,
  taxRate: number,
  serviceChargeRate: number = 0
): string {
  if (!order) return ''

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

  const lines: string[] = [
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
    '',
    itemRow('Item', 'Total'),
    divider('-'),
    ...items.map((item: any) => {
      const name  = `${item.quantity}x ${item.name}`
      const price = fmt(Number(item.price) * Number(item.quantity))
      return itemRow(name, price)
    }),
    divider('-'),
    '',
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

  const text = lines.join('\n')

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Receipt - ${order.order_number || ''}</title>
  <style>
    @page {
      size: 58mm auto;
      margin: 3mm 2mm;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: 58mm;
      background: #fff;
      color: #000;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    pre {
      font-family: "Courier New", "Courier", monospace;
      font-size: 10pt;
      font-weight: 600;
      line-height: 1.35;
      white-space: pre;
      word-break: normal;
      overflow: hidden;
      color: #000;
    }
  </style>
</head>
<body>
<pre>${text}</pre>
<script>
  window.onload = function() {
    window.print();
    setTimeout(function() { window.close(); }, 1000);
  };
</script>
</body>
</html>`
}

// ─────────────────────────────────────────────────────────────────────────────
// Download receipt as an HTML file (for mobile users without direct printer)
// ─────────────────────────────────────────────────────────────────────────────
export function downloadReceiptHtml(
  order: any,
  paymentMethod: string,
  taxRate: number,
  serviceChargeRate: number = 0
): void {
  const html = buildReceiptHtml(order, paymentMethod, taxRate, serviceChargeRate)
  if (!html) return
  const blob = new Blob([html], { type: 'text/html' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `receipt-${order.order_number || 'unknown'}.html`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
