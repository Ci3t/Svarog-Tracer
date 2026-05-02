#!/usr/bin/env node
/**
 * Reorganize Cloudinary assets into proper folders
 *
 * Cloudinary public_id slashes don't create Media Library folders.
 * We need to explicitly set asset_folder for each asset.
 *
 * Usage:
 *   node scripts/reorganize-cloudinary-folders.js
 */

import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import { CLOUDINARY_MAP } from '../src/generated/cloudinary-map.js';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const BASE_FOLDER = 'svarog-tracer';

// Map asset_key → target folder
function getTargetFolder(assetKey) {
  if (assetKey.startsWith('game/hsr/')) {
    // game/hsr/character_portrait/1001.png → svarog-tracer/game/hsr/character_portrait
    const parts = assetKey.split('/');
    parts.pop(); // remove filename
    return `${BASE_FOLDER}/${parts.join('/')}`;
  }

  if (assetKey.includes('/companions/')) {
    // public/companions/Clara/drills-sound/... → svarog-tracer/site/companions/Clara/drills-sound
    const parts = assetKey.replace(/^public\//, '').split('/');
    parts.pop();
    return `${BASE_FOLDER}/site/${parts.join('/')}`;
  }

  // Root-level assets → svarog-tracer/site/root
  return `${BASE_FOLDER}/site/root`;
}

// Extract public_id from Cloudinary URL
function extractPublicId(url) {
  const urlObj = new URL(url);
  const pathParts = urlObj.pathname.split('/');
  const uploadIdx = pathParts.indexOf('upload');
  return pathParts.slice(uploadIdx + 2).join('/').replace(/\.[^.]+$/, '');
}

async function reorganize() {
  console.log('📁 Reorganizing Cloudinary assets into folders...\n');

  const entries = Object.entries(CLOUDINARY_MAP);
  let moved = 0;
  let failed = 0;

  for (let i = 0; i < entries.length; i++) {
    const [assetKey, secureUrl] = entries[i];
    const publicId = extractPublicId(secureUrl);
    const targetFolder = getTargetFolder(assetKey);

    // Cloudinary rate limit: max 500/minute, so add a small delay
    if (i > 0 && i % 10 === 0) {
      console.log(`  ⏳ Rate limit safety pause (${i}/${entries.length})...`);
      await new Promise(r => setTimeout(r, 2000));
    }

    try {
      await cloudinary.api.update(publicId, {
        asset_folder: targetFolder,
      });
      console.log(`  ✅ ${assetKey} → ${targetFolder}`);
      moved++;
    } catch (err) {
      // If asset_folder API fails (older Cloudinary plans), try rename
      if (err.message?.includes('asset_folder') || err.http_code === 400) {
        try {
          const newPublicId = `${targetFolder}/${publicId.split('/').pop()}`;
          await cloudinary.uploader.rename(publicId, newPublicId);
          console.log(`  ✅ ${assetKey} renamed to ${newPublicId}`);
          moved++;
        } catch (renameErr) {
          console.error(`  ❌ ${assetKey}: ${renameErr.message}`);
          failed++;
        }
      } else {
        console.error(`  ❌ ${assetKey}: ${err.message}`);
        failed++;
      }
    }
  }

  console.log(`\n✅ Done! Moved ${moved}, failed ${failed}`);
}

reorganize().catch(err => {
  console.error('\n💥 Fatal error:', err);
  process.exit(1);
});
