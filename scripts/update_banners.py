import json
import urllib.request
import os
import time

# Configuration
WARP_CONFIG_URL = "https://starrailstation.com/api/v1/warp_config"
# Using Mar-7th's StarRailRes for reliable character metadata
CHARACTERS_DATA_URL = "https://raw.githubusercontent.com/Mar-7th/StarRailRes/master/index_new/en/characters.json"
LIGHT_CONES_DATA_URL = "https://raw.githubusercontent.com/Mar-7th/StarRailRes/master/index_new/en/light_cones.json"

IMAGE_BASE_URL = "https://raw.githubusercontent.com/Mar-7th/StarRailRes/master/"

OUTPUT_FILE = os.path.join(os.path.dirname(__file__), "..", "src", "data", "current_banners.json")

# Colors
GREEN = "\033[92m"
YELLOW = "\033[93m"
RED = "\033[91m"
RESET = "\033[0m"

def log(msg, color=RESET):
    print(f"{color}[BannerUpdater] {msg}{RESET}")

def fetch_json(url):
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read())
    except Exception as e:
        log(f"Failed to fetch {url}: {e}", RED)
        return None

def main():
    log("Starting banner update (Method: SRS Config + StarRailRes Metadata)...", GREEN)
    
    # 1. Get Warp Config (Schedule)
    config = fetch_json(WARP_CONFIG_URL)
    if not config:
        return

    gacha_list = config.get('config', {}).get('banners', {})
    if not gacha_list:
        log("No banners found in config.", RED)
        return

    # 2. Get Metadata (Chars + LCs)
    char_map = fetch_json(CHARACTERS_DATA_URL)
    lc_map = fetch_json(LIGHT_CONES_DATA_URL)
    
    if not char_map or not lc_map:
        return
    log(f"Fetched {len(char_map)} characters and {len(lc_map)} light cones from StarRailRes.", GREEN)

    # 3. Filter Active Banners
    now = time.time()
    active_banners = []
    
    log(f"Processing schedule...", YELLOW)
    
    for banner_id, data in gacha_list.items():
        start = data.get('start_time', 0)
        end = data.get('end_time', 0)
        
        # Check if active
        if start <= now <= end:
            # Check if it has rateup characters
            if 'rateup' in data:
                 rateup_id = str(data['rateup'])
                 
                 banner_type = "unknown"
                 info = None
                 
                 if rateup_id in char_map:
                     banner_type = "character"
                     info = char_map[rateup_id]
                 elif rateup_id in lc_map:
                     banner_type = "light_cone"
                     info = lc_map[rateup_id]
                 
                 if info:
                     active_banners.append({
                         'banner_id': banner_id,
                         'item_id': rateup_id,
                         'type': banner_type,
                         'info': info
                     })
                 else:
                     log(f"Skipping Banner {banner_id} (RateUp {rateup_id} not found in maps)", YELLOW)

    if not active_banners:
        log("No active banners found.", RED)
        # return # Proceed to write empty file? Best not to overwrite with empty.
        return

    log(f"Found {len(active_banners)} active banners.", GREEN)

    # 4. Construct Output
    final_output = []
    
    for banner in active_banners:
        cid = banner['item_id']
        info = banner['info']
        btype = banner['type']
        
        name = info.get('name', f'Unknown {cid}')
        icon_path = info.get('icon', '')
        
        # Construct full image URL
        image_url = f"{IMAGE_BASE_URL}{icon_path}" if icon_path else ""
        
        final_output.append({
            "id": banner['banner_id'],
            "name": name,
            "image": image_url,
            "type": btype,
            "characterId": cid
        })
        log(f"Added Banner: {name} (ID: {banner['banner_id']} - {btype})", GREEN)

    # 5. Write to file
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(final_output, f, indent=2, ensure_ascii=False)
    
    log(f"Successfully wrote {len(final_output)} banners to {OUTPUT_FILE}", GREEN)

if __name__ == "__main__":
    main()
