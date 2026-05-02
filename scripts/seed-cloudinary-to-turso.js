#!/usr/bin/env node
/**
 * Seed Cloudinary asset metadata into Turso
 *
 * Reads src/generated/cloudinary-map.js and inserts into cloudinary_assets table
 *
 * Usage:
 *   node scripts/seed-cloudinary-to-turso.js
 */

import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
import { CLOUDINARY_MAP } from '../src/generated/cloudinary-map.js';

dotenv.config();

const url = process.env.TURSO_DB_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
  console.error('❌ TURSO_DB_URL or TURSO_AUTH_TOKEN not set');
  process.exit(1);
}

const client = createClient({ url, authToken });

async function seed() {
  console.log('🌱 Seeding cloudinary_assets into Turso...\n');

  // Ensure table exists
  await client.execute(`
    CREATE TABLE IF NOT EXISTS cloudinary_assets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      asset_key TEXT NOT NULL UNIQUE,
      public_id TEXT NOT NULL,
      secure_url TEXT NOT NULL,
      resource_type TEXT NOT NULL DEFAULT 'image',
      folder TEXT NOT NULL DEFAULT '',
      bytes INTEGER,
      format TEXT,
      width INTEGER,
      height INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  let inserted = 0;
  let skipped = 0;

  for (const [assetKey, secureUrl] of Object.entries(CLOUDINARY_MAP)) {
    // Derive public_id from URL
    const urlObj = new URL(secureUrl);
    const pathParts = urlObj.pathname.split('/');
    // URL format: /dnyvbrrzy/image/upload/v1234567890/svarog-tracer/.../filename
    // Find the index after "upload"
    const uploadIdx = pathParts.indexOf('upload');
    const publicIdParts = pathParts.slice(uploadIdx + 2); // skip version number
    const publicId = publicIdParts.join('/').replace(/\.[^.]+$/, ''); // remove extension

    // Determine folder
    const folderParts = publicIdParts.slice(0, -1);
    const folder = folderParts.join('/');

    // Determine format
    const extMatch = secureUrl.match(/\.([a-zA-Z0-9]+)$/);
    const format = extMatch ? extMatch[1].toLowerCase() : 'png';

    // Determine resource_type
    const resourceType = ['mp3', 'ogg', 'wav'].includes(format) ? 'raw' : 'image';

    try {
      await client.execute({
        sql: `
          INSERT INTO cloudinary_assets (asset_key, public_id, secure_url, resource_type, folder, format)
          VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(asset_key) DO UPDATE SET
            secure_url = excluded.secure_url,
            public_id = excluded.public_id,
            updated_at = CURRENT_TIMESTAMP
        `,
        args: [assetKey, publicId, secureUrl, resourceType, folder, format],
      });
      inserted++;
      process.stdout.write(`  ✅ ${assetKey}\n`);
    } catch (err) {
      console.error(`  ❌ Failed: ${assetKey} — ${err.message}`);
    }
  }

  console.log(`\n✅ Done! Inserted ${inserted}, skipped ${skipped}`);
  process.exit(0);
}

seed().catch((err) => {
  console.error('\n💥 Fatal error:', err);
  process.exit(1);
});
