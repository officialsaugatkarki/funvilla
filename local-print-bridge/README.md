# Khukuri Restaurant Local Print Bridge

This is a lightweight local service that runs on your Windows laptop. It receives raw ESC/POS receipt bytes from the cloud Web POS and routes them directly to your local Windows USB thermal printer (POS-76C).

## 1. Share the Windows Printer (Required)

For this bridge to send raw bytes to the printer, you must enable sharing on the printer in Windows:

1. Open **Settings** → **Bluetooth & devices** → **Printers & scanners**.
2. Click on **POS-76C**.
3. Click **Printer properties**.
4. Go to the **Sharing** tab.
5. Check the box for **Share this printer**.
6. Set the Share name to exactly: `POS-76C`.
7. Click **OK**.

## 2. Installation

You need Node.js installed on your laptop to run this service.
If you don't have Node.js installed, download and install it from [https://nodejs.org/](https://nodejs.org/).

1. Open a terminal (Command Prompt or PowerShell) in this folder (`local-print-bridge`).
2. Run this command to install the dependencies:
   ```cmd
   npm install
   ```

## 3. Running the Service

To start the bridge, run:

```cmd
npm start
```

Leave this terminal window open in the background while taking orders.

### To make it run automatically on startup:
You can create a small `.bat` file (e.g. `start-bridge.bat`) on your Desktop with this content:
```bat
cd "C:\path\to\your\local-print-bridge"
npm start
```
Double-click it whenever you start the POS laptop.

## How it works
- The Web POS (`https://khukurirestaurantfunvilla.vercel.app`) sends an HTTP POST request to `http://127.0.0.1:8000/print`.
- The data contains raw ESC/POS binary codes.
- This local bridge saves the bytes and uses the Windows `copy /B` command to send them directly to the `\\localhost\POS-76C` queue.
- The printer immediately prints the exact thermal format receipt.
