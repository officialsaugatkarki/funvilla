import React from 'react'

export interface ReceiptProps {
  order: any
  paymentMethod: string
  taxRate: number
  serviceChargeRate?: number
}

export function Receipt({ order, paymentMethod, taxRate, serviceChargeRate = 0 }: ReceiptProps) {
  if (!order) return null
  return <div id="print-root" className="hidden" data-order={JSON.stringify(order)} data-payment={paymentMethod} data-tax={taxRate} data-service={serviceChargeRate} />
}

/**
 * Generates a self-contained HTML string for thermal printing.
 * Uses <table> layout which is the only reliable method for thermal printers.
 */
export function buildReceiptHtml(order: any, paymentMethod: string, taxRate: number, serviceChargeRate: number = 0): string {
  if (!order) return ''

  const fmt = (n: number) => Number(n || 0).toFixed(0)
  const date = new Date(order.created_at || Date.now())
  const dateStr = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
  const orderType = (order.order_type || 'dine_in').replace('_', '-')
  const subtotal = Number(order.subtotal || 0)
  const discount = Number(order.discountAmount || 0)
  const tax = Number(order.tax || 0)
  const service = Number(order.serviceCharge || 0)
  const total = Number(order.total || 0)

  const items: any[] = order.items || []

  const row = (label: string, value: string, bold = false, large = false) => `
    <tr>
      <td style="padding:2px 0;font-weight:${bold ? '700' : '500'};font-size:${large ? '14px' : '12px'}">${label}</td>
      <td style="padding:2px 0;text-align:right;font-weight:${bold ? '700' : '500'};font-size:${large ? '14px' : '12px'}">${value}</td>
    </tr>`

  const divider = (dashed = true) => `
    <tr><td colspan="2" style="padding:0">
      <div style="border-top:1px ${dashed ? 'dashed' : 'solid'} #000;margin:6px 0"></div>
    </td></tr>`

  const itemRows = items.map(item => {
    const itemTotal = fmt(Number(item.price) * Number(item.quantity))
    return `
    <tr>
      <td style="padding:2px 0;font-size:12px;vertical-align:top">
        <span style="font-weight:600">${item.quantity}x</span> ${item.name}
      </td>
      <td style="padding:2px 0;text-align:right;font-size:12px;vertical-align:top;white-space:nowrap;font-weight:600">${itemTotal}</td>
    </tr>`
  }).join('')

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Receipt</title>
  <style>
    @page { margin: 4mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: "Arial", "Helvetica", sans-serif;
      font-size: 12px;
      color: #000;
      background: #fff;
      width: 100%;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .receipt {
      width: 100%;
    }
    .center { text-align: center; }
    table { width: 100%; border-collapse: collapse; }
    td { word-break: break-word; }
  </style>
</head>
<body>
<div class="receipt">
  <!-- HEADER -->
  <div class="center" style="margin-bottom:10px">
    <div style="font-size:16px;font-weight:800;text-transform:uppercase;letter-spacing:1px">KHUKURI RESTAURANT</div>
    <div style="font-size:14px;font-weight:800;text-transform:uppercase">&amp; BAR FUN VILLA</div>
    <div style="font-size:11px;margin-top:4px">Hetauda, Makwanpur, Nepal</div>
    <div style="font-size:11px">+977-985-5073719</div>
  </div>

  <div style="border-top:1px dashed #000;margin:8px 0"></div>

  <!-- ORDER INFO -->
  <table style="margin-bottom:6px">
    ${row('Invoice', order.order_number || '-')}
    ${row('Date', dateStr)}
    ${row('Time', timeStr)}
    ${row('Type', orderType)}
    ${row('Payment', paymentMethod)}
  </table>

  <div style="border-top:1px dashed #000;margin:8px 0"></div>

  <!-- ITEMS HEADER -->
  <table style="margin-bottom:4px">
    <tr>
      <td style="font-weight:700;font-size:12px;padding:2px 0">Item</td>
      <td style="font-weight:700;font-size:12px;padding:2px 0;text-align:right">Total</td>
    </tr>
  </table>
  <div style="border-top:1px dashed #000;margin:4px 0"></div>

  <!-- ITEMS -->
  <table style="margin-bottom:6px">
    ${itemRows}
  </table>

  <div style="border-top:1px dashed #000;margin:8px 0"></div>

  <!-- TOTALS -->
  <table style="margin-bottom:6px">
    ${row('Subtotal', 'NPR ' + fmt(subtotal))}
    ${discount > 0 ? row('Discount', '- NPR ' + fmt(discount)) : ''}
    ${taxRate > 0 && tax > 0 ? row('VAT (' + taxRate + '%)', 'NPR ' + fmt(tax)) : ''}
    ${serviceChargeRate > 0 && service > 0 ? row('Service (' + serviceChargeRate + '%)', 'NPR ' + fmt(service)) : ''}
    ${divider(false)}
    ${row('GRAND TOTAL', 'NPR ' + fmt(total), true, true)}
  </table>

  <div style="border-top:1px dashed #000;margin:8px 0"></div>

  <!-- FOOTER -->
  <div class="center" style="margin-top:10px;margin-bottom:10px">
    <div style="font-weight:700;font-size:12px">Thank you for visiting!</div>
    <div style="font-size:11px;margin-top:2px">Please visit us again ❤</div>
  </div>

  <div style="border-top:2px solid #000;margin-top:8px"></div>
</div>
<script>
  window.onload = function() {
    window.print();
    setTimeout(function() { window.close(); }, 800);
  }
</script>
</body>
</html>`
}
