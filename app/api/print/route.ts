/**
 * app/api/print/route.ts
 *
 * POST /api/print
 *
 * Server-side receipt printing endpoint for browser and iPhone PWA clients.
 *
 * Architecture:
 *  - Android Capacitor app:  prints natively via ThermalPrinterPlugin (unchanged)
 *  - Browser / iPhone PWA:   calls this endpoint → server opens TCP → ESC/POS printer
 *
 * Security:
 *  - Validates request payload with Zod schema (requirement #12)
 *  - Only allows printing to the known printer IP — no arbitrary IP (requirement #13)
 *  - Rejects requests with invalid/missing fields before touching the network
 *
 * Reliability:
 *  - Retries the TCP connection once on failure (requirement #11)
 *  - Returns structured { success, error } JSON (requirements #9, #10)
 *
 * This route must be deployed in a Node.js runtime (not Edge) because it uses
 * the Node.js `net` module for raw TCP sockets.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { buildEscPosBuffer } from '@/lib/printing/escpos-builder'
import { tcpPrint } from '@/lib/printing/tcp-printer'

// ── Force Node.js runtime (required for `net` module TCP sockets) ────────────
export const runtime = 'nodejs'

// ── Hardcoded printer address — prevents arbitrary host printing ─────────────
const PRINTER_IP   = '192.168.1.127'
const PRINTER_PORT = 9100

// ── Request validation schema ────────────────────────────────────────────────
// Mirrors ReceiptOrder from escpos-formatter.ts — all fields optional to match
// both fresh POS orders and historic orders from the database.
const OrderItemSchema = z.object({
  name:     z.string().min(1),
  quantity: z.number().int().positive(),
  price:    z.number().nonnegative(),
})

const OrderItemDbSchema = z.object({
  menu_item_name: z.string().min(1),
  quantity:       z.number().int().positive(),
  unit_price:     z.number().nonnegative(),
})

const PrintRequestSchema = z.object({
  order: z.object({
    order_number:           z.string().optional(),
    created_at:             z.string().optional(),
    order_type:             z.string().optional(),
    items:                  z.array(OrderItemSchema).optional(),
    order_items:            z.array(OrderItemDbSchema).optional(),
    subtotal:               z.number().optional(),
    discountAmount:         z.number().optional(),
    discount_amount:        z.number().optional(),
    tax:                    z.number().optional(),
    tax_amount:             z.number().optional(),
    serviceCharge:          z.number().optional(),
    service_charge_amount:  z.number().optional(),
    total:                  z.number().optional(),
  }).refine(
    (o) => (o.items && o.items.length > 0) || (o.order_items && o.order_items.length > 0),
    { message: 'Order must contain at least one item (items or order_items)' }
  ),
  paymentMethod:     z.string().min(1).max(20),
  taxRate:           z.number().min(0).max(100),
  serviceChargeRate: z.number().min(0).max(100).optional().default(0),
  paperWidth:        z.union([z.literal(58), z.literal(80)]).optional().default(80),
})

export type PrintRequest = z.infer<typeof PrintRequestSchema>

// ── POST handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest): Promise<NextResponse> {
  // 1. Parse JSON body
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON in request body' },
      { status: 400 }
    )
  }

  // 2. Validate payload (requirement #12)
  const parsed = PrintRequestSchema.safeParse(body)
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
    return NextResponse.json(
      { success: false, error: `Validation failed: ${issues}` },
      { status: 422 }
    )
  }

  const { order, paymentMethod, taxRate, serviceChargeRate, paperWidth } = parsed.data

  // 3. Build ESC/POS binary buffer — same formatter as Android (requirement #14)
  let buffer: Buffer
  try {
    buffer = buildEscPosBuffer(order, paymentMethod, taxRate, serviceChargeRate, paperWidth)
  } catch (err: any) {
    console.error('[/api/print] ESC/POS build error:', err)
    return NextResponse.json(
      { success: false, error: 'Failed to generate receipt: ' + (err?.message ?? 'Unknown error') },
      { status: 500 }
    )
  }

  // 4. Send to printer via TCP (requirements #6, #7, #8, #10, #11)
  const result = await tcpPrint({
    host:      PRINTER_IP,   // hardcoded — prevents arbitrary printing (#13)
    port:      PRINTER_PORT,
    data:      buffer,
    timeoutMs: 5000,
    retries:   1,            // one retry on failure (#11)
  })

  if (!result.success) {
    console.error(`[/api/print] TCP print failed: ${result.error}`)
    return NextResponse.json(
      { success: false, error: result.error ?? 'Printer connection failed' },
      { status: 502 }   // 502 Bad Gateway — upstream printer is unreachable
    )
  }

  console.log(`[/api/print] Printed successfully (attempt ${result.attempt})`)
  return NextResponse.json({ success: true, attempt: result.attempt })
}
