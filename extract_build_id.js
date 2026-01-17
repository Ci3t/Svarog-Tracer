import fs from 'node:fs';

try {
  const html = fs.readFileSync('wuwa_debug.html', 'utf8');
  
  // Look for build ID pattern: /_next/static/{BUILD_ID}/
  const regex = /\/_next\/static\/([a-zA-Z0-9_-]+)\//g;
  const matches = [...html.matchAll(regex)];
  
  if (matches.length > 0) {
    console.log('Found potential Build IDs:');
    const ids = new Set(matches.map(m => m[1]));
    ids.forEach(id => {
       if (id !== 'chunks' && id !== 'css' && id !== 'media') {
           console.log(`BUILD_ID: ${id}`);
       }
    });
  } else {
    console.log('No standard Next.js build ID pattern found.');
  }

} catch (e) {
  console.error(e);
}
