import fs from 'node:fs';

try {
  const html = fs.readFileSync('wuwa_debug.html', 'utf8');
  console.log('File size:', html.length);
  
  const target = '100032';
  const index = html.indexOf(target);
  
  if (index === -1) {
    console.log('Target not found!');
  } else {
    console.log(`Found at index: ${index}`);
    const start = Math.max(0, index - 1000);
    const end = Math.min(html.length, index + 3000);
    const snippet = html.substring(start, end);
    console.log('--- SNIPPET START ---');
    console.log(snippet);
    console.log('--- SNIPPET END ---');
  }
} catch (e) {
  console.error(e);
}
