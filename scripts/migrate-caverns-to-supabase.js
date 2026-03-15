#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const SOURCE_ARG = process.argv[2];
const DEFAULT_SOURCE_URL = 'https://svarog-tracer.vercel.app/api/hsr/cavern-clears';

function printUsage() {
  console.log('Usage:');
  console.log('  node scripts/migrate-caverns-to-supabase.js <source>');
  console.log('');
  console.log('Source can be:');
  console.log('  1. A local JSON file path');
  console.log('  2. A full http(s) URL');
  console.log('');
  console.log(`Example URL:  node scripts/migrate-caverns-to-supabase.js ${DEFAULT_SOURCE_URL}`);
  console.log('Example file: node scripts/migrate-caverns-to-supabase.js .\\caverns-export.json');
}

async function loadSourceData(source) {
  if (!source) {
    throw new Error('Missing source argument.');
  }

  if (/^https?:\/\//i.test(source)) {
    const response = await fetch(source);
    if (!response.ok) {
      throw new Error(`Failed to fetch source URL (${response.status}).`);
    }
    return response.json();
  }

  const resolvedPath = path.resolve(process.cwd(), source);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Source file not found: ${resolvedPath}`);
  }

  return JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
}

function normalizeEntry(entry) {
  const reports = Array.isArray(entry?.reports) ? entry.reports : [];
  const substats = Array.isArray(entry?.substats)
    ? entry.substats
    : Array.isArray(reports[0]?.substats)
      ? reports[0].substats
      : [];

  const reporters = Array.isArray(entry?.reporters)
    ? entry.reporters
    : [...new Set(reports.map((report) => report?.reporter).filter(Boolean))];

  return {
    relicId: entry?.relicId,
    clearTime: entry?.clearTime,
    characters: Array.isArray(entry?.characters) ? entry.characters : [],
    substats,
    mainStat: entry?.mainStat || reports[0]?.mainStat || undefined,
    reporters,
    reports,
    verifiedCount: Number(entry?.verifiedCount || reports.length || 0),
    likes: Array.isArray(entry?.likes) ? entry.likes : [],
    firstReported: entry?.firstReported || reports[0]?.timestamp || new Date().toISOString(),
    lastReported:
      entry?.lastReported || reports[reports.length - 1]?.timestamp || new Date().toISOString(),
  };
}

function validateEntries(entries) {
  if (!Array.isArray(entries)) {
    throw new Error('Source JSON must be an array.');
  }

  return entries
    .map(normalizeEntry)
    .filter((entry) => entry.relicId && entry.clearTime && entry.characters.length === 4);
}

async function main() {
  if (!SOURCE_ARG) {
    printUsage();
    process.exit(1);
  }

  const { saveCavernData } = await import('../api/_services/hsr/cavern-clears.js');
  const rawData = await loadSourceData(SOURCE_ARG);
  const entries = validateEntries(rawData);

  console.log(`Loaded ${entries.length} cavern entries from source.`);

  if (entries.length === 0) {
    console.log('Nothing to migrate. Source returned zero valid entries.');
    process.exit(0);
  }

  await saveCavernData(entries, []);
  console.log(
    `Migrated ${entries.length} cavern entries into Supabase table "${process.env.SUPABASE_CAVERN_TABLE || 'cavern_clears'}".`
  );
}

main().catch((error) => {
  console.error('Migration failed:', error.message);
  process.exit(1);
});
