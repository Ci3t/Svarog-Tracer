import fs from 'node:fs';

try {
  const html = fs.readFileSync('wuwa_debug.html', 'utf8');
  const urlRegex = /https?:\/\/[^"'\s]+/g;
  const matches = [...html.matchAll(urlRegex)];
  
  const urls = new Set(matches.map(m => m[0]));
  
  console.log(`Found ${urls.size} unique URLs.`);
  [...urls].slice(0, 50).forEach(u => console.log(u));

} catch (e) {
  console.error(e);
}
