import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  // Unique app identifier (matches Android package name)
  appId: 'com.khukuri.restaurant',

  // Display name shown on the Android home screen
  appName: 'Khukuri Restaurant',

  // Where the bundled web assets live (used for local mode)
  webDir: 'out',

  // ── Server override ────────────────────────────────────────────────────────
  // The WebView loads from the live Next.js server instead of bundled files.
  // This preserves Server Actions, Supabase SSR auth, Middleware-based RBAC,
  // and all API routes — none of which can run in a static bundle.
  //
  // Change this to your production URL or local LAN server IP.
  server: {
    url: 'https://khukurirestaurantfunvilla.vercel.app',
    cleartext: false,
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#1a1a2e',
      androidSplashResourceName: 'splash',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#1a1a2e',
    },
  },

  android: {
    // Allows cleartext (HTTP) traffic — set to true only for local LAN dev
    allowMixedContent: false,
    // Capture console.log from WebView into Android logcat
    loggingBehavior: 'debug',
  },
}

export default config
