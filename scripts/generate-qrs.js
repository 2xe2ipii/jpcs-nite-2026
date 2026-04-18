const { createClient } = require('@supabase/supabase-js');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

// Configuration
// Change this to your actual production domain when ready
const BASE_URL = process.env.BASE_URL || "https://jpcs-nite-2026.vercel.app/buzzer/join";
const OUTPUT_DIR = path.join(process.cwd(), "qr_codes");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function generate() {
  console.log("Fetching tables from database...");

  const { data: tables, error } = await supabase
    .from('tables')
    .select('id, display_name, table_number')
    .order('table_number', { ascending: true });

  if (error) {
    console.error('Error fetching tables:', error);
    process.exit(1);
  }

  if (!tables || tables.length === 0) {
    console.error('No tables found in database. Run seed-tables.js first.');
    process.exit(1);
  }

  console.log(`Generating QR codes for ${tables.length} tables...\n`);

  for (const table of tables) {
    const url = `${BASE_URL}?table=${table.id}`;
    const filename = path.join(OUTPUT_DIR, `Table_${String(table.table_number).padStart(2, "0")}.png`);

    try {
      await QRCode.toFile(filename, url, {
        color: {
          dark: "#0F1B2D", // Nightsky navy
          light: "#FFFFFF" // White background
        },
        width: 1000, // Higher resolution for printing
        margin: 4
      });
      console.log(`✅ Generated: ${table.display_name} (ID: ${table.id}) -> ${filename}`);
    } catch (err) {
      console.error(`❌ Failed to generate ${table.display_name}:`, err);
    }
  }
  
  console.log("\n🎉 All QR codes generated successfully!");
}

generate();
