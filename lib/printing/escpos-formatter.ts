/**
 * escpos-formatter.ts
 *
 * Pure TypeScript receipt formatter.
 * Converts an order object into structured receipt text lines.
 * Used by both the native printer bridge and the browser canvas fallback.
 */

export interface OrderItem {
  name: string
  quantity: number
  price: number
}

export interface ReceiptOrder {
  order_number?: string
  created_at?: string
  order_type?: string
  restaurant_tables?: { table_number?: string }
  table_number?: string
  items?: OrderItem[]
  order_items?: Array<{ menu_item_name: string; quantity: number; unit_price: number }>
  subtotal?: number
  discountAmount?: number
  discount_amount?: number
  tax?: number
  tax_amount?: number
  serviceCharge?: number
  service_charge_amount?: number
  total?: number
}

export interface FormattedReceipt {
  header: string[]
  divider: string
  items: string[]
  totals: string[]
  footer: string[]
  /** All lines joined for canvas/text rendering */
  allLines: string[]
}

const PAPER_WIDTH_80MM = 48  // 80mm paper: ~48 chars at default font
const PAPER_WIDTH_58MM = 32  // 58mm paper: ~32 chars at default font

/** Center text within a given width */
function center(text: string, width: number): string {
  const t = text.slice(0, width)
  const pad = Math.max(0, Math.floor((width - t.length) / 2))
  return ' '.repeat(pad) + t
}

/** Left label : right-aligned value row */
function labelRow(label: string, value: string, width: number): string {
  const labelWidth = 12
  const l = label.slice(0, labelWidth).padEnd(labelWidth)
  const v = value.slice(0, width - labelWidth - 2).padStart(width - labelWidth - 2)
  return `${l}: ${v}`
}

/** Item name left, price right — fills the full width */
function itemRow(name: string, price: string, width: number): string {
  const maxName = width - price.length - 1
  const n = name.length > maxName ? name.slice(0, maxName - 1) + '-' : name.padEnd(maxName)
  return `${n} ${price}`
}

/** Repeated character divider */
function divider(char = '-', width: number = PAPER_WIDTH_80MM): string {
  return char.repeat(width)
}

/** Round a number value to integer string */
const fmt = (n: number | string | undefined): string =>
  Math.round(Number(n) || 0).toString()

/**
 * Format an order into structured receipt lines.
 * @param order   Order data from the POS/DB
 * @param paymentMethod  'cash' | 'card' | 'esewa' | 'khalti'
 * @param taxRate  Tax percentage (e.g., 13 for 13% VAT)
 * @param serviceChargeRate  Service charge percentage
 * @param paperWidth  32 for 58mm, 48 for 80mm (default)
 */
export function formatReceipt(
  order: ReceiptOrder,
  paymentMethod: string,
  taxRate: number,
  serviceChargeRate: number = 0,
  paperWidth: number = PAPER_WIDTH_80MM
): FormattedReceipt {
  const W = paperWidth
  const date = new Date(order.created_at || Date.now())
  const dateStr = date.toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
  const timeStr = date.toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', hour12: true,
  })
  const orderType = (order.order_type || 'dine_in').replace('_', ' ')

  // Normalize items from either new order (items) or active order (order_items)
  const items: OrderItem[] = order.items ??
    (order.order_items ?? []).map(i => ({
      name: i.menu_item_name,
      quantity: i.quantity,
      price: i.unit_price,
    }))

  const subtotal = Number(order.subtotal || 0)
  const discount = Number(order.discountAmount ?? order.discount_amount ?? 0)
  const tax = Number(order.tax ?? order.tax_amount ?? 0)
  const service = Number(order.serviceCharge ?? order.service_charge_amount ?? 0)
  const total = Number(order.total || 0)

  const header: string[] = [
    '',
    center('KHUKURI RESTAURANT', W),
    center('& BAR FUN VILLA', W),
    center('Hetauda, Makwanpur, Nepal', W),
    center('+977-985-5073719', W),
    '',
  ]

  const tableNumber = order.restaurant_tables?.table_number ?? order.table_number

  const metaSection: string[] = [
    divider('-', W),
    labelRow('Invoice', order.order_number || '-', W),
    labelRow('Date', dateStr, W),
    labelRow('Time', timeStr, W),
    labelRow('Type', orderType, W),
    ...(tableNumber ? [labelRow('Table', tableNumber, W)] : []),
    labelRow('Payment', paymentMethod, W),
    divider('-', W),
  ]

  const itemsSection: string[] = [
    itemRow('Item', 'Total', W),
    divider('-', W),
    ...items.map(item => {
      const name = `${item.quantity}x ${item.name}`
      const price = fmt(Number(item.price) * Number(item.quantity))
      return itemRow(name, price, W)
    }),
    divider('-', W),
  ]

  const totals: string[] = [
    labelRow('Subtotal', 'NPR ' + fmt(subtotal), W),
    ...(discount > 0 ? [labelRow('Discount', '-NPR ' + fmt(discount), W)] : []),
    ...(taxRate > 0 && tax > 0 ? [labelRow('VAT ' + taxRate + '%', 'NPR ' + fmt(tax), W)] : []),
    ...(serviceChargeRate > 0 && service > 0 ? [labelRow('Service', 'NPR ' + fmt(service), W)] : []),
    divider('=', W),
    itemRow('GRAND TOTAL', 'NPR ' + fmt(total), W),
    divider('=', W),
  ]

  const footer: string[] = [
    '',
    center('Thank you for visiting!', W),
    center('Please visit us again', W),
    '',
    '',
  ]

  const allLines = [
    ...header,
    ...metaSection,
    ...itemsSection,
    ...totals,
    ...footer,
  ]

  return { header, divider: divider('-', W), items: itemsSection, totals, footer, allLines }
}

export { PAPER_WIDTH_80MM, PAPER_WIDTH_58MM }
