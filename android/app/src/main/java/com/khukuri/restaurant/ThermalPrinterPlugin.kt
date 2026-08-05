package com.khukuri.restaurant

import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import org.json.JSONArray
import java.io.OutputStream
import java.net.InetSocketAddress
import java.net.Socket
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * ThermalPrinterPlugin.kt
 *
 * Capacitor native plugin that exposes printReceipt() to JavaScript.
 *
 * JavaScript call:
 *   const ThermalPrinter = registerPlugin('ThermalPrinter')
 *   await ThermalPrinter.printReceipt({ order, paymentMethod, taxRate, ... })
 *
 * The plugin:
 *  1. Parses the order JSON from JavaScript
 *  2. Builds ESC/POS bytes via EscPosHelper
 *  3. Opens a TCP socket to the printer (default: 192.168.1.127:9100)
 *  4. Sends the bytes
 *  5. Retries once on failure
 *  6. Returns success/error back to JavaScript
 */
@CapacitorPlugin(name = "ThermalPrinter")
class ThermalPrinterPlugin : Plugin() {

    companion object {
        private const val DEFAULT_IP = "192.168.1.127"
        private const val DEFAULT_PORT = 9100
        private const val CONNECT_TIMEOUT_MS = 5000   // 5 seconds to connect
        private const val WRITE_TIMEOUT_MS   = 8000   // 8 seconds to write all data
        private const val MAX_RETRIES = 1              // Retry once on failure
    }

    @PluginMethod
    fun printReceipt(call: PluginCall) {
        val printerIp   = call.getString("printerIp", DEFAULT_IP) ?: DEFAULT_IP
        val printerPort = call.getInt("printerPort", DEFAULT_PORT) ?: DEFAULT_PORT
        val paperWidth  = call.getInt("paperWidth", 80) ?: 80
        val payMethod   = (call.getString("paymentMethod") ?: "cash")
            .replaceFirstChar { it.uppercase() }
        val taxRate     = call.getDouble("taxRate") ?: 0.0
        val svcRate     = call.getDouble("serviceChargeRate") ?: 0.0

        // Parse order object from JavaScript
        val orderObj = call.getObject("order") ?: run {
            call.reject("Missing order data")
            return
        }

        // Parse items — support both 'items' (new order) and 'order_items' (active order)
        val items = mutableListOf<Triple<String, Int, Double>>()
        val itemsArray: JSONArray? = orderObj.optJSONArray("items")
            ?: orderObj.optJSONArray("order_items")

        if (itemsArray != null) {
            for (i in 0 until itemsArray.length()) {
                val item = itemsArray.getJSONObject(i)
                val name  = item.optString("name")
                    .ifEmpty { item.optString("menu_item_name", "Item") }
                val qty   = item.optInt("quantity", 1)
                val price = item.optDouble("price")
                    .takeIf { !it.isNaN() } ?: item.optDouble("unit_price", 0.0)
                items.add(Triple(name, qty, price))
            }
        }

        // Financial fields
        val subtotal  = orderObj.optDouble("subtotal", 0.0)
        val discount  = orderObj.optDouble("discountAmount", 0.0)
            .takeIf { it > 0.0 } ?: orderObj.optDouble("discount_amount", 0.0)
        val tax       = orderObj.optDouble("tax", 0.0)
            .takeIf { it > 0.0 } ?: orderObj.optDouble("tax_amount", 0.0)
        val service   = orderObj.optDouble("serviceCharge", 0.0)
            .takeIf { it > 0.0 } ?: orderObj.optDouble("service_charge_amount", 0.0)
        val grandTotal = orderObj.optDouble("total", 0.0)

        // Date/time formatting
        val createdAt = orderObj.optString("created_at", "")
        val (dateStr, timeStr) = try {
            val d = if (createdAt.isNotEmpty()) Date(createdAt) else Date()
            Pair(
                SimpleDateFormat("dd MMM yyyy", Locale.ENGLISH).format(d),
                SimpleDateFormat("hh:mm a", Locale.ENGLISH).format(d)
            )
        } catch (e: Exception) {
            val now = Date()
            Pair(
                SimpleDateFormat("dd MMM yyyy", Locale.ENGLISH).format(now),
                SimpleDateFormat("hh:mm a", Locale.ENGLISH).format(now)
            )
        }

        val orderNumber = orderObj.optString("order_number", "-")
        val orderType   = (orderObj.optString("order_type", "dine_in")).replace("_", " ")

        // Build ESC/POS bytes
        val receiptBytes = EscPosHelper.buildReceipt(
            orderNumber  = orderNumber,
            orderDate    = dateStr,
            orderTime    = timeStr,
            orderType    = orderType,
            paymentMethod = payMethod,
            items        = items,
            subtotal     = subtotal,
            discount     = discount,
            taxRate      = taxRate,
            tax          = tax,
            serviceRate  = svcRate,
            service      = service,
            grandTotal   = grandTotal,
            paperWidthMm = paperWidth
        )

        // Run printing on a background thread (network I/O must not block UI thread)
        Thread {
            var lastError: String? = null
            var success = false

            for (attempt in 0..MAX_RETRIES) {
                try {
                    sendToPrinter(printerIp, printerPort, receiptBytes)
                    success = true
                    break
                } catch (e: java.net.SocketTimeoutException) {
                    lastError = "Printer offline or unreachable. Check that the printer is powered on and connected to the network at $printerIp:$printerPort"
                } catch (e: java.net.ConnectException) {
                    lastError = "Cannot connect to printer at $printerIp:$printerPort. Make sure the printer is on the same Wi-Fi network."
                } catch (e: Exception) {
                    lastError = "Print error: ${e.message}"
                }

                if (attempt < MAX_RETRIES) {
                    // Wait 1 second before retrying
                    Thread.sleep(1000)
                }
            }

            val result = JSObject()
            if (success) {
                result.put("success", true)
                call.resolve(result)
            } else {
                result.put("success", false)
                result.put("error", lastError ?: "Unknown printer error")
                call.resolve(result) // Resolve (not reject) so JS can handle the error gracefully
            }
        }.start()
    }

    /**
     * Opens a TCP socket to the printer, sends bytes, and closes the connection.
     * Throws on timeout or connection error.
     */
    private fun sendToPrinter(ip: String, port: Int, data: ByteArray) {
        val socket = Socket()
        try {
            // Connect with timeout
            socket.connect(InetSocketAddress(ip, port), CONNECT_TIMEOUT_MS)
            socket.soTimeout = WRITE_TIMEOUT_MS

            val out: OutputStream = socket.getOutputStream()
            out.write(data)
            out.flush()
        } finally {
            try { socket.close() } catch (_: Exception) {}
        }
    }
}
