/**
 * usb-printer.ts
 *
 * Desktop USB thermal printer support using the WebUSB API.
 *
 * This module sends raw ESC/POS bytes directly to a USB thermal printer,
 * bypassing the OS print dialog entirely.
 *
 * Architecture (mirrors the Android path exactly):
 *   Order data → ESC/POS bytes (escpos-formatter.ts) → WebUSB → Printer
 *
 * Requirements:
 *   - Chrome or Edge browser (WebUSB is not available in Firefox/Safari)
 *   - Printer must be USB-connected
 *   - User must grant USB device permission once (remembered per-origin)
 *
 * Why NOT window.print():
 *   window.print() sends the page through the OS print spooler which converts
 *   it to PCL/PostScript/PDF. A thermal printer receiving PCL instead of
 *   ESC/POS will print corrupted garbage — exactly what Image 2 shows.
 */

// ── ESC/POS command constants (Uint8Array, not Buffer — safe in browser) ──────
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

/** Encode a text line to ASCII bytes (safe for ESC/POS). Non-ASCII → '?' */
function encodeAscii(text: string): Uint8Array {
  const bytes = new Uint8Array(text.length + 1)
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i)
    bytes[i] = (c >= 0x20 && c <= 0x7e) ? c : 0x3f // 0x3f = '?'
  }
  bytes[text.length] = LF
  return bytes
}

/** Concatenate multiple Uint8Arrays into one */
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

// ── ESC/POS receipt builder (browser-side, mirrors escpos-builder.ts) ─────────

const PAPER_W = 48  // 80mm paper char width

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

/**
 * Build a raw ESC/POS Uint8Array for a receipt order.
 * This is the browser equivalent of EscPosHelper.kt and escpos-builder.ts.
 */
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

// ── WebUSB transport ──────────────────────────────────────────────────────────

/** Known thermal printer USB vendor IDs (for auto-detection hints) */
const THERMAL_PRINTER_FILTERS = [
  { vendorId: 0x04b8 }, // Epson
  { vendorId: 0x0519 }, // Star Micronics
  { vendorId: 0x0fe6 }, // ICS (many generic 58mm/80mm printers)
  { vendorId: 0x1a86 }, // QinHeng (CH340-based printers)
  { vendorId: 0x0dd4 }, // Custom POS
  { vendorId: 0x1504 }, // Bixolon
  { vendorId: 0x154f }, // Citizen
  { vendorId: 0x0456 }, // Analog Devices / generic
  { vendorId: 0x0483 }, // STMicroelectronics-based printers
  { vendorId: 0x4b43 }, // Various POS brands
]

