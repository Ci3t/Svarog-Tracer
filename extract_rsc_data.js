import fs from 'node:fs';

try {
  const html = fs.readFileSync('wuwa_debug.html', 'utf8');
  
  // RSC data is pushed like: self.__next_f.push([1,"..."])
  // We want to extract the string content inside the array.
  const regex = /self\.__next_f\.push\(\[\d+,"(.*?[^\\])"\]\)/g;
  
  // Note: simply matching "Everything inside quotes" is hard because of escaping.
  // Let's try to match the whole line or block.
  
  const chunks = [];
  let match;
  // Simple extraction: find all occurrences of self.__next_f.push
  // and manually parse the arguments.
  
  let pos = 0;
  while ((pos = html.indexOf('self.__next_f.push', pos)) !== -1) {
      const start = html.indexOf('([', pos);
      if (start === -1) { pos++; continue; }
      
      // Find the matching closing ) for the push call? 
      // Actually these usually end with "])</script>" or similar.
      const end = html.indexOf('])</script>', start);
      
      if (end !== -1) {
          const raw = html.substring(start + 2, end + 1); // content inside ([ ... ])
          try {
             // It looks like: 1, "string-data"
             // Let's split by comma, but be careful of commas in string.
             // The first arg is always a number.
             const firstComma = raw.indexOf(',');
             const id = raw.substring(0, firstComma);
             let data = raw.substring(firstComma + 1);
             
             // data is a string literal including quotes: "foo"
             // We need to unescape it.
             if (data.startsWith('"') && data.endsWith('"')) {
                 data = data.slice(1, -1); // remove outer quotes
                 // specific unescaping for RSC format
                 data = data.replace(/\\"/g, '"').replace(/\\\\/g, '\\').replace(/\\n/g, '\n');
                 chunks.push({ id, data });
             }
          } catch (e) {
              console.log('Error parsing chunk starting at ' + pos);
          }
      }
      pos = end !== -1 ? end : pos + 1;
  }
  
  console.log(`Found ${chunks.length} RSC chunks.`);
  
  // Search for "pity" or "count" or "uuid" in chunks
  chunks.forEach((chunk, i) => {
      if (chunk.data.includes('pity') || chunk.data.includes('100032') || chunk.data.includes('Pull')) {
          console.log(`\n--- CHUNK ${i} (ID: ${chunk.id}) ---`);
          console.log(chunk.data.substring(0, 500) + '...'); // Print first 500 chars
      }
  });

} catch (e) {
  console.error(e);
}
