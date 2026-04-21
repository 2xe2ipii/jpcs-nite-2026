const { createClient } = require("@supabase/supabase-js");
const QRCode = require("qrcode");
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

// Load environment variables from .env.local
require("dotenv").config({ path: path.join(process.cwd(), ".env.local") });

const BASE_URL = process.env.BASE_URL || "https://jpcs-nite-2026.vercel.app/buzzer/join";
const OUTPUT_DIR = path.join(process.cwd(), "qr_codes");

// Theme — Midnight and Gold
const MIDNIGHT = "#0F1B2D";
const GOLD = "#C9A84C";
const GOLD_LIGHT = "#E8C96A";
const WHITE = "#FFFFFF";

// Print dimensions (300 DPI)
// QR code itself will be 2x2 inches (600x600 pixels)
const QR_SIZE = 600; 
const CARD_W = 750; // ~2.5 inches
const CARD_H = 850; // ~2.8 inches

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function buildCardSvg(tableNumber, qrSize) {
  const qrX = (CARD_W - qrSize) / 2;
  const qrY = 60; // Margin from top
  const margin = 20;

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_W}" height="${CARD_H}" viewBox="0 0 ${CARD_W} ${CARD_H}">
  <defs>
    <linearGradient id="blueGold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${MIDNIGHT}"/>
      <stop offset="50%" stop-color="${GOLD}"/>
      <stop offset="100%" stop-color="${GOLD_LIGHT}"/>
    </linearGradient>
  </defs>

  <rect width="${CARD_W}" height="${CARD_H}" fill="${WHITE}"/>

  <!-- "Blue Gold" Border -->
  <rect x="${margin}" y="${margin}" width="${CARD_W - margin * 2}" height="${CARD_H - margin * 2}" 
        fill="none" stroke="url(#blueGold)" stroke-width="8"/>

  <!-- QR Placeholder (Top) -->
  <rect x="${qrX}" y="${qrY}" width="${qrSize}" height="${qrSize}" fill="${WHITE}"/>

  <!-- Table Number (Below QR) -->
  <text x="${CARD_W / 2}" y="${qrY + qrSize + 100}" text-anchor="middle"
        font-family="Georgia, serif"
        font-size="70" font-weight="bold" fill="${MIDNIGHT}">Table ${tableNumber}</text>
</svg>
`.trim();
}

async function renderCard(table) {
  const tableNumber = String(table.table_number);
  const url = `${BASE_URL}?table=${table.id}`;

  // Generate QR Buffer (2x2 inch at 300 DPI = 600px)
  const qrBuffer = await QRCode.toBuffer(url, {
    errorCorrectionLevel: "H",
    width: QR_SIZE,
    margin: 1,
    color: {
      dark: MIDNIGHT,
      light: WHITE,
    },
  });

  const cardSvg = buildCardSvg(tableNumber, QR_SIZE);
  const qrX = Math.round((CARD_W - QR_SIZE) / 2);
  const qrY = 60;

  const filename = path.join(OUTPUT_DIR, `Table_${tableNumber.padStart(2, "0")}.png`);

  await sharp(Buffer.from(cardSvg))
    .composite([{ input: qrBuffer, left: qrX, top: qrY }])
    .png({ compressionLevel: 9 })
    .toFile(filename);

  return filename;
}

async function generate() {
  console.log("Fetching tables from database...");

  const { data: tables, error } = await supabase
    .from("tables")
    .select("id, table_number")
    .order("table_number", { ascending: true });

  if (error) {
    console.error("Error fetching tables:", error);
    process.exit(1);
  }

  if (!tables || tables.length === 0) {
    console.error("No tables found in database.");
    process.exit(1);
  }

  console.log(`Generating ${tables.length} QR cards with "Blue Gold" border...\n`);

  for (const table of tables) {
    try {
      const filename = await renderCard(table);
      console.log(`✅ Table ${table.table_number} -> ${path.basename(filename)}`);
    } catch (err) {
      console.error(`❌ Failed for Table ${table.table_number}:`, err);
    }
  }

  console.log(`\n🎉 Done. Output: ${OUTPUT_DIR}`);
}

generate();
