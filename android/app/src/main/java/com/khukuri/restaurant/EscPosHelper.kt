package com.khukuri.restaurant

/**
 * EscPosHelper.kt
 *
 * Generates ESC/POS byte sequences for LAN thermal printers.
 *
 * Supports:
 *  - 58mm paper  (PAPER_WIDTH_58 = 32 chars)
 *  - 80mm paper  (PAPER_WIDTH_80 = 48 chars)
 *
 * Usage:
 *   val bytes = EscPosHelper.buildReceipt(order, "Cash", 13, 0, 80)
 *   socket.outputStream.write(bytes)
 */
object EscPosHelper {

    // ── ESC/POS Command Constants ─────────────────────────────────────────────

    private val ESC = 0x1B.toByte()
    private val GS  = 0x1D.toByte()
    private val LF  = 0x0A.toByte()   // Line feed
    private val CR  = 0x0D.toByte()   // Carriage return

    // Initialize printer
    val INIT                = byteArrayOf(ESC, 0x40.toByte())

    // Text alignment
    val ALIGN_LEFT          = byteArrayOf(ESC, 0x61.toByte(), 0x00.toByte())
    val ALIGN_CENTER        = byteArrayOf(ESC, 0x61.toByte(), 0x01.toByte())
    val ALIGN_RIGHT         = byteArrayOf(ESC, 0x61.toByte(), 0x02.toByte())

    // Text style
    val BOLD_ON             = byteArrayOf(ESC, 0x45.toByte(), 0x01.toByte())
    val BOLD_OFF            = byteArrayOf(ESC, 0x45.toByte(), 0x00.toByte())

    // Double height + width (for "GRAND TOTAL" line)
    val DOUBLE_SIZE_ON      = byteArrayOf(ESC, 0x21.toByte(), 0x30.toByte())
    val DOUBLE_SIZE_OFF     = byteArrayOf(ESC, 0x21.toByte(), 0x00.toByte())

    // Feed and cut
    val FEED_3_LINES        = byteArrayOf(ESC, 0x64.toByte(), 0x03.toByte())
    /** Full cut with feed */
    val CUT_PAPER           = byteArrayOf(GS, 0x56.toByte(), 0x01.toByte())

    private const val PAPER_WIDTH_80 = 48
    private const val PAPER_WIDTH_58 = 32

    // ── Text Helpers ──────────────────────────────────────────────────────────

    private fun centerText(text: String, width: Int): String {
        val t = if (text.length > width) text.substring(0, width) else text
        val pad = maxOf(0, (width - t.length) / 2)
        return " ".repeat(pad) + t
    }

    private fun labelRow(label: String, value: String, width: Int): String {
        val labelWidth = 12
        val l = label.take(labelWidth).padEnd(labelWidth)
        val vMax = width - labelWidth - 2
        val v = value.take(vMax).padStart(vMax)
        return "$l: $v"
    }

    private fun itemRow(name: String, price: String, width: Int): String {
        val maxName = width - price.length - 1
        val n = if (name.length > maxName) name.substring(0, maxName - 1) + "-"
                else name.padEnd(maxName)
        return "$n $price"
    }

    private fun divider(char: Char = '-', width: Int): String = char.toString().repeat(width)

    private fun fmt(n: Double): String = n.toLong().toString()

    /** Convert a String to bytes (Courier / Latin-1 compatible) */
    private fun str(s: String): ByteArray = (s + "\n").toByteArray(Charsets.ISO_8859_1)

    private fun concat(vararg arrays: ByteArray): ByteArray {
        val total = arrays.sumOf { it.size }
        val result = ByteArray(total)
        var offset = 0
        for (arr in arrays) {
            arr.copyInto(result, offset)
            offset += arr.size
        }
        return result
    }

    // ── Public API ────────────────────────────────────────────────────────────

    /**
     * Build the full ESC/POS byte sequence for a receipt.
     *
     * @param orderNumber    e.g. "ORD-20260804-0011"
     * @param orderDate      e.g. "04 Aug 2026"
     * @param orderTime      e.g. "05:38 PM"
     * @param orderType      e.g. "dine in"
     * @param paymentMethod  e.g. "Cash"
     * @param items          List of (name, quantity, unitPrice)
     * @param subtotal       Before tax/service
     * @param discount       Discount amount (0 if none)
     * @param taxRate        Tax % (e.g., 13)
     * @param tax            Tax amount
     * @param serviceRate    Service charge % (e.g., 10)
     * @param service        Service charge amount
     * @param grandTotal     Final amount to pay
     * @param paperWidthMm   58 or 80
     */
    fun buildReceipt(
        orderNumber: String,
        orderDate: String,
        orderTime: String,
        orderType: String,
        paymentMethod: String,
        items: List<Triple<String, Int, Double>>,
        subtotal: Double,
        discount: Double,
        taxRate: Double,
        tax: Double,
        serviceRate: Double,
        service: Double,
        grandTotal: Double,
        paperWidthMm: Int = 80
    ): ByteArray {

        val W = if (paperWidthMm == 58) PAPER_WIDTH_58 else PAPER_WIDTH_80

        val chunks = mutableListOf<ByteArray>()

        fun add(vararg b: ByteArray) = chunks.addAll(b)
        fun line(s: String) = add(str(s))
        fun center(s: String) = line(centerText(s, W))
        fun div(c: Char = '-') = line(divider(c, W))

        // Printer init
        add(INIT)

        // ── Header ───────────────────────────────────────────────────────────
        add(ALIGN_CENTER, BOLD_ON)
        line("KHUKURI RESTAURANT")
        line("& BAR FUN VILLA")
        add(BOLD_OFF)
        line("Hetauda, Makwanpur, Nepal")
        line("+977-985-5073719")
        line("")

        // ── Order info ───────────────────────────────────────────────────────
        add(ALIGN_LEFT)
        div('-')
        line(labelRow("Invoice", orderNumber, W))
        line(labelRow("Date", orderDate, W))
        line(labelRow("Time", orderTime, W))
        line(labelRow("Type", orderType, W))
        line(labelRow("Payment", paymentMethod.replaceFirstChar { it.uppercase() }, W))
        div('-')

        // ── Items ────────────────────────────────────────────────────────────
        line(itemRow("Item", "Total", W))
        div('-')

        for ((name, qty, price) in items) {
            val displayName = "${qty}x $name"
            val displayPrice = fmt(qty * price)
            line(itemRow(displayName, displayPrice, W))
        }

        div('-')

        // ── Totals ───────────────────────────────────────────────────────────
        line(labelRow("Subtotal", "NPR ${fmt(subtotal)}", W))

        if (discount > 0.0) {
            line(labelRow("Discount", "-NPR ${fmt(discount)}", W))
        }
        if (taxRate > 0.0 && tax > 0.0) {
            line(labelRow("VAT ${fmt(taxRate)}%", "NPR ${fmt(tax)}", W))
        }
        if (serviceRate > 0.0 && service > 0.0) {
            line(labelRow("Service ${fmt(serviceRate)}%", "NPR ${fmt(service)}", W))
        }

        div('=')
        add(BOLD_ON)
        line(itemRow("GRAND TOTAL", "NPR ${fmt(grandTotal)}", W))
        add(BOLD_OFF)
        div('=')

        // ── Footer ───────────────────────────────────────────────────────────
        line("")
        add(ALIGN_CENTER)
        line("Thank you for visiting!")
        line("Please visit us again")
        line("")

        // Feed 3 lines then cut
        add(FEED_3_LINES)
        add(CUT_PAPER)

        return concat(*chunks.toTypedArray())
    }
}
