const fs = require('fs');
const path = require('path');

const csvPath = path.join(__dirname, 'debugstxt', 'banner.csv');
const outputPath = path.join(__dirname, 'src', 'data', 'bannerHistory.json');

// Ensure output dir
const outputDir = path.dirname(outputPath);
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

const rawData = fs.readFileSync(csvPath, 'utf-8');
const lines = rawData.split('\n').filter(l => l.trim() !== '');

// Skip header
const dataLines = lines.slice(1);

// Group by Version
const versionMap = {};

dataLines.forEach(line => {
    // Format: 'AppearanceCount \t Version \t Character'
    const parts = line.split(/\t+/);
    if (parts.length < 3) return;

    const version = parts[1].trim();
    const character = parts[2].trim();
    
    // Normalize version: "1" -> "1.0"
    const formattedVersion = version.includes('.') ? version : `${version}.0`;

    if (!versionMap[formattedVersion]) {
        versionMap[formattedVersion] = [];
    }
    versionMap[formattedVersion].push(character);
});

// Process each version to split into phases
const bannerHistory = [];

const sortedVersions = Object.keys(versionMap).sort((a, b) => {
    return parseFloat(a) - parseFloat(b);
});

sortedVersions.forEach(v => {
    const chars = versionMap[v];
    let p1 = [];
    let p2 = [];

    // Special handling for known oddities
    if (v === '1.4') {
        p1 = [chars[0]];
        p2 = chars.slice(1);
    } else if (v === '1.5') {
        p1 = [chars[0]];
        p2 = chars.slice(1);
    } else if (v === '2.5') {
       p1 = chars.slice(0, 4);
       p2 = chars.slice(4);
    } else if (v === '3.8') {
        // v3.8 has 3 phases
        // Phase 1: The Dahlia + Firefly
        // Phase 2: Fugue + Lingsha  
        // Phase 3: Sunday + Aglaea
        p1 = [chars[0], chars[1]]; // The Dahlia, Firefly
        p2 = [chars[2], chars[3]]; // Fugue, Lingsha
        p3 = [chars[4], chars[5]]; // Sunday, Aglaea
        
        bannerHistory.push({
            version: v,
            phases: [
                { phase: 1, characters: p1 },
                { phase: 2, characters: p2 },
                { phase: 3, characters: p3 }
            ]
        });
        return; 
    } else {
        const splitIndex = Math.floor(chars.length / 2);
        p1 = chars.slice(0, splitIndex);
        p2 = chars.slice(splitIndex);
        
        // Ensure at least one in P1 if possible
        if (p1.length === 0 && p2.length > 0) {
            p1 = [p2.shift()];
        }
    }

    bannerHistory.push({
        version: v,
        phases: [
            { phase: 1, characters: p1 },
            { phase: 2, characters: p2 }
        ]
    });
});

fs.writeFileSync(outputPath, JSON.stringify(bannerHistory, null, 2));
console.log(`Successfully generated bannerHistory.json with ${bannerHistory.length} versions.`);
