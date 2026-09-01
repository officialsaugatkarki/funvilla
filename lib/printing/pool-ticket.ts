/**
 * pool-ticket.ts
 *
 * Generates print-ready output for swimming pool tickets.
 * Styled to match the Hetauda Fun Villa physical ticket.
 *
 * Exports:
 *  - buildPoolTicketHtml(ticket)       → full HTML document for browser window.print()
 *  - buildPoolTicketTextLines(ticket)  → plain-text lines for ESC/POS thermal printer
 */

'use client'

export interface PoolTicketData {
  id: string
  ticket_number: string
  ticket_type: string   // 'adult' | 'child' | 'family' | 'member' | 'staff'
  visitor_name?: string | null
  visitor_phone?: string | null
  visitor_address?: string | null
  visitor_gender?: string | null
  visitor_count: number
  price: number
  payment_method: string
  valid_date: string
  check_in_time?: string | null
  created_at?: string | null
  notes?: string | null
}

// ─── Text helpers for ESC/POS line building ────────────────────────────────────
const W = 31

function center(text: string): string {
  const t = text.slice(0, W)
  const pad = Math.max(0, Math.floor((W - t.length) / 2))
  return ' '.repeat(pad) + t
}

function row(label: string, value: string): string {
  const maxLabel = 12
  const l = label.slice(0, maxLabel).padEnd(maxLabel)
  const v = value.slice(0, W - maxLabel - 2).padStart(W - maxLabel - 2)
  return `${l}: ${v}`
}

function divider(char = '-'): string {
  return char.repeat(W)
}

function capitalize(s: string): string {
  if (!s) return ''
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function ticketLabel(ticket: PoolTicketData): string {
  const typeMap: Record<string, string> = {
    adult:  'Adult Ticket',
    child:  'Child Ticket',
    family: 'Family Package',
    member: 'Club Member',
    staff:  'Staff Pass',
  }
  return ticket.notes || typeMap[ticket.ticket_type] || capitalize(ticket.ticket_type)
}

// ─── Plain-text lines for ESC/POS ─────────────────────────────────────────────
export function buildPoolTicketTextLines(ticket: PoolTicketData): string[] {
  const date = new Date(ticket.check_in_time || ticket.created_at || Date.now())
  const dateStr = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
  const label   = ticketLabel(ticket)

  return [
    '',
    center('HETAUDA FUN VILLA'),
    center('Hetauda-7, Sunwood'),
    center('Mobile: 9855073719'),
    '',
    divider('-'),
    row('Ticket No', ticket.ticket_number || ticket.id.split('-')[0].toUpperCase()),
    row('Date', dateStr),
    row('Time', timeStr),
    divider('-'),
    ...(ticket.visitor_name    ? [row('Name',    ticket.visitor_name)]                 : []),
    ...(ticket.visitor_phone   ? [row('Phone',   ticket.visitor_phone)]                : []),
    ...(ticket.visitor_address ? [row('Address', ticket.visitor_address)]              : []),
    ...(ticket.visitor_gender  ? [row('Gender',  capitalize(ticket.visitor_gender!))]  : []),
    divider('-'),
    center(label.toUpperCase()),
    row('Visitors', ticket.visitor_count.toString()),
    divider('='),
    center('NPR ' + Math.round(ticket.price)),
    divider('='),
    row('Payment', capitalize(ticket.payment_method)),
    '',
    center('Thank you for visiting!'),
    center('Enjoy the pool!'),
    '',
  ]
}

// ─── Full HTML document for browser window.print() ────────────────────────────
export function buildPoolTicketHtml(ticket: PoolTicketData): string {
  if (!ticket) return ''

  const date    = new Date(ticket.check_in_time || ticket.created_at || Date.now())
  const dateStr = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
  const label   = ticketLabel(ticket)
  const ticketNo = ticket.ticket_number || ticket.id.split('-')[0].toUpperCase()

  const infoRow = (lbl: string, value: string) =>
    `<tr>
      <td style="padding:2px 4px;color:#555;font-size:12px;">${lbl}</td>
      <td style="padding:2px 4px;text-align:right;font-size:12px;">${value}</td>
    </tr>`

  const hasVisitorInfo = !!(ticket.visitor_name || ticket.visitor_phone || ticket.visitor_address || ticket.visitor_gender)

  const visitorRows = [
    ticket.visitor_name    ? infoRow('Name',    ticket.visitor_name)                 : '',
    ticket.visitor_phone   ? infoRow('Phone',   ticket.visitor_phone)                : '',
    ticket.visitor_address ? infoRow('Address', ticket.visitor_address)              : '',
    ticket.visitor_gender  ? infoRow('Gender',  capitalize(ticket.visitor_gender!))  : '',
  ].join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Pool Ticket - ${ticketNo}</title>
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
    .divider-dash  { border-top: 1px dashed #000; margin: 5px 0; }
    .divider-solid { border-top: 2px solid  #000; margin: 5px 0; }
    table { width: 100%; border-collapse: collapse; }
    .ticket-type {
      text-align: center;
      font-size: 15px;
      font-weight: bold;
      padding: 4px 0;
      letter-spacing: 0.5px;
    }
    .price-box {
      text-align: center;
      font-size: 20px;
      font-weight: bold;
      padding: 4px 0;
    }
    .footer { text-align: center; margin-top: 8px; font-size: 11px; color: #444; }
    .wave-line { text-align: center; font-size: 10px; letter-spacing: 2px; margin: 2px 0; }
    @media print {
      body { width: 72mm; }
      button { display: none; }
    }
  </style>
</head>
<body>
  <div class="center">
    <p class="bold lg">HETAUDA FUN VILLA</p>
    <p>Hetauda-7, Sunwood</p>
    <p>Mobile No. 9855073719</p>
  </div>

  <div class="wave-line">~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~</div>
  <div class="divider-dash"></div>

  <table>
    ${infoRow('Ticket No', ticketNo)}
    ${infoRow('Date', dateStr)}
    ${infoRow('Time', timeStr)}
  </table>

  <div class="divider-dash"></div>

  ${hasVisitorInfo ? `<table>${visitorRows}</table><div class="divider-dash"></div>` : ''}

  <p class="ticket-type">${label}${ticket.visitor_count > 1 ? ' x ' + ticket.visitor_count : ''}</p>

  <div class="divider-solid"></div>

  <p class="price-box">NPR ${Math.round(ticket.price).toLocaleString()}</p>

  <div class="divider-solid"></div>

  <table>
    ${infoRow('Payment', capitalize(ticket.payment_method))}
    ${infoRow('Status', 'PAID')}
  </table>

  <div class="divider-dash"></div>

  <div class="footer">
    <p>Thank you for visiting!</p>
    <p>Enjoy the pool!</p>
  </div>

  <script>
    window.onload = function() { window.print() }
  <\/script>
</body>
</html>`
}
