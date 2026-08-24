package com.khukuri.restaurant

import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.hardware.usb.UsbConstants
import android.hardware.usb.UsbDevice
import android.hardware.usb.UsbDeviceConnection
import android.hardware.usb.UsbEndpoint
import android.hardware.usb.UsbInterface
import android.hardware.usb.UsbManager
import android.os.Build
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

@CapacitorPlugin(name = "ThermalPrinter")
class ThermalPrinterPlugin : Plugin() {

    companion object {
        private const val DEFAULT_IP = "192.168.1.127"
        private const val DEFAULT_PORT = 9100
        private const val CONNECT_TIMEOUT_MS = 5000
        private const val WRITE_TIMEOUT_MS   = 8000
        private const val MAX_RETRIES = 3
        val RETRY_DELAYS_MS = arrayOf(2000L, 4000L, 6000L)
        private const val ACTION_USB_PERMISSION = "com.khukuri.restaurant.USB_PERMISSION"
    }

    private fun getLocalIpAddress(): String {
        try {
            val interfaces = java.net.NetworkInterface.getNetworkInterfaces()
            for (intf in interfaces) {
                if (intf.isLoopback || !intf.isUp) continue
                for (addr in intf.inetAddresses) {
                    if (!addr.isLoopbackAddress && addr.hostAddress?.contains(":") == false) {
                        return addr.hostAddress ?: "Unknown"
                    }
                }
            }
        } catch (e: Exception) {}
        return "Unknown"
    }

    private fun isSameSubnet(ip1: String, ip2: String): Boolean {
        if (ip1 == "Unknown" || ip2 == "Unknown") return false
        val parts1 = ip1.split(".")
        val parts2 = ip2.split(".")
        if (parts1.size == 4 && parts2.size == 4) {
            return parts1[0] == parts2[0] && parts1[1] == parts2[1] && parts1[2] == parts2[2]
        }
        return false
    }

