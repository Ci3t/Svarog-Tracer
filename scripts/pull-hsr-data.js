/**
 * Script to extract static HSR Character and Relic data from hsr.gachabase.net
 * Uses a deep-scan array strategy to bypass SvelteKit layout changes.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Fetching both Release and Beta characters ensures we have the upcoming ones!
const URLS = {
    characters: 'https://hsr.gachabase.net/characters/beta/__data.json?lang=en',
    relics: 'https://hsr.gachabase.net/relics/beta/__data.json?lang=en',
    planars: 'https://hsr.gachabase.net/planar-ornaments/beta/__data.json?lang=en',
    srrItems: 'https://raw.githubusercontent.com/Mar-7th/StarRailRes/master/index_new/en/items.json'
};

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    'Accept': 'application/json'
};

async function fetchSvelteData(url) {
    console.log(`📡 Fetching from Gachabase: ${url}`);
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) throw new Error(`HTTP Error Status: ${res.status}`);
    
    const text = await res.text();
    const lines = text.split('\n');
    
    for (const line of lines) {
        if (line.includes('{"type":"chunk"') && line.includes('"data":')) {
            try {
                const parsed = JSON.parse(line);
                if (parsed.data && Array.isArray(parsed.data)) {
                    // Check if this chunk contains the character/relic entity objects
                    const hasEntities = parsed.data.some(item => 
                        item && typeof item === 'object' && 'slug' in item && 'name' in item
                    );
                    if (hasEntities) return parsed.data;
                }
            } catch (e) {}
        }
    }
    
    // Fallback
    try {
        const match = text.match(/\{"type":"data".*?\n/s);
        const jsonStr = match ? match[0] : text.split('\n')[0];
        const json = JSON.parse(jsonStr);
        return json.nodes[1].data;
    } catch (e) {
        throw new Error('Could not parse SvelteKit data stream');
    }
}

function resolveString(idx, dataArray) {
    if (typeof idx === 'number') {
        const val = dataArray[idx];
        if (typeof val === 'string') return val;
        if (val && typeof val === 'object' && val.text !== undefined) {
            return dataArray[val.text];
        }
    }
    return null;
}

function resolveNumber(idx, dataArray) {
    if (typeof idx === 'number') {
        const val = dataArray[idx];
        if (typeof val === 'number') return val;
    }
    return null; 
}

const EXCLUSIONS = [
    "trailblazer", "caelus", "stelle", "skotts-specially-appointed-ipc-mech", 
    "bloodstained-lupine", "hallucinogenic-mermaid", "nickname", "saber", "archer"
];

async function extractEntities(url, isRelic = false) {
    const dataArray = await fetchSvelteData(url);
    const entities = [];
    const seenNames = new Set();
    
    for (const item of dataArray) {
        if (item && typeof item === 'object' && ('slug' in item) && ('name' in item)) {
            const slug = resolveString(item.slug, dataArray);
            const name = resolveString(item.name, dataArray);
            const numId = resolveNumber(item.id, dataArray);
            
            if (!slug || !name || !numId) continue;
            if (slug.length < 3 || slug.includes('/') || slug.startsWith('hsr-')) continue;
            if (EXCLUSIONS.some(ex => slug.includes(ex))) continue;
            
            let cleanName = name.replace(/&amp;/g, "&");
            let rarity = 5;
            if (isRelic) {
                rarity = 5;
            } else if ('rarity' in item) {
                const rawRarityObj = dataArray[item.rarity];
                if (typeof rawRarityObj === 'number' && (rawRarityObj === 4 || rawRarityObj === 5)) {
                    rarity = rawRarityObj;
                } else if (rawRarityObj && rawRarityObj.rarity && typeof dataArray[rawRarityObj.rarity] === 'number') {
                    rarity = dataArray[rawRarityObj.rarity];
                } else if (typeof item.rarity === 'number') {
                   rarity = dataArray[item.rarity] === 14 ? 4 : 5; 
                }
            }
            
            if (!seenNames.has(cleanName)) {
                const imagePath = isRelic 
                    ? `https://raw.githubusercontent.com/Mar-7th/StarRailRes/master/icon/relic/${numId}.png`
                    : `https://raw.githubusercontent.com/Mar-7th/StarRailRes/master/icon/character/${numId}.png`;
                
                entities.push({ 
                    id: slug, 
                    numId: numId,
                    name: cleanName, 
                    rarity: rarity,
                    image: imagePath
                });
                seenNames.add(cleanName);
            }
        }
    }
    
    return entities;
}

async function extractMaterials() {
    console.log(`📡 Fetching from StarRailRes: items.json`);
    const res = await fetch(URLS.srrItems);
    const itemsData = await res.json();
    
    const materials = [];
    // Convert object of items to array
    for (const key in itemsData) {
        const item = itemsData[key];
        
        // Only include items that come from Calyx or Stagnant Shadow
        const isTargetMaterial = item.come_from && Array.isArray(item.come_from) && item.come_from.some(source => 
            source.includes('Calyx') || source.includes('Stagnant Shadow')
        );
        
        if (isTargetMaterial) {
            // Predictable SLUG based on name to match our Gachabase pattern (e.g. "shattered blade" -> "shattered-blade")
            const slug = item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
            materials.push({
                id: slug,
                numId: parseInt(item.id),
                name: item.name,
                rarity: item.rarity || 4,
                image: `https://raw.githubusercontent.com/Mar-7th/StarRailRes/master/${item.icon}`
            });
        }
    }
    return materials;
}

async function main() {
    try {
        console.log("--- Starting HSR Data Extraction ---");
        const chars = await extractEntities(URLS.characters, false);
        console.log(`✅ Extracted ${chars.length} characters.`);
        
        const coreRelics = await extractEntities(URLS.relics, true);
        const planars = await extractEntities(URLS.planars, true);
        const allRelics = [...coreRelics, ...planars];
        console.log(`✅ Extracted ${coreRelics.length} relic sets and ${planars.length} planar ornaments.`);
        
        const materials = await extractMaterials();
        console.log(`✅ Extracted ${materials.length} upgrade materials (Calyx/Stagnant Shadow).`);

        // Determine save location
        const isVercelEnvironment = process.env.VERCEL || process.env.NODE_ENV === 'production';
        if (isVercelEnvironment && process.env.BLOB_READ_WRITE_TOKEN) {
            console.log("🌍 Running in Vercel environment. Blobs could be updated here.");
        } else {
            const dataDir = path.join(__dirname, '..', 'src', 'data');
            if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
            
            fs.writeFileSync(path.join(dataDir, 'characters.json'), JSON.stringify(chars, null, 2));
            fs.writeFileSync(path.join(dataDir, 'relics.json'), JSON.stringify(allRelics, null, 2));
            fs.writeFileSync(path.join(dataDir, 'materials.json'), JSON.stringify(materials, null, 2));
            
            console.log(`📂 Saved successfully to: src/data/`);
        }
    } catch (err) {
        console.error("❌ Failed:", err.message);
    }
}

main();
