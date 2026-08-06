/**
 * tcp-printer.ts
 *
 * Opens a raw TCP socket to an ESC/POS network printer, sends data, and closes.
 *
 * Runs in Node.js (Next.js API route) only — never in the browser.
 *
 * Features:
 *  - One retry on connection failure (requirement #11)
 *  - Configurable timeout (default 5 s) so hung printers don't block forever
 *  - Clean error messages distinguishing "offline" from "send failure"
 */

import net from 'net'

export interface TcpPrintOptions {
  host: string
  port: number
  data: Buffer
  /** Connection + write timeout in milliseconds. Default: 5000 */
  timeoutMs?: number
  /** Number of additional attempts after the first failure. Default: 1 */
  retries?: number
}

export interface TcpPrintResult {
  success: boolean
  error?: string
  attempt?: number  // which attempt succeeded (1 = first, 2 = retry)
}

/**
 * Send raw bytes to an ESC/POS printer over TCP.
 * Retries once on failure.
 */
export async function tcpPrint(options: TcpPrintOptions): Promise<TcpPrintResult> {
  const { host, port, data, timeoutMs = 5000, retries = 1 } = options
  const maxAttempts = retries + 1

  let lastError = ''

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await sendOnce(host, port, data, timeoutMs)
      return { success: true, attempt }
    } catch (err: any) {
      lastError = err?.message ?? 'Unknown TCP error'
      console.warn(`[tcp-printer] Attempt ${attempt}/${maxAttempts} failed: ${lastError}`)

      // Wait 500 ms before retrying
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, 500))
      }
    }
  }

  return { success: false, error: lastError }
}

/** Single TCP send attempt — returns a Promise that resolves on success */
function sendOnce(host: string, port: number, data: Buffer, timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket()
    let settled = false

    const fail = (err: Error) => {
      if (settled) return
      settled = true
      socket.destroy()
      reject(err)
    }

    const succeed = () => {
      if (settled) return
      settled = true
      socket.destroy()
      resolve()
    }

    // Overall timeout — fires if connect or write hangs
    const timer = setTimeout(() => {
      fail(new Error(`Printer at ${host}:${port} timed out after ${timeoutMs}ms`))
    }, timeoutMs)

    socket.once('error', (err) => {
      clearTimeout(timer)
      // Translate common POSIX errors into human-readable messages
      const msg = (err as any).code === 'ECONNREFUSED'
        ? `Printer at ${host}:${port} refused the connection. Check printer is on and port 9100 is open.`
        : (err as any).code === 'ECONNRESET'
        ? `Printer at ${host}:${port} reset the connection. Printer may be busy.`
        : (err as any).code === 'EHOSTUNREACH' || (err as any).code === 'ENETUNREACH'
        ? `Printer at ${host}:${port} is unreachable. Check network connection.`
        : err.message
      fail(new Error(msg))
    })

    socket.connect({ host, port }, () => {
      // Connected — send data
      socket.write(data, (writeErr) => {
        clearTimeout(timer)
        if (writeErr) {
          fail(writeErr)
        } else {
          // Some printers close the socket themselves after receiving data.
          // Give them 200 ms to do so, then destroy on our side.
          setTimeout(succeed, 200)
        }
      })
    })
  })
}
