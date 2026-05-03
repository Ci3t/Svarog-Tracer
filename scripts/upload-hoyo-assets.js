#!/usr/bin/env node
/**
 * Hoyo Assets Cloudinary Upload Script
 *
 * Uploads:
 * 1. Genshin images from D:\Coding\Assests Hoyo\genshin → svarog-tracer/game/genshin/
 * 2. WuWa images from D:\Coding\Assests Hoyo\wuwa → svarog-tracer/game/wuwa/
 *
 * Usage:
 *   node scripts/upload-hoyo-assets.js [genshin|wuwa|all]
 *
 * Requirements:
 *   - CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET in .env
 *   - Run from project root
 */

import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Configuration ──────────────────────────────────────────────────────────

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;

const BASE_FOLDER = "svarog-tracer";
const HOYO_BASE_DIR = "D:\\Coding\\Assests Hoyo";

// ── Validation ─────────────────────────────────────────────────────────────

if (!CLOUD_NAME || CLOUD_NAME === "your-cloud-name") {
  console.error("❌ CLOUDINARY_CLOUD_NAME not set in .env");
  process.exit(1);
}
if (!API_KEY || API_KEY === "your-api-key") {
  console.error("❌ CLOUDINARY_API_KEY not set in .env");
  process.exit(1);
}
if (!API_SECRET || API_SECRET === "your-api-secret") {
  console.error("❌ CLOUDINARY_API_SECRET not set in .env");
  process.exit(1);
}

cloudinary.config({
  cloud_name: CLOUD_NAME,
  api_key: API_KEY,
  api_secret: API_SECRET,
});

// ── Helpers ────────────────────────────────────────────────────────────────

const assetMap = {};

function addToMap(key, secureUrl) {
  assetMap[key] = secureUrl;
}

async function uploadLocalFile(filePath, targetFolder) {
  const folderPath = `${BASE_FOLDER}/${targetFolder}`;
  const fileName = path.basename(filePath, path.extname(filePath));
  const fullPublicId = `${folderPath}/${fileName}`;

  try {
    const existing = await cloudinary.api.resource(fullPublicId, { resource_type: "auto" }).catch(() => null);
    if (existing) {
      console.log(`  ⏭️  Skip (exists): ${fullPublicId}`);
      addToMap(`${targetFolder}/${path.basename(filePath)}`, existing.secure_url);
      return existing.secure_url;
    }
  } catch {}

  const result = await cloudinary.uploader.upload(filePath, {
    folder: folderPath,
    public_id: fileName,
    overwrite: false,
    resource_type: "auto",
    eager: [{ fetch_format: "auto", quality: "auto" }],
  });
  console.log(`  ✅ Uploaded: ${fullPublicId}`);
  addToMap(`${targetFolder}/${path.basename(filePath)}`, result.secure_url);
  return result.secure_url;
}

function* walkDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walkDir(fullPath);
    } else {
      yield fullPath;
    }
  }
}

// ── Upload Functions ───────────────────────────────────────────────────────

async function uploadGameAssets(gameFolder, cloudFolder) {
  const sourceDir = path.join(HOYO_BASE_DIR, gameFolder);
  if (!fs.existsSync(sourceDir)) {
    console.error(`❌ Source directory not found: ${sourceDir}`);
    return;
  }

  console.log(`\n🎮 Uploading ${gameFolder.toUpperCase()} assets from ${sourceDir}...\n`);

  const files = [...walkDir(sourceDir)];
  console.log(`  Found ${files.length} files\n`);

  for (const filePath of files) {
    const ext = path.extname(filePath).toLowerCase();
    // Only upload image files
    if (!['.png', '.jpg', '.jpeg', '.webp', '.gif'].includes(ext)) continue;

    // Skip empty files (like the Rover file)
    const stat = fs.statSync(filePath);
    if (stat.size === 0) {
      console.log(`  ⚠️  Skip (empty): ${path.basename(filePath)}`);
      continue;
    }

    try {
      await uploadLocalFile(filePath, cloudFolder);
    } catch (err) {
      console.error(`  ❌ Failed: ${path.basename(filePath)} — ${err.message}`);
    }
  }
}

function writeAssetMap(gameFolder) {
  const outputPath = path.join(__dirname, "..", "src", "generated", `cloudinary-${gameFolder}-map.js`);
  const gameAssets = Object.entries(assetMap)
    .filter(([k]) => k.startsWith(`${gameFolder}/`))
    .reduce((acc, [k, v]) => {
      acc[k.replace(`${gameFolder}/`, "")] = v;
      return acc;
    }, {});

  const content = `// Auto-generated Cloudinary asset map for ${gameFolder}
// Generated: ${new Date().toISOString()}

export const ${gameFolder.toUpperCase()}_ASSET_MAP = ${JSON.stringify(gameAssets, null, 2)};

export function get${gameFolder.charAt(0).toUpperCase() + gameFolder.slice(1)}AssetUrl(filename) {
  return ${gameFolder.toUpperCase()}_ASSET_MAP[filename] || null;
}
`;

  fs.writeFileSync(outputPath, content);
  console.log(`\n📝 Asset map written to ${outputPath} (${Object.keys(gameAssets).length} entries)`);
}

// ── Main ───────────────────────────────────────────────────────────────────

const target = process.argv[2] || "all";

async function main() {
  console.log("☁️  Hoyo Assets Cloudinary Upload");
  console.log(`   Cloud: ${CLOUD_NAME}`);
  console.log(`   Source: ${HOYO_BASE_DIR}`);

  if (target === "genshin" || target === "all") {
    await uploadGameAssets("genshin", "genshin");
    writeAssetMap("genshin");
  }

  if (target === "wuwa" || target === "all") {
    await uploadGameAssets("wuwa", "wuwa");
    writeAssetMap("wuwa");
  }

  console.log("\n✅ Done!");
}

main().catch((err) => {
  console.error("\n💥 Fatal error:", err);
  process.exit(1);
});
