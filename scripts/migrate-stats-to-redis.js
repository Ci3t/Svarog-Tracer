#!/usr/bin/env node
/**
 * One-time migration: seeds presence_store.json stats into Upstash Redis.
 * Run this ONCE after setting up your Redis DB.
 * 
 * Usage:
 *   node scripts/migrate-stats-to-redis.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const REDIS_URL   = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

if (!REDIS_URL || !REDIS_TOKEN) {
  console.error('❌ Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN in .env.local');
  process.exit(1);
}

async function redis(...args) {
  const res  = await fetch(`${REDIS_URL}/${args.map(encodeURIComponent).join('/')}`, {
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
  });
  const json = await res.json();
  return json.result;
}

async function main() {
  // Read existing stats
  const storePath = path.join(__dirname, '..', 'presence_store.json');
  let total = 14, today = 0;

  try {
    if (fs.existsSync(storePath)) {
      const data = JSON.parse(fs.readFileSync(storePath, 'utf8'));
      total = data.total ?? 14;
      today = data.today ?? 0;
      console.log(`📂 Read from presence_store.json: total=${total}, today=${today}`);
    }
  } catch (e) {
    console.warn('⚠️ Could not read presence_store.json, using defaults.');
  }

  console.log(`\n📡 Connecting to Redis at ${REDIS_URL}...`);

  // Check for existing Redis data first
  const existingTotal = await redis('GET', 'p:total');
  if (existingTotal !== null) {
    console.log(`⚠️  Redis already has p:total = ${existingTotal}`);
    console.log('   Skipping migration to avoid overwriting existing data.');
    console.log('   If you want to force-seed, run: node scripts/migrate-stats-to-redis.js --force');
    if (!process.argv.includes('--force')) process.exit(0);
    console.log('   --force flag detected, overwriting...');
  }

  // Set today with TTL to midnight UTC
  const now = new Date();
  const midnight = new Date(now);
  midnight.setUTCHours(24, 0, 0, 0);
  const secsUntilMidnight = Math.floor((midnight - now) / 1000) + 5;
  const todayStr = now.toISOString().split('T')[0];

  // Pipeline write all 3 base keys
  const res = await fetch(`${REDIS_URL}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify([
      ['SET', 'p:total', String(total)],
      ['SET', 'p:today', String(today), 'EX', secsUntilMidnight],
      ['SET', 'p:date',  todayStr],
    ]),
  });

  const results = await res.json();
  const ok = results.every(r => r.result === 'OK' || r.result === 1);

  if (ok) {
    console.log(`\n✅ Migration complete!`);
    console.log(`   p:total = ${total}  (permanent)`);
    console.log(`   p:today = ${today}  (expires in ${Math.floor(secsUntilMidnight / 60)} mins at midnight UTC)`);
    console.log(`   p:date  = ${todayStr}`);
    console.log(`\n🗄️  Permanent storage used: ~${(String(total).length + todayStr.length + 40)} bytes`);
  } else {
    console.error('❌ Some writes failed:', results);
    process.exit(1);
  }
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
