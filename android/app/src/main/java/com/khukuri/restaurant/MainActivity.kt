package com.khukuri.restaurant

import android.os.Bundle
import com.getcapacitor.BridgeActivity

/**
 * MainActivity.kt
 *
 * Entry point for the Capacitor Android app.
 * Registers the custom ThermalPrinterPlugin so JavaScript can call it
 * via Capacitor's native bridge.
 */
class MainActivity : BridgeActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        // Register all custom plugins BEFORE calling super.onCreate
        registerPlugin(ThermalPrinterPlugin::class.java)
        super.onCreate(savedInstanceState)

        // Enhance native feel by disabling WebView overscroll and zoom
        val webView = this.bridge.webView
        webView.overScrollMode = android.view.View.OVER_SCROLL_NEVER
        
        val settings = webView.settings
        settings.builtInZoomControls = false
        settings.displayZoomControls = false
        settings.setSupportZoom(false)
    }
}
