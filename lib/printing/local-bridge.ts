/**
 * local-bridge.ts
 *
 * Desktop Windows USB thermal printer support via the Local Print Bridge.
 *
 * This module sends raw ESC/POS bytes via HTTP POST to a locally running
 * Node.js bridge service (http://127.0.0.1:8000/print). The local bridge
 * then sends the bytes to the Windows POS-76C printer queue.
 */

import { PAPER_WIDTH_80MM } from './escpos-formatter'
import { buildEscPosBuffer } from './escpos-builder'

// We need to re-implement the buffer building for the browser side,
// OR since this is client-side, we can just use the same logic as usb-printer.
// Let's use the proven ESC/POS formatting logic.

const ESC = 0x1b
const GS  = 0x1d
const LF  = 0x0a

const INIT         = new Uint8Array([ESC, 0x40])
const BOLD_ON      = new Uint8Array([ESC, 0x45, 0x01])
const BOLD_OFF     = new Uint8Array([ESC, 0x45, 0x00])
const ALIGN_CENTER = new Uint8Array([ESC, 0x61, 0x01])
const ALIGN_LEFT   = new Uint8Array([ESC, 0x61, 0x00])
const DOUBLE_ON    = new Uint8Array([ESC, 0x21, 0x10])
const NORMAL_SIZE  = new Uint8Array([ESC, 0x21, 0x00])
const FEED_3       = new Uint8Array([ESC, 0x64, 0x03])
const CUT          = new Uint8Array([GS,  0x56, 0x42, 0x00])

function encodeAscii(text: string): Uint8Array {
  const bytes = new Uint8Array(text.length + 1)
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i)
    bytes[i] = (c >= 0x20 && c <= 0x7e) ? c : 0x3f // 0x3f = '?'
  }
  bytes[text.length] = LF
  return bytes
}

function concat(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((s, a) => s + a.length, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const a of arrays) {
    out.set(a, offset)
    offset += a.length
  }
  return out
}

const PAPER_W = 48 // 80mm

function centerLine(text: string, w = PAPER_W): string {
  const t = text.slice(0, w)
  const pad = Math.max(0, Math.floor((w - t.length) / 2))
  return ' '.repeat(pad) + t
}

function labelRow(label: string, value: string, w = PAPER_W): string {
  const lw = 12
  const l = label.slice(0, lw).padEnd(lw)
  const v = value.slice(0, w - lw - 2).padStart(w - lw - 2)
  return `${l}: ${v}`
}

function itemRow(name: string, price: string, w = PAPER_W): string {
  const maxN = w - price.length - 1
  const n = name.length > maxN ? name.slice(0, maxN - 1) + '-' : name.padEnd(maxN)
  return `${n} ${price}`
}

const div = (c = '-', w = PAPER_W) => c.repeat(w)
const fmt = (n: number) => Math.round(n).toString()

