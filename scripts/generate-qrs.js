import QRCode from "qrcode";
import fs from "fs";
import path from "path";

// Configuration
const BASE_URL = "https://your-production-domain.com/buzzer/join";
const TOTAL_TABLES = 20; // Change to final n count
const OUTPUT_DIR = path.join(process.cwd(), "qr_codes");

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function generate() {
  console.log(`Generating QR codes for ${TOTAL_TABLES} tables...\n`);

  for (let i = 1; i <= TOTAL_TABLES; i++) {
    // Generate UUID or predictable string for table_id
    // Note: If your DB uses strict UUIDs for table_id, you will need to fetch 
    // the actual UUIDs from your `tables` DB after you run the bulk create 
    // endpoint. For now, assuming you can use sequential strings or you will replace this.
    const tableId = `table-${String(i).padStart(2, "0")}`; 
    
    const url = `${BASE_URL}?table=${tableId}`;
    const filename = path.join(OUTPUT_DIR, `Table_${String(i).padStart(2, "0")}.png`);

    try {
      await QRCode.toFile(filename, url, {
        color: {
          dark: "#0F1B2D", // Nightsky navy
          light: "#FFFFFF" // White background
        },
        width: 300,
        margin: 2
      });
      console.log(`✅ Generated: Table ${i} -> ${filename}`);
    } catch (err) {
      console.error(`❌ Failed to generate Table ${i}:`, err);
    }
  }
  
  console.log("\n🎉 All QR codes generated successfully!");
}

generate();