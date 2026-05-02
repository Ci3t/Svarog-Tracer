import fs from 'fs';

const chars = JSON.parse(fs.readFileSync('src/data/characters.json', 'utf8'));

for (const char of chars) {
  if (char.numId) {
    char.portrait = `https://res.cloudinary.com/dnyvbrrzy/image/upload/f_auto,q_auto/svarog-tracer/game/hsr/character_portrait/${char.numId}`;
  }
}

fs.writeFileSync('src/data/characters.json', JSON.stringify(chars, null, 2));
console.log('Updated', chars.length, 'characters with portrait URLs');
