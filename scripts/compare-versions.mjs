import { readFileSync } from 'fs';

const v1 = JSON.parse(readFileSync('debugfiles/kimi-raw.json', 'utf8'));
const v2 = JSON.parse(readFileSync('debugfiles/kimi-raw-v3.json', 'utf8'));

let total = 0, v1Hits = 0, v1Top2 = 0, v2Hits = 0, v2Top2 = 0;
let changed = 0, improved = 0, worsened = 0;

for (let s = 0; s < v1.length; s++) {
  const s1 = v1[s];
  const s2 = v2[s];
  for (let r = 0; r < s1.rollByRoll.length; r++) {
    const r1 = s1.rollByRoll[r];
    const r2 = s2.rollByRoll[r];
    total++;
    const h1 = r1.hit === 'HIT';
    const t1 = r1.hit === 'HIT' || r1.hit === 'ALT-HIT';
    const h2 = r2.hit === 'HIT';
    const t2 = r2.hit === 'HIT' || r2.hit === 'ALT-HIT';
    if (h1) v1Hits++;
    if (t1) v1Top2++;
    if (h2) v2Hits++;
    if (t2) v2Top2++;
    if (r1.hit !== r2.hit) {
      changed++;
      if ((t2 && !t1) || (h2 && !h1)) improved++;
      else if ((t1 && !t2) || (h1 && !h2)) worsened++;
    }
  }
}

console.log(`Total rolls: ${total}`);
console.log(`V1 main hits: ${v1Hits}/${total} = ${Math.round(v1Hits/total*100)}%`);
console.log(`V1 top-2:     ${v1Top2}/${total} = ${Math.round(v1Top2/total*100)}%`);
console.log(`V2 main hits: ${v2Hits}/${total} = ${Math.round(v2Hits/total*100)}%`);
console.log(`V2 top-2:     ${v2Top2}/${total} = ${Math.round(v2Top2/total*100)}%`);
console.log(`Changed: ${changed} | Improved: ${improved} | Worsened: ${worsened}`);
console.log(`Delta main: ${v2Hits - v1Hits} | Delta top-2: ${v2Top2 - v1Top2}`);

// Per-session breakdown
console.log('\n--- Per Session ---');
for (let s = 0; s < v1.length; s++) {
  const s1 = v1[s];
  const s2 = v2[s];
  let t = 0, h1 = 0, t1 = 0, h2 = 0, t2 = 0;
  for (let r = 0; r < s1.rollByRoll.length; r++) {
    t++;
    if (s1.rollByRoll[r].hit === 'HIT') h1++;
    if (s1.rollByRoll[r].hit === 'HIT' || s1.rollByRoll[r].hit === 'ALT-HIT') t1++;
    if (s2.rollByRoll[r].hit === 'HIT') h2++;
    if (s2.rollByRoll[r].hit === 'HIT' || s2.rollByRoll[r].hit === 'ALT-HIT') t2++;
  }
  const delta = t2 - t1;
  const arrow = delta > 0 ? '▲' : delta < 0 ? '▼' : '=';
  console.log(`Session ${s1.session.id}: ${t1}% → ${t2}% top-2 ${arrow}${delta}`);
}
