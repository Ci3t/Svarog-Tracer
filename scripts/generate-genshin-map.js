#!/usr/bin/env node
/**
 * Generate Genshin asset map from existing Cloudinary resources
 * WITHOUT re-uploading anything
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
const OUTPUT_MAP = path.join(__dirname, "..", "src", "generated", "cloudinary-genshin-map.js");

async function listResources(prefix) {
  console.log(`📂 Listing resources under ${prefix}...`);
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
      console.error("  ❌ Error listing:", e.message);
      break;
    }
  } while (nextCursor);
  
  console.log(`  Found ${resources.length} resources`);
  return resources;
}

async function main() {
  console.log("☁️  Generating Genshin asset map from existing Cloudinary resources\n");
  
  const resources = await listResources(`${BASE_FOLDER}/genshin/`);
  
  if (resources.length === 0) {
    console.error("\n❌ No resources found at svarog-tracer/genshin/!");
    process.exit(1);
  }
  
  // Build map
  const assetMap = {};
  for (const r of resources) {
    const fileName = r.public_id.replace(`${BASE_FOLDER}/genshin/`, "");
    const ext = path.extname(r.secure_url) || `.${r.format}`;
    assetMap[fileName + ext] = r.secure_url;
  }
  
  // Also create normalized lookup keys (lowercase, no underscores)
  const normalizedMap = {};
  for (const [key, url] of Object.entries(assetMap)) {
    const baseName = key.replace(/_icon\.\w+$/, '').replace(/_splash\.\w+$/, '').replace(/_Full_splash\.\w+$/, '');
    const normalized = baseName.toLowerCase().replace(/_/g, '');
    if (!normalizedMap[normalized]) normalizedMap[normalized] = {};
    if (key.includes('_icon')) normalizedMap[normalized].icon = url;
    else if (key.includes('_splash')) normalizedMap[normalized].splash = url;
  }
  
  // Write map
  const content = `// Auto-generated Cloudinary asset map for genshin
// Generated: ${new Date().toISOString()}
// Source: Existing resources in svarog-tracer/genshin/

export const GENSHIN_ASSET_MAP = ${JSON.stringify(assetMap, null, 2)};

export const GENSHIN_NORMALIZED_MAP = ${JSON.stringify(normalizedMap, null, 2)};

export function getGenshinAssetUrl(filename) {
  return GENSHIN_ASSET_MAP[filename] || null;
}

export function getGenshinCharacterUrl(name, type = 'splash') {
  if (!name) return null;
  const normalized = name.toLowerCase().replace(/\s+/g, '').replace(/_/g, '').replace(/[^a-z0-9]/g, '');
  const entry = GENSHIN_NORMALIZED_MAP[normalized];
  if (!entry) return null;
  return type === 'icon' ? entry.icon : (entry.splash || entry.icon);
}
`;
  
  fs.writeFileSync(OUTPUT_MAP, content);
  console.log(`\n📝 Asset map written to ${OUTPUT_MAP}`);
  console.log(`   Total entries: ${Object.keys(assetMap).length}`);
  console.log(`   Normalized characters: ${Object.keys(normalizedMap).length}`);
  
  console.log("\n✅ Done!");
}

main().catch((err) => {
  console.error("\n💥 Fatal error:", err);
  process.exit(1);
});
