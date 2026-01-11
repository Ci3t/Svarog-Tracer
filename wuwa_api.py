"""
WuWa Tracker API
A Flask API that scrapes WuWa Tracker and provides clean JSON data
"""

from flask import Flask, jsonify
from flask_cors import CORS
import requests
from bs4 import BeautifulSoup
import re
import json

app = Flask(__name__)
CORS(app)  # Enable CORS for localhost:5173

def scrape_wuwa_stats(banner_id):
    """
    Scrapes WuWa Tracker for banner statistics
    Returns: {
        "histogram": { "1": 1340, "2": 1345, ... },
        "total": 114175,
        "characters": { "Lynae": 57086, ... }
    }
    """
    url = f"https://wuwatracker.com/tracker/stats/{banner_id}"
    
    try:
        # Fetch the page
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        html = response.text
        
        # Parse the HTML
        soup = BeautifulSoup(html, 'html.parser')
        
        # Find all script tags containing Next.js data
        scripts = soup.find_all('script')
        
        histogram_data = None
        histogram_percent_data = None  # NEW: Extract percentages directly
        character_data = None
        
        for script in scripts:
            script_text = script.string
            if not script_text:
                continue
            
            # Look for the pity histogram (5✦ Pulls per Pity)
            if '5✦ Pulls per Pity' in script_text or '5★ Pulls per Pity' in script_text:
                # Extract histogram counts using regex
                hist_pattern = r'\\"histogram\\":\{([^}]+)\}'
                match = re.search(hist_pattern, script_text)
                if match:
                    hist_str = match.group(1)
                    # Unescape quotes
                    hist_str = hist_str.replace('\\"', '"')
                    # Convert to JSON
                    hist_json = '{' + hist_str + '}'
                    histogram_data = json.loads(hist_json)
                
                # NEW: Also extract the percentage data if it exists
                # Look for patterns like "histogramPercent":{...} or similar
                percent_patterns = [
                    r'\\"histogramPercent\\":\{([^}]+)\}',
                    r'\\"percentages\\":\{([^}]+)\}',  
                    r'\\"chances\\":\{([^}]+)\}',
                    r'\\"rates\\":\{([^}]+)\}'
                ]
                
                for pattern in percent_patterns:
                    percent_match = re.search(pattern, script_text)
                    if percent_match:
                        percent_str = percent_match.group(1)
                        percent_str = percent_str.replace('\\"', '"')
                        percent_json = '{' + percent_str + '}'
                        try:
                            histogram_percent_data = json.loads(percent_json)
                            print(f"Found percentage data using pattern: {pattern}")
                            break
                        except:
                            continue
            
            # Look for character histogram (itemNameHistogram)
            if 'itemNameHistogram' in script_text:
                # Extract character data
                char_pattern = r'\\"itemNameHistogram\\":\{([^}]+)\}'
                match = re.search(char_pattern, script_text)
                if match:
                    char_str = match.group(1)
                    # Unescape quotes
                    char_str = char_str.replace('\\"', '"')
                    # Convert to JSON
                    char_json = '{' + char_str + '}'
                    character_data = json.loads(char_json)
        
        if not histogram_data:
            return {"error": "Could not parse histogram data"}, 500
        
        # DEBUG: Disabled to prevent Vite from reloading the page
        # with open('wuwa_debug.html', 'w', encoding='utf-8') as f:
        #     f.write(html)
        # print("Saved HTML to wuwa_debug.html for inspection")
        
        # Look for the actual total displayed on the page
        # WuWa Tracker shows "5✦ Pulls" with a count - this is the accurate total
        total_pulls = None
        
        # Search for any 6-digit numbers in the 100k-120k range that might be the correct total
        # WuWa shows 0.91% for roll 22 with count 1047, meaning total = 1047/0.0091 ≈ 115,055
        all_large_numbers = set(re.findall(r'\b(1[01234]\d{4})\b', html))
        print(f"Found large numbers in HTML (100k-149k range): {sorted(all_large_numbers)}")
        
        # Also look for numbers in the 110k-120k range specifically
        target_range_numbers = [n for n in all_large_numbers if 110000 <= int(n) <= 120000]
        print(f"Numbers in target range (110k-120k): {target_range_numbers}")
        
        for script in scripts:
            script_text = script.string
            if not script_text:
                continue
            
            #  Look for patterns like "label":"5✦ Pulls","value":114175 or similar
            total_patterns = [
                r'\\"label\\":\\"5✦ Pulls\\"[^}]*\\"(?:value|count|total)\\":(\d{5,7})',
                r'\\"5✦ Pulls\\"[^}]*:(\d{5,7})',
                r'\\"totalPulls\\":(\d{5,7})',
                r'\\"total\\":(\d{5,7})'
            ]
            
            for pattern in total_patterns:
                match = re.search(pattern, script_text)
                if match:
                    found_total = int(match.group(1))
                    # Sanity check: should be between 50k-200k
                    if 50000 <= found_total <= 200000:
                        print(f"Found total using pattern {pattern}: {found_total}")
                        total_pulls = found_total
                        break
            
            if total_pulls:
                break
        
        # Fallback: calculate total from featured character
        if not total_pulls:
            # WuWa has a 50/50 mechanic. The featured character count represents 
            # approximately half of all 5-star pulls on the banner.
            # So total ≈ 2 × featured character pulls
            if character_data:
                # Find the featured character (highest pull count)
                featured_char = max(character_data.items(), key=lambda x: int(x[1]))
                featured_count = int(featured_char[1])
                total_pulls = featured_count * 2
                print(f"Using 2x featured character ({featured_char[0]}) pulls as total: {total_pulls}")
            else:
                # Last resort: sum histogram
                total_pulls = sum(int(count) for count in histogram_data.values())
                print(f"Using histogram sum as total: {total_pulls}")
        
        # Calculate percentages using the found total
        histogram_percent = {}
        
        if histogram_percent_data:
            # Use the pre-calculated percentages from WuWa Tracker
            print("Using pre-calculated percentages from WuWa Tracker")
            histogram_percent = {pity: float(pct) for pity, pct in histogram_percent_data.items()}
        else:
            # Calculate ourselves if no pre-calculated data
            print("Calculating percentages from total")
            for pity, count in histogram_data.items():
                count_int = int(count)
                histogram_percent[pity] = count_int / total_pulls if total_pulls > 0 else 0
        
        # Verify with roll #22
        roll_22_count = histogram_data.get('22', 0)
        roll_22_pct = histogram_percent.get('22', 0) * 100
        print(f"Roll #22: {roll_22_count} pulls = {roll_22_pct:.2f}% (should be ~0.91%)")
        
        return {
            "histogram": {pity: int(count) for pity, count in histogram_data.items()},
            "histogram_percent": histogram_percent,
            "total_pulls": total_pulls,
            "characters": character_data or {},
            "banner_id": banner_id
        }
    
    except requests.RequestException as e:
        return {"error": f"Failed to fetch data: {str(e)}"}, 500
    except Exception as e:
        return {"error": f"Parse error: {str(e)}"}, 500

@app.route('/api/wuwa/stats/<banner_id>')
def get_wuwa_stats(banner_id):
    """API endpoint for WuWa banner statistics"""
    result = scrape_wuwa_stats(banner_id)
    if isinstance(result, tuple):
        return jsonify(result[0]), result[1]
    return jsonify(result)

@app.route('/api/health')
def health():
    """Health check endpoint"""
    return jsonify({"status": "ok", "service": "wuwa-api"})

if __name__ == '__main__':
    print("🚀 WuWa API Server starting on http://localhost:5174")
    print("📊 Endpoint: http://localhost:5174/api/wuwa/stats/{banner_id}")
    app.run(host='localhost', port=5174, debug=True)
