import fs from 'fs';

const URLS = {
    materials: 'https://hsr.gachabase.net/items/upgrade-materials/beta/__data.json?lang=en'
};

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json'
};

async function fetchSvelteData(url) {
    console.log(`📡 Fetching from: ${url}`);
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
            } catch (e) { }
        }
    }
    
    try {
        const match = text.match(/\{"type":"data".*?\n/s);
        const jsonStr = match ? match[0] : text.split('\n')[0];
        const json = JSON.parse(jsonStr);
        return json.nodes[1].data;
    } catch (e) {
        throw new Error('Could not parse SvelteKit data stream');
    }
}

async function run() {
    const dataArray = await fetchSvelteData(URLS.materials);
    fs.writeFileSync('gachabase_materials.json', JSON.stringify(dataArray, null, 2));
    console.log("Saved materials array.");
}

run();
