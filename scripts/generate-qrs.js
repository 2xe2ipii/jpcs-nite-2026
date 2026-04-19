const { createClient } = require("@supabase/supabase-js");
const QRCode = require("qrcode");
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

// Load environment variables from .env.local
require("dotenv").config({ path: path.join(process.cwd(), ".env.local") });

const BASE_URL = process.env.BASE_URL || "https://jpcs-nite-2026.vercel.app/buzzer/join";
const OUTPUT_DIR = path.join(process.cwd(), "qr_codes");

// Theme — matches /display "Nightsky of Golden Dreams"
const MIDNIGHT = "#0F1B2D";
const MIDNIGHT_DEEP = "#070E1A";
const GOLD = "#C9A84C";
const GOLD_LIGHT = "#E8C96A";
const WHITE = "#FFFFFF";

// Print dimensions (4:5 portrait, high-DPI for letter-size printing)
const CARD_W = 1200;
const CARD_H = 1500;
const QR_SIZE = 820;

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

function buildCardSvg(tableNumberLabel, qrSize) {
  const qrX = (CARD_W - qrSize) / 2;
  const qrY = 340;
  const plateW = qrSize + 80;
  const plateH = qrSize + 80;
  const plateX = (CARD_W - plateW) / 2;
  const plateY = qrY - 40;

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_W}" height="${CARD_H}" viewBox="0 0 ${CARD_W} ${CARD_H}">
  <defs>
    <radialGradient id="bg" cx="50%" cy="0%" r="80%">
      <stop offset="0%" stop-color="${MIDNIGHT}"/>
      <stop offset="100%" stop-color="${MIDNIGHT_DEEP}"/>
    </radialGradient>
    <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${GOLD}"/>
      <stop offset="50%" stop-color="${GOLD_LIGHT}"/>
      <stop offset="100%" stop-color="${GOLD}"/>
    </linearGradient>
  </defs>

  <rect width="${CARD_W}" height="${CARD_H}" fill="url(#bg)"/>

  <!-- Outer gold frame -->
  <rect x="30" y="30" width="${CARD_W - 60}" height="${CARD_H - 60}" fill="none" stroke="url(#gold)" stroke-width="4"/>
  <rect x="50" y="50" width="${CARD_W - 100}" height="${CARD_H - 100}" fill="none" stroke="${GOLD}" stroke-width="1" opacity="0.5"/>

  <!-- Header ornament -->
  <line x1="200" y1="160" x2="${CARD_W - 200}" y2="160" stroke="${GOLD}" stroke-width="1" opacity="0.6"/>
  <circle cx="${CARD_W / 2}" cy="160" r="6" fill="${GOLD}"/>

  <!-- Event title -->
  <text x="${CARD_W / 2}" y="130" text-anchor="middle"
        font-family="Georgia, 'Times New Roman', serif"
        font-size="48" font-weight="bold" fill="url(#gold)"
        letter-spacing="8">JPCS NITE 2026</text>

  <text x="${CARD_W / 2}" y="220" text-anchor="middle"
        font-family="Georgia, serif"
        font-size="24" font-style="italic" fill="${WHITE}" opacity="0.75"
        letter-spacing="4">Nightsky of Golden Dreams</text>

  <text x="${CARD_W / 2}" y="280" text-anchor="middle"
        font-family="'Helvetica Neue', Arial, sans-serif"
        font-size="18" fill="${GOLD_LIGHT}"
        letter-spacing="6">APRIL 21  •  DLSL SENTRUM</text>

  <!-- QR plate (white rounded card behind QR) -->
  <rect x="${plateX}" y="${plateY}" width="${plateW}" height="${plateH}" rx="24" ry="24"
        fill="${WHITE}" stroke="${GOLD}" stroke-width="3"/>

  <!-- QR placeholder (composited by sharp) -->
  <rect x="${qrX}" y="${qrY}" width="${qrSize}" height="${qrSize}" fill="${WHITE}"/>

  <!-- Bottom ornament -->
  <line x1="200" y1="${CARD_H - 280}" x2="${CARD_W - 200}" y2="${CARD_H - 280}" stroke="${GOLD}" stroke-width="1" opacity="0.6"/>
  <circle cx="${CARD_W / 2}" cy="${CARD_H - 280}" r="6" fill="${GOLD}"/>

  <!-- TABLE N -->
  <text x="${CARD_W / 2}" y="${CARD_H - 180}" text-anchor="middle"
        font-family="Georgia, serif"
        font-size="110" font-weight="bold" fill="url(#gold)"
        letter-spacing="12">TABLE ${tableNumberLabel}</text>

  <!-- Tagline -->
  <text x="${CARD_W / 2}" y="${CARD_H - 100}" text-anchor="middle"
        font-family="'Helvetica Neue', Arial, sans-serif"
        font-size="22" fill="${WHITE}" opacity="0.8"
        letter-spacing="4">SCAN TO JOIN THE BUZZER</text>
</svg>
`.trim();
}

async function renderCard(table) {
  const tableNumberLabel = String(table.table_number).padStart(2, "0");
  const url = `${BASE_URL}?table=${table.id}`;

  // Gold QR modules on white background (card), high error correction for decorative margin
  const qrBuffer = await QRCode.toBuffer(url, {
    errorCorrectionLevel: "H",
    width: QR_SIZE,
    margin: 2,
    color: {
      dark: MIDNIGHT,
      light: WHITE,
    },
  });

  const cardSvg = buildCardSvg(tableNumberLabel, QR_SIZE);
  const qrX = Math.round((CARD_W - QR_SIZE) / 2);
  const qrY = 340;

  const filename = path.join(OUTPUT_DIR, `Table_${tableNumberLabel}.png`);

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
    .select("id, display_name, table_number")
    .order("table_number", { ascending: true });

  if (error) {
    console.error("Error fetching tables:", error);
    process.exit(1);
  }

  if (!tables || tables.length === 0) {
    console.error("No tables found in database. Run seed-tables.js first.");
    process.exit(1);
  }

  console.log(`Generating themed QR cards for ${tables.length} tables...\n`);

  for (const table of tables) {
    try {
      const filename = await renderCard(table);
      console.log(`✅ ${table.display_name} -> ${path.basename(filename)}`);
    } catch (err) {
      console.error(`❌ Failed for ${table.display_name}:`, err);
    }
  }

  console.log(`\n🎉 Done. Output: ${OUTPUT_DIR}`);
}

generate();
