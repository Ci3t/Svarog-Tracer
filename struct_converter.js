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
    // Split by tab or multiple spaces
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
        // Jingliu (1), Seele (2), Topaz (2)
        // CSV order: Jingliu, Seele, Topaz
        // P1: Jingliu. P2: Seele, Topaz.
        p1 = [chars[0]];
        p2 = chars.slice(1);
    } else if (v === '1.5') {
        // Huohuo, Silver Wolf, Argenti
        // P1: Huohuo. P2: Silver Wolf, Argenti.
        p1 = [chars[0]];
        p2 = chars.slice(1);
    } else if (v === '2.5') {
       // Feixiao, BS, Kafka, Robin, Lingsha, Topaz
       // P1: Feixiao, Kafka, BS, Robin. (4)
       // P2: Lingsha, Topaz. (2)
       // CSV Line 40-45 order: Feixiao, BS, Kafka, Robin, Lingsha, Topaz
       // So first 4 are P1.
       p1 = chars.slice(0, 4);
       p2 = chars.slice(4);
    } else {
        // Default heuristic
        const mid = Math.ceil(chars.length / 2);
        // If 2 items: mid=1. p1=[0], p2=[1]. Correct.
        // If 3 items: mid=2. p1=[0,1], p2=[2]. 
        // Wait, for 1.4/1.5 (3 items), it was 1/2 split (P1 has 1).
        // My default heuristic of ceil gives 2/1 split (P1 has 2).
        // Let's change default to floor for odd numbers?
        // If 3 items: floor=1. p1=[0], p2=[1,2]. Matches 1.4/1.5.
        // If 4 items: floor=2. p1=[0,1], p2=[2,3]. Matches 1.6/2.0.
        // If 9 items (3.4): floor=4. p1=4, p2=5. Reasonable.
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
