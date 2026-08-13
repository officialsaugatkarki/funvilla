const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const app = express();
const PORT = 8000;

// Update this to match your Windows printer share name!
const PRINTER_SHARE_NAME = "POS-76C"; 

app.use(cors());

// Parse raw binary data
app.use(express.raw({ type: 'application/octet-stream', limit: '10mb' }));

app.post('/print', (req, res) => {
  if (!req.body || req.body.length === 0) {
    return res.status(400).json({ error: 'No print data received' });
  }

  // 1. Write the raw ESC/POS bytes to a temporary file
  const tempFile = path.join(__dirname, 'temp_receipt.bin');
  fs.writeFileSync(tempFile, req.body);

  // 2. Execute the Windows copy command to send the binary file to the shared printer
  // Windows format: copy /B temp_receipt.bin "\\localhost\POS-76C"
  const command = `copy /B "${tempFile}" "\\\\localhost\\${PRINTER_SHARE_NAME}"`;
  
  console.log(`Executing print command: ${command}`);

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`Print error: ${error.message}`);
      return res.status(500).json({ error: 'Failed to print', details: error.message });
    }
    
    console.log(`Print success: ${stdout}`);
    res.json({ success: true, message: 'Receipt sent to printer' });
    
    // Clean up temp file
    try {
      fs.unlinkSync(tempFile);
    } catch (e) {}
  });
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`=================================================`);
  console.log(` Khukuri Restaurant Local Print Bridge Running! `);
  console.log(`=================================================`);
  console.log(`- Listening on http://127.0.0.1:${PORT}`);
  console.log(`- Target Printer Share: \\\\localhost\\${PRINTER_SHARE_NAME}`);
  console.log(`\nIMPORTANT:`);
  console.log(`1. Ensure your Windows printer is named "POS-76C".`);
  console.log(`2. You MUST share the printer in Windows:`);
  console.log(`   Settings -> Printers -> POS-76C -> Printer properties -> Sharing`);
  console.log(`   Check "Share this printer" and set Share name to "POS-76C"`);
  console.log(`=================================================`);
});
