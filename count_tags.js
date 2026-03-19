
import fs from 'fs';

const filePath = 'd:/Coding/HSR_PatternRecord/src/pages/ZoneTrackerPage.jsx';
const content = fs.readFileSync(filePath, 'utf8');

const lines = content.split('\n');
const stack = [];

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;
    
    // Improved regex to handle self-closing tags and basic JSX
    const tagRegex = /<(\w+)\b[^>]*>|<\/(\w+)>/g;
    let match;
    while ((match = tagRegex.exec(line)) !== null) {
        const fullTag = match[0];
        const tagName = (match[1] || match[2]).toLowerCase();

        // Skip self-closing and void tags
        if (fullTag.endsWith('/>') || ['img', 'br', 'hr', 'input', 'meta', 'link'].includes(tagName)) continue;

        if (fullTag.startsWith('</')) {
            if (stack.length > 0) {
                const popped = stack.pop();
                if (popped.tagName !== tagName) {
                    console.log(`[L${lineNum}] MISMATCH: Found </${tagName}>, but expected </${popped.tagName}> (from L${popped.lineNum})`);
                }
            } else {
                console.log(`[L${lineNum}] ERROR: Extra closing </${tagName}>`);
            }
        } else {
            stack.push({ lineNum, tagName });
        }
    }
}

console.log('--- Final Stack ---');
console.log('Final stack size:', stack.length);
stack.forEach(s => console.log(`Unclosed <${s.tagName}> from line ${s.lineNum}`));
