#!/usr/bin/env node
/**
 * Auto-Upload Game Assets to Cloudinary
 * Scans local asset folders, uploads missing files, regenerates maps.
 * Usage: node scripts/auto-upload-assets.js [game|all]
 *   game: hsr|genshin|wuwa|all
 */

import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const BASE_FOLDER = "svarog-tracer";
const ASSETS_BASE = "D:\\Coding\\Assests Hoyo";

const GAMES = {
  hsr: {
    localDir: null, // HSR assets come from GitHub, not local folder
    cloudinaryPrefix: `${BASE_FOLDER}/game/hsr`,
    mapFile: "cloudinary-map.js",
    mapExport: "CLOUDINARY_MAP",
  },
  genshin: {
    localDir: path.join(ASSETS_BASE, "genshin"),
    cloudinaryPrefix: `${BASE_FOLDER}/genshin`,
    mapFile: "cloudinary-genshin-map.js",
    mapExport: "GENSHIN_ASSET_MAP",
  },
  wuwa: {
    localDir: path.join(ASSETS_BASE, "wuwa"),
    cloudinaryPrefix: `${BASE_FOLDER}/wuwa`,
    mapFile: "cloudinary-wuwa-map.js",
    mapExport: "WUWA_ASSET_MAP",
  },
};

// ── Utilities ────────────────────────────────────────────────────────

async function listCloudinaryResources(prefix) {
  const resources = [];
  let nextCursor = null;
  do {
    try {
      const result = await cloudinary.api.resources({
        type: "upload",
        prefix: prefix,
        max_results: 500,
        next_cursor: nextCursor,
      });
      resources.push(...result.resources);
      nextCursor = result.next_cursor;
    } catch (e) {
      console.error(`  ❌ Error listing Cloudinary resources:`, e.message);
      break;
    }
  } while (nextCursor);
  return resources;
}

function getLocalFiles(dir) {
  const files = [];
  if (!fs.existsSync(dir)) return files;

  function walk(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (/\.(png|webp|jpg|jpeg)$/i.test(entry.name)) {
        files.push(fullPath);
      }
    }
  }
  walk(dir);
  return files;
}

async function uploadFile(filePath, cloudinaryPath) {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: path.dirname(cloudinaryPath),
      public_id: path.basename(cloudinaryPath, path.extname(cloudinaryPath)),
      overwrite: true,
      resource_type: "image",
    });
    return { success: true, url: result.secure_url, publicId: result.public_id };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function writeAssetMap(mapFile, exportName, assetMap) {
  const outputPath = path.join(__dirname, "..", "src", "generated", mapFile);
  const content = `// Auto-generated Cloudinary asset map
// Generated: ${new Date().toISOString()}

export const ${exportName} = ${JSON.stringify(assetMap, null, 2)};

export function getAssetUrl(filename) {
  return ${exportName}[filename] || null;
}
`;
  fs.writeFileSync(outputPath, content);
  console.log(`  📝 Map written: ${outputPath} (${Object.keys(assetMap).length} entries)`);
}

// ── Main ─────────────────────────────────────────────────────────────

async function processGame(gameKey) {
  const config = GAMES[gameKey];
  if (!config) {
    console.error(`Unknown game: ${gameKey}`);
    return;
  }

  // Skip HSR (managed by upload-to-cloudinary.js via GitHub)
  if (gameKey === "hsr") {
    console.log("\n⚠️  HSR assets are managed by scripts/upload-to-cloudinary.js");
    console.log("   Run: node scripts/upload-to-cloudinary.js");
    return;
  }

  console.log(`\n🎮 Processing ${gameKey.toUpperCase()}...`);
  console.log(`  Local: ${config.localDir}`);
  console.log(`  Cloudinary prefix: ${config.cloudinaryPrefix}`);

  if (!fs.existsSync(config.localDir)) {
    console.error(`  ❌ Local directory not found: ${config.localDir}`);
    return;
  }

  // 1. Get Cloudinary existing files
  console.log("  📂 Listing Cloudinary resources...");
  const cloudResources = await listCloudinaryResources(config.cloudinaryPrefix);
  const cloudFiles = new Map(); // filename (no ext) -> public_id
  for (const r of cloudResources) {
    const baseName = path.basename(r.public_id);
    cloudFiles.set(baseName.toLowerCase(), r.public_id);
  }
  console.log(`     Found ${cloudResources.length} existing`);

  // 2. Get local files
  const localFiles = getLocalFiles(config.localDir);
  console.log(`  📁 Local files: ${localFiles.length}`);

  // 3. Find missing and upload
  let uploaded = 0;
  let failed = 0;
  const assetMap = {};

  for (const localPath of localFiles) {
    const fileName = path.basename(localPath);
    const baseName = path.basename(localPath, path.extname(localPath));
    const relativeDir = path.relative(config.localDir, path.dirname(localPath));
    const cloudPath = relativeDir
      ? `${config.cloudinaryPrefix}/${relativeDir.replace(/\\/g, "/")}/${baseName}`
      : `${config.cloudinaryPrefix}/${baseName}`;

    // Check if already exists (case-insensitive)
    const exists = cloudFiles.has(baseName.toLowerCase());

    if (!exists) {
      console.log(`  ⬆️  Uploading: ${fileName}`);
      const result = await uploadFile(localPath, cloudPath);
      if (result.success) {
        uploaded++;
        assetMap[fileName] = result.url;
        console.log(`     ✅ ${result.url.substring(0, 80)}...`);
      } else {
        failed++;
        console.log(`     ❌ ${result.error}`);
      }
    } else {
      // Already exists — use existing URL
      const existing = cloudResources.find(r =>
        path.basename(r.public_id).toLowerCase() === baseName.toLowerCase()
      );
      if (existing) {
        assetMap[fileName] = existing.secure_url;
      }
    }
  }

  console.log(`  📊 Upload result: ${uploaded} new, ${failed} failed, ${localFiles.length - uploaded - failed} existing`);

  // 4. Regenerate map
  if (Object.keys(assetMap).length > 0) {
    writeAssetMap(config.mapFile, config.mapExport, assetMap);
  }

  return { uploaded, failed, total: localFiles.length };
}

async function main() {
  const game = process.argv[2] || "all";
  const targets = game === "all" ? ["genshin", "wuwa"] : [game];

  console.log("☁️  Auto-Upload Game Assets to Cloudinary");
  console.log(`   Targets: ${targets.join(", ")}`);

  let totalUploaded = 0;
  for (const g of targets) {
    const result = await processGame(g);
    if (result) totalUploaded += result.uploaded;
  }

  console.log(`\n✅ Done! Total new uploads: ${totalUploaded}`);
}

main().catch(err => {
  console.error("\n💥 Fatal error:", err);
  process.exit(1);
});
