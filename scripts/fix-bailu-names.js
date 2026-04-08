import fs from 'fs';
import path from 'path';

const dir = path.join(process.cwd(), 'public', 'companions', 'bailu');

function renamePrefix(dirPath, oldPrefix, newPrefix) {
    const items = fs.readdirSync(dirPath);
    for (const item of items) {
        if (item.startsWith(oldPrefix)) {
            const newName = item.replace(oldPrefix, newPrefix);
            fs.renameSync(path.join(dirPath, item), path.join(dirPath, newName));
            console.log(`Renamed: ${item} -> ${newName}`);
        }
    }
}

renamePrefix(dir, '¦+-¦', 'bailu');

// Now read bailu.model3.json and fix references
const modelPath = path.join(dir, 'bailu.model3.json');
let content = fs.readFileSync(modelPath, 'utf8');

// Replace "白露" (which is what the JSON originally had) with "bailu"
content = content.replace(/白露/g, 'bailu');

fs.writeFileSync(modelPath, content, 'utf8');
console.log('Updated references in bailu.model3.json');
