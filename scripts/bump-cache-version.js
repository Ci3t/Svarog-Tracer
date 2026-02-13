#!/usr/bin/env node

/**
 * Auto Cache Version Incrementer
 * 
 * This script automatically increments the CACHE_VERSION in api/banners.js
 * to force cache invalidation when deploying banner-related changes.
 * 
 * Usage:
 *   node scripts/bump-cache-version.js
 */

const fs = require('fs');
const path = require('path');

const BANNERS_API_PATH = path.join(__dirname, '..', 'api', 'banners.js');

try {
  // Read the file
  let content = fs.readFileSync(BANNERS_API_PATH, 'utf8');
  
  // Find current version
  const versionMatch = content.match(/CACHE_VERSION:\s*(\d+)/);
  
  if (!versionMatch) {
    console.error('❌ Could not find CACHE_VERSION in api/banners.js');
    process.exit(1);
  }
  
  const currentVersion = parseInt(versionMatch[1]);
  const newVersion = currentVersion + 1;
  
  // Replace version
  content = content.replace(
    /CACHE_VERSION:\s*\d+/,
    `CACHE_VERSION: ${newVersion}`
  );
  
  // Write back
  fs.writeFileSync(BANNERS_API_PATH, content, 'utf8');
  
  console.log(`✅ Cache version bumped: ${currentVersion} → ${newVersion}`);
  console.log('📝 This will force all production caches to refresh on next deployment');
  
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