/** Send a Uint8Array to a USB device in chunks (handles USB packet size limits) */
async function sendToUSB(device: USBDevice, data: Uint8Array): Promise<void> {
  // Find the printer interface and bulk-OUT endpoint
  let interfaceNum = -1
  let endpointNum  = -1

  console.log('[USB Printer] Device:', device.manufacturerName, device.productName)
  console.log('[USB Printer] VID:', device.vendorId.toString(16), 'PID:', device.productId.toString(16))
  console.log('[USB Printer] Total byte length to send:', data.byteLength)

  for (const config of device.configurations) {
    for (const iface of config.interfaces) {
      for (const alt of iface.alternates) {
        // Printer class (7) or vendor-specific (255) with bulk-out endpoint
        const hasBulkOut = alt.endpoints.some(e => e.direction === 'out' && e.type === 'bulk')
        if (hasBulkOut && interfaceNum === -1) {
          interfaceNum = iface.interfaceNumber
          const ep = alt.endpoints.find(e => e.direction === 'out' && e.type === 'bulk')
          endpointNum = ep!.endpointNumber
          console.log('[USB Printer] Using interface:', interfaceNum, 'endpoint:', endpointNum)
          console.log('[USB Printer] Endpoint type:', ep!.type, 'direction:', ep!.direction)
        }
      }
    }
  }

  if (interfaceNum === -1) {
    throw new Error('No bulk-OUT endpoint found on USB printer. Ensure the printer driver is not claiming the device.')
  }

  await device.open()

  if (device.configuration === null) {
    await device.selectConfiguration(1)
  }

  try {
    await device.claimInterface(interfaceNum)
  } catch (e) {
    console.warn('[USB Printer] claimInterface failed (might already be claimed):', e)
    throw new Error('Cannot claim USB interface. Close any other program using the printer and try again.')
  }

  // Send in 64-byte chunks (USB full-speed bulk packet size)
  const CHUNK_SIZE = 64
  let bytesSent = 0

  try {
    while (bytesSent < data.byteLength) {
      const chunk = data.slice(bytesSent, bytesSent + CHUNK_SIZE)
      const result = await device.transferOut(endpointNum, chunk)
      if (result.status !== 'ok') {
        throw new Error(`USB transferOut failed at byte ${bytesSent}: status=${result.status}`)
      }
      bytesSent += chunk.byteLength
    }
    console.log('[USB Printer] Successfully sent', bytesSent, 'bytes')
  } finally {
    try { await device.releaseInterface(interfaceNum) } catch (_) {}
    try { await device.close() } catch (_) {}
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export type UsbPrintStatus =
  | { ok: true }
  | { ok: false; error: string }

/**
 * Perform a raw USB diagnostic test.
 * This runs the tests the user requested in sequence:
 * 1/2. Header and connection ok (Centered/Bold)
 * 3. Columns
 * 4. Totals
 */
export async function testUsbPrinter(): Promise<UsbPrintStatus> {
  if (!navigator.usb) return { ok: false, error: 'WebUSB is not supported in this browser' }

  let device: USBDevice | null = null
  try {
    const paired = await navigator.usb.getDevices()
    if (paired.length > 0) {
      device = paired[0]
    } else {
      device = await navigator.usb.requestDevice({ filters: THERMAL_PRINTER_FILTERS })
    }
  } catch (e: any) {
    return { ok: false, error: `USB device selection failed: ${e?.message ?? e}` }
  }

  const parts: Uint8Array[] = []
  const line = (s: string) => parts.push(encodeAscii(s))
  const cmd = (...c: Uint8Array[]) => parts.push(...c)

  // Initialize
  cmd(INIT)

  // TEST 1 & 2
  cmd(ALIGN_CENTER, BOLD_ON)
  line("==============================")
  line("USB THERMAL PRINTER TEST")
  line("")
  line("USB CONNECTION: OK")
  line("==============================")
  line("")
  cmd(ALIGN_LEFT, BOLD_OFF)
  line("ABCDEFGHIJKLMNOPQRSTUVWXYZ")
  line("0123456789")
  line("")

  // TEST 3 (Columns)
  line(itemRow("ITEM       QTY", "PRICE"))
  line(div("-"))
  line(itemRow("Plain Lassi   1", "120"))
  line(div("-"))
  line("")

  // TEST 4 (Totals)
  line(labelRow("SUBTOTAL", "NPR 120"))
  line(labelRow("GRAND TOTAL", "NPR 120"))
  line("")

  // Feed & Cut
  cmd(FEED_3, CUT)

  try {
    await sendToUSB(device, concat(...parts))
    return { ok: true }
  } catch (e: any) {
    return { ok: false, error: e?.message ?? String(e) }
  }
}

/**
 * Print a receipt to a USB thermal printer using WebUSB.
 *
 * Flow: Order → ESC/POS bytes → WebUSB bulk-OUT → Printer
 *
 * On first call the browser will show a USB device picker.
 * The chosen device is remembered for the session.
 */
export async function printReceiptUSB(
  order: any,
  paymentMethod: string,
  taxRate: number,
  serviceChargeRate: number = 0
): Promise<UsbPrintStatus> {
  if (!navigator.usb) {
    return {
      ok: false,
      error: 'WebUSB is not supported in this browser. Please use Chrome or Edge.',
    }
  }

  let device: USBDevice | null = null

  try {
    // Try to reuse a previously authorized printer first
    const paired = await navigator.usb.getDevices()
    if (paired.length > 0) {
      device = paired[0]
      console.log('[USB Printer] Reusing previously paired device:', device.productName)
    } else {
      // Show USB device picker to the user
      device = await navigator.usb.requestDevice({ filters: THERMAL_PRINTER_FILTERS })
      console.log('[USB Printer] User selected device:', device.productName)
    }
  } catch (e: any) {
    if (e?.name === 'NotFoundError') {
      return { ok: false, error: 'No USB printer selected. Please connect the printer and try again.' }
    }
    return { ok: false, error: `USB device selection failed: ${e?.message ?? e}` }
  }

  try {
    // Build raw ESC/POS bytes (same receipt content as Android)
    const bytes = buildEscPosBytes(order, paymentMethod, taxRate, serviceChargeRate)
    console.log('[USB Printer] Built ESC/POS buffer:', bytes.byteLength, 'bytes')

    // Send over WebUSB
    await sendToUSB(device, bytes)

    return { ok: true }
  } catch (e: any) {
    console.error('[USB Printer] Print failed:', e)
    return { ok: false, error: e?.message ?? String(e) }
  }
}

/** Forget the previously paired USB printer (forces re-selection next print) */
export async function forgetUsbPrinter(): Promise<void> {
  const devices = await navigator.usb.getDevices()
  for (const d of devices) {
    await d.forget()
  }
}

/** Check if WebUSB is available in this browser */
export function isWebUsbAvailable(): boolean {
  return typeof navigator !== 'undefined' && 'usb' in navigator
}
