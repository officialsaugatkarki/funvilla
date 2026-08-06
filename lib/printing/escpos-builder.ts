/**
 * escpos-builder.ts
 *
 * Converts the structured output of formatReceipt() into a raw binary
 * ESC/POS command buffer ready to be streamed over TCP to the printer.
 *
 * This module is used ONLY on the server side (API route).
 * It has zero browser imports and is safe to run in Node.js.
 *
 * ESC/POS command reference:
 *  https://reference.epson-biz.com/modules/ref_escpos/index.php
 */

import { formatReceipt, PAPER_WIDTH_80MM } from './escpos-formatter'
import type { ReceiptOrder } from './escpos-formatter'

// ── ESC/POS control bytes ────────────────────────────────────────────────────
const ESC  = 0x1b
const GS   = 0x1d
const LF   = 0x0a  // Line feed / newline

const INIT             = Buffer.from([ESC, 0x40])                 // Initialize printer
const BOLD_ON          = Buffer.from([ESC, 0x45, 0x01])           // Bold on
const BOLD_OFF         = Buffer.from([ESC, 0x45, 0x00])           // Bold off
const ALIGN_LEFT       = Buffer.from([ESC, 0x61, 0x00])           // Left align
const ALIGN_CENTER     = Buffer.from([ESC, 0x61, 0x01])           // Center align
const DOUBLE_HEIGHT_ON = Buffer.from([ESC, 0x21, 0x10])           // Double height
const NORMAL_SIZE      = Buffer.from([ESC, 0x21, 0x00])           // Normal size
const CUT              = Buffer.from([GS,  0x56, 0x42, 0x00])     // Full cut with feed

/** Encode a text string to a Buffer using CP437 (standard ESC/POS codepage) */
function encode(text: string): Buffer {
  // Node.js doesn't have a CP437 encoder, so we use latin1 which covers
  // the printable ASCII range (32–126) that we use. Non-ASCII chars are
  // replaced with '?'. This is safe for English-language receipts.
  return Buffer.from(text.replace(/[^\x20-\x7E]/g, '?'), 'latin1')
}

/** Append a line feed */
function lf(): Buffer {
  return Buffer.from([LF])
}

/**
 * Build a complete ESC/POS binary buffer for the given order.
 *
 * @param order             Order data (same shape as the Android printer uses)
 * @param paymentMethod     'cash' | 'card' | 'esewa' | 'khalti'
 * @param taxRate           VAT percentage (e.g., 13)
 * @param serviceChargeRate Service charge percentage (e.g., 10)
 * @param paperWidth        58 | 80 — paper width in mm (default 80)
 */
export function buildEscPosBuffer(
  order: ReceiptOrder,
  paymentMethod: string,
  taxRate: number,
  serviceChargeRate: number = 0,
  paperWidth: 58 | 80 = 80
): Buffer {
  const charWidth = paperWidth === 58 ? 32 : PAPER_WIDTH_80MM

  // Use the same formatter as the Android path — receipt content is identical
  const receipt = formatReceipt(order, paymentMethod, taxRate, serviceChargeRate, charWidth)

  const parts: Buffer[] = []

  // 1. Initialize printer
  parts.push(INIT)

  // 2. Header — centered + bold restaurant name
  parts.push(ALIGN_CENTER)
  parts.push(BOLD_ON, DOUBLE_HEIGHT_ON)
  parts.push(encode('KHUKURI RESTAURANT'), lf())
  parts.push(encode('& BAR FUN VILLA'), lf())
  parts.push(NORMAL_SIZE, BOLD_OFF)
  parts.push(encode('Hetauda, Makwanpur, Nepal'), lf())
  parts.push(encode('+977-985-5073719'), lf())
  parts.push(lf())

  // 3. Invoice meta — left aligned
  parts.push(ALIGN_LEFT)
  // Skip the first empty line and the two header lines we already printed
  const metaAndBody = [
    ...receipt.items,   // item rows
    ...receipt.totals,  // subtotal, tax, total
    ...receipt.footer,  // thank-you lines
  ]

  // Re-emit the divider/meta lines from allLines skipping already-printed header
  // We use allLines starting from index 7 (after the 6-line header block)
  for (const line of receipt.allLines.slice(6)) {
    const upper = line.trim()
    // Bold the grand total line
    if (upper.startsWith('GRAND TOTAL')) {
      parts.push(BOLD_ON)
      parts.push(encode(line), lf())
      parts.push(BOLD_OFF)
    } else {
      parts.push(encode(line), lf())
    }
  }

  // 4. Feed 3 extra lines before cut
  parts.push(lf(), lf(), lf())

  // 5. Cut the paper
  parts.push(CUT)

  return Buffer.concat(parts)
}