function buildEscPosBytes(
  order: any,
  paymentMethod: string,
  taxRate: number,
  serviceChargeRate: number
): Uint8Array {
  const date    = new Date(order.created_at || Date.now())
  const dateStr = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
  const orderType  = (order.order_type || 'dine_in').replace('_', ' ')
  const tableNum   = order.restaurant_tables?.table_number || order.table_number || ''

  const items: any[] = order.items ?? (order.order_items ?? []).map((i: any) => ({
    name: i.menu_item_name, quantity: i.quantity, price: i.unit_price,
  }))

  const subtotal = Number(order.subtotal || 0)
  const discount = Number(order.discountAmount ?? order.discount_amount ?? 0)
  const tax      = Number(order.tax ?? order.tax_amount ?? 0)
  const service  = Number(order.serviceCharge ?? order.service_charge_amount ?? 0)
  const total    = Number(order.total || 0)

  const parts: Uint8Array[] = []
  const line  = (s: string) => { parts.push(encodeAscii(s)) }
  const cmd   = (...cmds: Uint8Array[]) => { parts.push(...cmds) }

  // Initialize
  cmd(INIT)

  // Header (centered + bold)
  cmd(ALIGN_CENTER, BOLD_ON, DOUBLE_ON)
  line('KHUKURI RESTAURANT')
  line('& BAR FUN VILLA')
  cmd(NORMAL_SIZE, BOLD_OFF)
  line('Hetauda, Makwanpur, Nepal')
  line('+977-985-5073719')
  line('')

  // Meta block
  cmd(ALIGN_LEFT)
  line(div('-'))
  line(labelRow('Invoice', order.order_number || '-'))
  line(labelRow('Date', dateStr))
  line(labelRow('Time', timeStr))
  line(labelRow('Type', orderType))
  if (tableNum) line(labelRow('Table', tableNum))
  line(labelRow('Payment', paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1)))
  line(div('-'))

  // Items
  line(itemRow('Item', 'Total'))
  line(div('-'))
  for (const item of items) {
    const name  = `${item.quantity}x ${item.name}`
    const price = fmt(Number(item.price) * Number(item.quantity))
    line(itemRow(name, price))
  }
  line(div('-'))

  // Totals
  line(labelRow('Subtotal', 'NPR ' + fmt(subtotal)))
  if (discount > 0) line(labelRow('Discount', '-NPR ' + fmt(discount)))
  if (taxRate > 0 && tax > 0) line(labelRow(`VAT ${fmt(taxRate)}%`, 'NPR ' + fmt(tax)))
  if (serviceChargeRate > 0 && service > 0) line(labelRow('Service', 'NPR ' + fmt(service)))

  line(div('='))
  cmd(BOLD_ON)
  line(itemRow('GRAND TOTAL', 'NPR ' + fmt(total)))
  cmd(BOLD_OFF)
  line(div('='))

  // Footer
  line('')
  cmd(ALIGN_CENTER)
  line(centerLine('Thank you for visiting!'))
  line(centerLine('Please visit us again'))
  line('')

  // Feed + cut
  cmd(FEED_3, CUT)

  return concat(...parts)
}

// ── Bridge Transport ──────────────────────────────────────────────────────────

const BRIDGE_URL = 'http://127.0.0.1:8000/print'

export type PrintStatus = { ok: true } | { ok: false; error: string }

export async function testLocalBridge(): Promise<PrintStatus> {
  const parts: Uint8Array[] = []
  const line = (s: string) => parts.push(encodeAscii(s))
  const cmd = (...c: Uint8Array[]) => parts.push(...c)

  cmd(INIT)

  cmd(ALIGN_CENTER, BOLD_ON)
  line("==============================")
  line("LOCAL BRIDGE PRINTER TEST")
  line("")
  line("WINDOWS CONNECTION: OK")
  line("==============================")
  line("")
  cmd(ALIGN_LEFT, BOLD_OFF)
  line("ABCDEFGHIJKLMNOPQRSTUVWXYZ")
  line("0123456789")
  line("")

  line(itemRow("ITEM       QTY", "PRICE"))
  line(div("-"))
  line(itemRow("Plain Lassi   1", "120"))
  line(div("-"))
  line("")

  line(labelRow("SUBTOTAL", "NPR 120"))
  line(labelRow("GRAND TOTAL", "NPR 120"))
  line("")

  cmd(FEED_3, CUT)

  const payload = concat(...parts)

  try {
    const res = await fetch(BRIDGE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: payload
    })
    
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      return { ok: false, error: data.error || data.details || `Bridge returned status ${res.status}` }
    }
    return { ok: true }
  } catch (err: any) {
    return { ok: false, error: 'Could not connect to Local Print Bridge. Is the Node.js server running on port 8000?' }
  }
}

export async function printReceiptLocalBridge(
  order: any,
  paymentMethod: string,
  taxRate: number,
  serviceChargeRate: number = 0
): Promise<PrintStatus> {
  const bytes = buildEscPosBytes(order, paymentMethod, taxRate, serviceChargeRate)
  
  try {
    const res = await fetch(BRIDGE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: bytes
    })
    
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      return { ok: false, error: data.error || data.details || `Bridge returned status ${res.status}` }
    }
    return { ok: true }
  } catch (err: any) {
    return { ok: false, error: 'Could not connect to Local Print Bridge. Is the Node.js server running on port 8000?' }
  }
}
