# Khukuri Restaurant — Local Print Bridge

This is a lightweight local service that runs on your Windows laptop (or desktop POS).

It receives raw ESC/POS receipt bytes from the cloud Web POS and sends them **directly to the ST-701UL printer via TCP on port 9100** — no Windows printer sharing required.

## How it works

```
Web POS (Vercel cloud)
  → POST http://127.0.0.1:8000/print  (ESC/POS bytes)
  → This Node.js bridge
  → TCP 192.168.1.127:9100
  → ST-701UL printer
```

No `copy /B`, no Windows printer sharing, no driver dependency.
The printer IP and port are hardcoded to `192.168.1.127:9100`.

---

## Requirements

- **Node.js** installed on the Windows machine.
  Download from [https://nodejs.org/](https://nodejs.org/) if not installed.
- The POS laptop must be on the same local network as the printer.
- The printer must be reachable at `192.168.1.127:9100`.

---

## Installation (first time only)

1. Open **Command Prompt** or **PowerShell** in the `local-print-bridge` folder.
2. Run:
   ```cmd
   npm install
   ```

---

## Starting the bridge

```cmd
npm start
```

You should see:
```
=======================================================
  Khukuri Restaurant — Local Print Bridge
=======================================================
  Listening : http://127.0.0.1:8000
  Printer   : 192.168.1.127:9100 (ST-701UL)
=======================================================
  Leave this window open while using the POS.
  The Web POS will print receipts through this bridge.
=======================================================
```

**Leave this window open** while the POS is in use. When you click "Print Receipt" in the Web POS, the receipt will be sent through this bridge and print on the ST-701UL.

---

## Auto-start on Windows login (recommended)

Create a file called `start-bridge.bat` anywhere (e.g. your Desktop):

```bat
@echo off
cd /d "C:\path\to\local-print-bridge"
npm start
pause
```

Replace `C:\path\to\local-print-bridge` with the actual path.

To start automatically on login, press `Win + R`, type `shell:startup`, and copy the `.bat` file there.

---

## Troubleshooting

| Error | Fix |
|---|---|
| `ECONNREFUSED` | Printer is off or not ready |
| `EHOSTUNREACH` / `ENETUNREACH` | Laptop is not on the same network as the printer |
| `timed out` | Printer is powered on but not responding — check network cable / WiFi |
| "Could not connect to Local Print Bridge" | The bridge is not running — run `npm start` |

To verify the printer is reachable from your laptop, open PowerShell and run:
```powershell
Test-NetConnection -ComputerName 192.168.1.127 -Port 9100
```
If `TcpTestSucceeded` shows `True`, the printer is reachable and the bridge will work.
