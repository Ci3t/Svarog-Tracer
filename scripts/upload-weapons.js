#!/usr/bin/env node
/**
 * Weapon Assets Cloudinary Upload Script
 *
 * Uploads:
 * 1. WuWa weapons from D:\Coding\Assests Hoyo\wuwa_weps → svarog-tracer/wuwa_weapons/
 * 2. Genshin weapons from D:\Coding\Assests Hoyo\genshin_weps → svarog-tracer/genshin_weapons/
 *
 * Usage:
 *   node scripts/upload-weapons.js [wuwa|genshin|all]
 */

import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;
const BASE_FOLDER = "svarog-tracer";
const HOYO_BASE_DIR = "D:\\Coding\\Assests Hoyo";

if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
  console.error("❌ Cloudinary credentials not set in .env");
  process.exit(1);
}

cloudinary.config({ cloud_name: CLOUD_NAME, api_key: API_KEY, api_secret: API_SECRET });

const assetMap = {};

async function uploadFile(filePath, targetFolder) {
  const folderPath = `${BASE_FOLDER}/${targetFolder}`;
  const fileName = path.basename(filePath, path.extname(filePath));
  const fullPublicId = `${folderPath}/${fileName}`;

  try {
    const existing = await cloudinary.api.resource(fullPublicId, { resource_type: "auto" }).catch(() => null);
    if (existing) {
      console.log(`  ⏭️  Skip (exists): ${fullPublicId}`);
      assetMap[`${targetFolder}/${path.basename(filePath)}`] = existing.secure_url;
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
  assetMap[`${targetFolder}/${path.basename(filePath)}`] = result.secure_url;
  return result.secure_url;
}

async function uploadWeapons(sourceFolder, cloudFolder) {
  const sourceDir = path.join(HOYO_BASE_DIR, sourceFolder);
  if (!fs.existsSync(sourceDir)) {
    console.error(`❌ Source directory not found: ${sourceDir}`);
    return;
  }

  console.log(`\n🔫 Uploading ${sourceFolder} weapons...\n`);
  const files = fs.readdirSync(sourceDir).filter(f => /\.(png|jpg|jpeg|webp)$/i.test(f));
  console.log(`  Found ${files.length} files\n`);

  for (const file of files) {
    const filePath = path.join(sourceDir, file);
    if (fs.statSync(filePath).size === 0) continue;
    try {
      await uploadFile(filePath, cloudFolder);
    } catch (err) {
      console.error(`  ❌ Failed: ${file} — ${err.message}`);
    }
  }
}

function writeMap(game, mapName, getterName) {
  const outputPath = path.join(__dirname, "..", "src", "generated", `cloudinary-${game}-weapons-map.js`);
  const gameAssets = Object.entries(assetMap)
    .filter(([k]) => k.startsWith(`${game}_weapons/`))
    .reduce((acc, [k, v]) => {
      acc[k.replace(`${game}_weapons/`, "")] = v;
      return acc;
    }, {});

  const content = `// Auto-generated Cloudinary weapon map for ${game}
// Generated: ${new Date().toISOString()}

export const ${mapName} = ${JSON.stringify(gameAssets, null, 2)};

export function ${getterName}(filename) {
  return ${mapName}[filename] || null;
}
`;

  fs.writeFileSync(outputPath, content);
  console.log(`\n📝 Weapon map written to ${outputPath} (${Object.keys(gameAssets).length} entries)`);
}

const target = process.argv[2] || "all";

async function main() {
  console.log("☁️  Weapon Assets Cloudinary Upload");
  console.log(`   Cloud: ${CLOUD_NAME}`);

  if (target === "wuwa" || target === "all") {
    await uploadWeapons("wuwa_weps", "wuwa_weapons");
    writeMap("wuwa", "WUWA_WEAPON_MAP", "getWuwaWeaponUrl");
  }

  if (target === "genshin" || target === "all") {
    await uploadWeapons("genshin_weps", "genshin_weapons");
    writeMap("genshin", "GENSHIN_WEAPON_MAP", "getGenshinWeaponUrl");
  }

  console.log("\n✅ Done!");
}

main().catch((err) => {
  console.error("\n💥 Fatal error:", err);
  process.exit(1);
});