    @PluginMethod
    fun printReceipt(call: PluginCall) {
        val connectionType = call.getString("connectionType", "network") ?: "network"
        val printerIp   = call.getString("printerIp", DEFAULT_IP) ?: DEFAULT_IP
        val printerPort = call.getInt("printerPort", DEFAULT_PORT) ?: DEFAULT_PORT
        val paperWidth  = call.getInt("paperWidth", 80) ?: 80
        val payMethod   = (call.getString("paymentMethod") ?: "cash")
            .replaceFirstChar { it.uppercase() }
        val taxRate     = call.getDouble("taxRate") ?: 0.0
        val svcRate     = call.getDouble("serviceChargeRate") ?: 0.0

        val orderObj = call.getObject("order") ?: run {
            call.reject("Missing order data")
            return
        }

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

        val subtotal  = orderObj.optDouble("subtotal", 0.0)
        val discount  = orderObj.optDouble("discountAmount", 0.0)
            .takeIf { it > 0.0 } ?: orderObj.optDouble("discount_amount", 0.0)
        val tax       = orderObj.optDouble("tax", 0.0)
            .takeIf { it > 0.0 } ?: orderObj.optDouble("tax_amount", 0.0)
        val service   = orderObj.optDouble("serviceCharge", 0.0)
            .takeIf { it > 0.0 } ?: orderObj.optDouble("service_charge_amount", 0.0)
        val grandTotal = orderObj.optDouble("total", 0.0)

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

        val tableNumber = run {
            val nested = orderObj.optJSONObject("restaurant_tables")
            nested?.optString("table_number", "")
                ?.takeIf { it.isNotBlank() }
                ?: orderObj.optString("table_number", "")
        }

        val tableSection = run {
            val nested = orderObj.optJSONObject("restaurant_tables")
            nested?.optString("section", "")
                ?.takeIf { it.isNotBlank() }
                ?: orderObj.optString("section", "")
        }

        val receiptBytes = EscPosHelper.buildReceipt(
            orderNumber  = orderNumber,
            orderDate    = dateStr,
            orderTime    = timeStr,
            orderType    = orderType,
            tableNumber  = tableNumber,
            tableSection = tableSection,
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

        // Keep call alive so we can resolve it asynchronously
        call.setKeepAlive(true)

        if (connectionType == "usb") {
            printUsb(call, receiptBytes)
        } else {
            printNetwork(call, printerIp, printerPort, receiptBytes)
        }
    }

    private fun printUsb(call: PluginCall, receiptBytes: ByteArray) {
        val usbManager = context.getSystemService(Context.USB_SERVICE) as UsbManager
        val deviceList = usbManager.deviceList
        var printerDevice: UsbDevice? = null
        
        for (device in deviceList.values) {
            val isPrinter = (device.deviceClass == UsbConstants.USB_CLASS_PRINTER) || 
                (0 until device.interfaceCount).any { device.getInterface(it).interfaceClass == UsbConstants.USB_CLASS_PRINTER }
            if (isPrinter) {
                printerDevice = device
                break
            }
        }
        
        if (printerDevice == null) {
            resolveError(call, "Printer not connected. Please check the USB cable and try again.")
            return
        }
        
        if (usbManager.hasPermission(printerDevice)) {
            doUsbPrint(usbManager, printerDevice, call, receiptBytes)
        } else {
            val receiver = object : BroadcastReceiver() {
                override fun onReceive(context: Context, intent: Intent) {
                    val action = intent.action
                    if (ACTION_USB_PERMISSION == action) {
                        context.unregisterReceiver(this)
                        synchronized(this) {
                            @Suppress("DEPRECATION")
                            val device = intent.getParcelableExtra<UsbDevice>(UsbManager.EXTRA_DEVICE)
                            if (intent.getBooleanExtra(UsbManager.EXTRA_PERMISSION_GRANTED, false)) {
                                if (device != null) {
                                    doUsbPrint(usbManager, device, call, receiptBytes)
                                } else {
                                    resolveError(call, "Printer device not found after permission granted")
                                }
                            } else {
                                resolveError(call, "Printer permission is required. Please allow access to the connected printer.")
                            }
                        }
                    }
                }
            }
            
            val intentFilter = IntentFilter(ACTION_USB_PERMISSION)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                context.registerReceiver(receiver, intentFilter, Context.RECEIVER_NOT_EXPORTED)
            } else {
                context.registerReceiver(receiver, intentFilter)
            }
            
            val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) PendingIntent.FLAG_MUTABLE else 0
            val permissionIntent = PendingIntent.getBroadcast(context, 0, Intent(ACTION_USB_PERMISSION), flags)
            
            usbManager.requestPermission(printerDevice, permissionIntent)
        }
    }

    private fun doUsbPrint(usbManager: UsbManager, device: UsbDevice, call: PluginCall, receiptBytes: ByteArray) {
        Thread {
            try {
                var printerInterface: UsbInterface? = null
                for (i in 0 until device.interfaceCount) {
                    val intf = device.getInterface(i)
                    if (intf.interfaceClass == UsbConstants.USB_CLASS_PRINTER) {
                        printerInterface = intf
                        break
                    }
                }
                
                if (printerInterface == null) {
                    resolveError(call, "Could not find printer interface on USB device.")
                    return@Thread
                }
                
                var bulkOut: UsbEndpoint? = null
                for (i in 0 until printerInterface.endpointCount) {
                    val endpoint = printerInterface.getEndpoint(i)
                    if (endpoint.type == UsbConstants.USB_ENDPOINT_XFER_BULK && endpoint.direction == UsbConstants.USB_DIR_OUT) {
                        bulkOut = endpoint
                        break
                    }
                }
                
                if (bulkOut == null) {
                    resolveError(call, "Could not find bulk OUT endpoint on printer.")
                    return@Thread
                }
                
                val connection: UsbDeviceConnection? = usbManager.openDevice(device)
                if (connection == null) {
                    resolveError(call, "Could not open USB connection. Please try reconnecting the printer.")
                    return@Thread
                }
                
                try {
                    connection.claimInterface(printerInterface, true)
                    
                    var offset = 0
                    val chunkSize = 4096
                    while (offset < receiptBytes.size) {
                        val length = minOf(chunkSize, receiptBytes.size - offset)
                        val transferred = connection.bulkTransfer(bulkOut, receiptBytes, offset, length, 5000)
                        if (transferred < 0) {
                            throw Exception("USB bulkTransfer failed.")
                        }
                        offset += transferred
                    }
                    
                    val result = JSObject()
                    result.put("success", true)
                    call.resolve(result)
                } finally {
                    connection.releaseInterface(printerInterface)
                    connection.close()
                }
                
            } catch (e: Exception) {
                resolveError(call, "Could not print the receipt. Please check that the printer is connected and turned on.")
            }
        }.start()
    }

    private fun printNetwork(call: PluginCall, printerIp: String, printerPort: Int, receiptBytes: ByteArray) {
        Thread {
            var lastError: String? = null
            var success = false

            for (attempt in 0..MAX_RETRIES) {
                try {
                    val localIp = getLocalIpAddress()
                    val sameSubnet = isSameSubnet(localIp, printerIp)
                    android.util.Log.d("ThermalPrinter",
                        "Attempt ${attempt + 1}/$MAX_RETRIES | " +
                        "Tablet IP: $localIp | Printer: $printerIp:$printerPort | " +
                        "Same subnet: $sameSubnet"
                    )

                    sendToPrinter(printerIp, printerPort, receiptBytes)
                    success = true
                    break
                } catch (e: java.net.SocketTimeoutException) {
                    lastError = "Printer offline or timed out. Make sure the printer is on and connected to the same network."
                } catch (e: java.net.ConnectException) {
                    lastError = "Cannot reach printer at $printerIp:$printerPort. If you are on 'Khukuri Restaurant' WiFi, ensure both routers share the same LAN."
                } catch (e: Exception) {
                    lastError = "Print error: ${e.message}"
                }

                if (attempt < MAX_RETRIES) {
                    val delay = RETRY_DELAYS_MS.getOrElse(attempt) { 5000L }
                    Thread.sleep(delay)
                }
            }

            if (success) {
                val result = JSObject()
                result.put("success", true)
                call.resolve(result)
            } else {
                resolveError(call, lastError ?: "Unknown printer error")
            }
        }.start()
    }

    private fun sendToPrinter(ip: String, port: Int, data: ByteArray) {
        val socket = Socket()
        try {
            socket.connect(InetSocketAddress(ip, port), CONNECT_TIMEOUT_MS)
            socket.soTimeout = WRITE_TIMEOUT_MS
            val out: OutputStream = socket.getOutputStream()
            out.write(data)
            out.flush()
        } finally {
            try { socket.close() } catch (_: Exception) {}
        }
    }

    private fun resolveError(call: PluginCall, message: String) {
        val result = JSObject()
        result.put("success", false)
        result.put("error", message)
        call.resolve(result)
    }
}
