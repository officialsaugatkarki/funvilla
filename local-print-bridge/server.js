/**
 * Khukuri Restaurant — Local Print Bridge
 *
 * Runs on the Windows POS laptop at http://127.0.0.1:8000
 *
 * Receives raw ESC/POS bytes from the cloud POS (POST /print)
 * and sends them directly to the ST-701UL printer via TCP on port 9100.
 *
 * No Windows printer sharing, no copy /B, no driver dependency.
 * Data path:
 *   Browser (vercel) → POST http://127.0.0.1:8000/print → this server → TCP → 192.168.1.127:9100 → ST-701UL
 */

const express = require('express');
const cors    = require('cors');
const net     = require('net');

const app = express();
const PORT         = 8000;
const PRINTER_IP   = '192.168.1.127';
const PRINTER_PORT = 9100;
const TCP_TIMEOUT  = 8000;   // 8 seconds per attempt
const TCP_RETRIES  = 1;      // one retry on failure

app.use(cors());

// Accept raw binary ESC/POS data
app.use(express.raw({ type: 'application/octet-stream', limit: '10mb' }));

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    printer: `${PRINTER_IP}:${PRINTER_PORT}`,
    message: 'Khukuri Restaurant Local Print Bridge is running.',
  });
});

// ── Print endpoint ────────────────────────────────────────────────────────────
app.post('/print', async (req, res) => {
  if (!req.body || req.body.length === 0) {
    return res.status(400).json({ error: 'No print data received' });
  }

  console.log(`[bridge] Received ${req.body.length} bytes — sending to ${PRINTER_IP}:${PRINTER_PORT}`);

  const result = await tcpPrint(req.body);

  if (!result.ok) {
    console.error(`[bridge] TCP print FAILED: ${result.error}`);
    return res.status(502).json({ error: result.error });
  }

  console.log(`[bridge] Print sent successfully (attempt ${result.attempt})`);
  res.json({ success: true, attempt: result.attempt });
});

// ── TCP printer transport ─────────────────────────────────────────────────────
function tcpPrint(data) {
  return new Promise((resolve) => {
    let attempt = 0;

    function tryOnce() {
      attempt++;
      let settled = false;

      const socket = new net.Socket();

      const fail = (err) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        socket.destroy();
        const msg = err.code === 'ECONNREFUSED'
          ? `Printer at ${PRINTER_IP}:${PRINTER_PORT} refused connection. Is the printer on?`
          : err.code === 'EHOSTUNREACH' || err.code === 'ENETUNREACH'
          ? `Printer at ${PRINTER_IP}:${PRINTER_PORT} is unreachable. Check the network.`
          : err.code === 'ETIMEDOUT' || err.message.includes('timed out')
          ? `Printer at ${PRINTER_IP}:${PRINTER_PORT} timed out. Check printer is on and reachable.`
          : err.message;

        if (attempt <= TCP_RETRIES) {
          console.warn(`[bridge] Attempt ${attempt} failed (${msg}) — retrying in 500ms…`);
          setTimeout(tryOnce, 500);
        } else {
          resolve({ ok: false, error: msg });
        }
      };

      const succeed = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        socket.destroy();
        resolve({ ok: true, attempt });
      };

      const timer = setTimeout(() => {
        fail(new Error(`timed out after ${TCP_TIMEOUT}ms`));
      }, TCP_TIMEOUT);

      socket.once('error', fail);

      socket.connect(PRINTER_PORT, PRINTER_IP, () => {
        socket.write(data, (writeErr) => {
          if (writeErr) {
            fail(writeErr);
          } else {
            // Give the printer 200ms to close the socket before we do
            setTimeout(succeed, 200);
          }
        });
      });
    }

    tryOnce();
  });
}

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, '127.0.0.1', () => {
  console.log('');
  console.log('=======================================================');
  console.log('  Khukuri Restaurant — Local Print Bridge');
  console.log('=======================================================');
  console.log(`  Listening : http://127.0.0.1:${PORT}`);
  console.log(`  Printer   : ${PRINTER_IP}:${PRINTER_PORT} (ST-701UL)`);
  console.log('=======================================================');
  console.log('  Leave this window open while using the POS.');
  console.log('  The Web POS will print receipts through this bridge.');
  console.log('=======================================================');
  console.log('');
});
