"""
Analyze TRUE 5-minute window sessions to optimize for 80% target
"""

import re
from pathlib import Path
from collections import defaultdict

def parse_debug_file_detailed(filepath):
    """Parse debug file with detailed roll-by-roll analysis"""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    data = {
        'filename': Path(filepath).name,
        'rolls': [],
        'predictions': [],
        'summary': {}
    }
    
    # Extract all rolls
    rolls_match = re.search(r'📋 ALL ROLLS.*?\n\n(.*?)\n\n', content, re.DOTALL)
    if rolls_match:
        rolls_text = rolls_match.group(1)
        data['rolls'] = re.findall(r'\d{3}', rolls_text)
    
    # Parse tracking table
    table_match = re.search(r'Idx  Time.*?\n-+\n(.*?)\n\n', content, re.DOTALL)
    if table_match:
        table_lines = table_match.group(1).strip().split('\n')
        for line in table_lines:
            parts = line.split()
            if len(parts) >= 9:
                data['predictions'].append({
                    'idx': int(parts[0]),
                    'time': f"{parts[1]} {parts[2]}",
                    'actual': parts[3],
                    'wave_c2': parts[4],
                    'c2_result': parts[5],
                    'wave_c3': parts[6],
                    'c3_result': parts[7],
                    'prefix': parts[8] if len(parts) > 8 else '-',
                    'prefix_result': parts[9] if len(parts) > 9 else '✗'
                })
    
    # Extract summary
    wave_match = re.search(r'Column 2 Hits: (\d+) / (\d+) \(([\d.]+)%\).*?Column 3 Hits: (\d+) / (\d+) \(([\d.]+)%\).*?Combined: (\d+) / (\d+) \(([\d.]+)%\)', content, re.DOTALL)
    if wave_match:
        data['summary']['c2'] = {'hits': int(wave_match.group(1)), 'total': int(wave_match.group(2)), 'pct': float(wave_match.group(3))}
        data['summary']['c3'] = {'hits': int(wave_match.group(4)), 'total': int(wave_match.group(5)), 'pct': float(wave_match.group(6))}
        data['summary']['combined'] = {'hits': int(wave_match.group(7)), 'total': int(wave_match.group(8)), 'pct': float(wave_match.group(9))}
    
    prefix_match = re.search(r'Total: (\d+) / (\d+) \(([\d.]+)%\)', content)
    if prefix_match:
        data['summary']['prefix'] = {'hits': int(prefix_match.group(1)), 'total': int(prefix_match.group(2)), 'pct': float(prefix_match.group(3))}
    
    return data

def analyze_5min_patterns(data):
    """Analyze patterns specific to 5-minute windows"""
    
    # Analyze L/H distribution
    rolls = data['rolls']
    low_count = sum(1 for r in rolls if r[2] in ['1', '2'])
    high_count = sum(1 for r in rolls if r[2] in ['3', '4'])
    
    # Analyze flip points
    flips = []
    for i in range(1, len(rolls)):
        prev_lh = 'L' if rolls[i-1][2] in ['1', '2'] else 'H'
        curr_lh = 'L' if rolls[i][2] in ['1', '2'] else 'H'
        if prev_lh != curr_lh:
            flips.append(i)
    
    # Analyze prediction accuracy by position in window
    early_preds = [p for p in data['predictions'] if p['idx'] <= 5]
    mid_preds = [p for p in data['predictions'] if 5 < p['idx'] <= 10]
    late_preds = [p for p in data['predictions'] if p['idx'] > 10]
    
    def calc_acc(preds):
        if not preds:
            return 0
        c3_hits = sum(1 for p in preds if p['c3_result'] == '✓')
        c3_total = sum(1 for p in preds if p['wave_c3'] not in ['-', '[]'])
        return (c3_hits / c3_total * 100) if c3_total > 0 else 0
    
    return {
        'total_rolls': len(rolls),
        'low_count': low_count,
        'high_count': high_count,
        'low_ratio': low_count / (low_count + high_count) if (low_count + high_count) > 0 else 0,
        'flip_count': len(flips),
        'flip_positions': flips,
        'early_acc': calc_acc(early_preds),
        'mid_acc': calc_acc(mid_preds),
        'late_acc': calc_acc(late_preds),
    }

def main():
    debug_dir = Path('d:/Coding/HSR_PatternRecord/debugstxt')
    files = sorted(debug_dir.glob('Kiyo-Debug*.txt'))
    
    print('🔬 ANALYZING TRUE 5-MINUTE WINDOW SESSIONS\n')
    print('=' * 80)
    
    all_data = []
    for filepath in files:
        data = parse_debug_file_detailed(filepath)
        patterns = analyze_5min_patterns(data)
        all_data.append({'data': data, 'patterns': patterns})
    
    print(f'\n📊 FOUND {len(files)} SESSION FILES\n')
    
    # Analyze each session
    for i, item in enumerate(all_data, 1):
        data = item['data']
        patterns = item['patterns']
        
        print(f'\n{"="*80}')
        print(f'SESSION {i}: {data["filename"]}')
        print(f'{"="*80}')
        
        print(f'\n📋 Basic Stats:')
        print(f'   Total Rolls: {patterns["total_rolls"]}')
        print(f'   L/H Distribution: {patterns["low_count"]}L / {patterns["high_count"]}H ({patterns["low_ratio"]*100:.1f}% Low)')
        print(f'   Flip Count: {patterns["flip_count"]} flips')
        
        if data['summary']:
            print(f'\n📈 Accuracy:')
            if 'c2' in data['summary']:
                print(f'   Wave C2: {data["summary"]["c2"]["pct"]:.1f}% ({data["summary"]["c2"]["hits"]}/{data["summary"]["c2"]["total"]})')
            if 'c3' in data['summary']:
                c3_pct = data["summary"]["c3"]["pct"]
                status = '🎉 EXCELLENT' if c3_pct >= 80 else '✅ GOOD' if c3_pct >= 70 else '⚠️ NEEDS WORK' if c3_pct >= 60 else '❌ POOR'
                print(f'   Wave C3: {c3_pct:.1f}% ({data["summary"]["c3"]["hits"]}/{data["summary"]["c3"]["total"]}) {status}')
            if 'prefix' in data['summary']:
                print(f'   Prefix: {data["summary"]["prefix"]["pct"]:.1f}% ({data["summary"]["prefix"]["hits"]}/{data["summary"]["prefix"]["total"]})')
            if 'combined' in data['summary']:
                print(f'   Combined: {data["summary"]["combined"]["pct"]:.1f}% ({data["summary"]["combined"]["hits"]}/{data["summary"]["combined"]["total"]})')
        
        print(f'\n📍 Accuracy by Window Position:')
        print(f'   Early (rolls 1-5): {patterns["early_acc"]:.1f}%')
        print(f'   Mid (rolls 6-10): {patterns["mid_acc"]:.1f}%')
        print(f'   Late (rolls 11+): {patterns["late_acc"]:.1f}%')
    
    # Overall statistics
    print(f'\n\n{"="*80}')
    print(f'📊 OVERALL 5-MINUTE SESSION ANALYSIS')
    print(f'{"="*80}\n')
    
    avg_c3 = sum(item['data']['summary'].get('c3', {}).get('pct', 0) for item in all_data) / len(all_data)
    avg_c2 = sum(item['data']['summary'].get('c2', {}).get('pct', 0) for item in all_data) / len(all_data)
    avg_prefix = sum(item['data']['summary'].get('prefix', {}).get('pct', 0) for item in all_data) / len(all_data)
    
    print(f'Average Accuracy Across All Sessions:')
    print(f'   Wave C2: {avg_c2:.1f}%')
    print(f'   Wave C3: {avg_c3:.1f}%')
    print(f'   Prefix: {avg_prefix:.1f}%')
    
    # Check if we hit target
    print(f'\n🎯 TARGET ACHIEVEMENT:')
    if avg_c3 >= 80:
        print(f'   ✅ HIT 80% TARGET! Wave C3 at {avg_c3:.1f}%')
    elif avg_c3 >= 70:
        print(f'   ✅ HIT 70% TARGET! Wave C3 at {avg_c3:.1f}%')
        print(f'   ⚠️ Need +{80 - avg_c3:.1f}% to reach 80%')
    else:
        print(f'   ❌ Below 70% target: {avg_c3:.1f}%')
        print(f'   Need +{70 - avg_c3:.1f}% to reach 70%')
        print(f'   Need +{80 - avg_c3:.1f}% to reach 80%')
    
    # Identify best and worst sessions
    sessions_by_c3 = sorted(all_data, key=lambda x: x['data']['summary'].get('c3', {}).get('pct', 0), reverse=True)
    
    print(f'\n🏆 BEST SESSION:')
    best = sessions_by_c3[0]
    print(f'   {best["data"]["filename"]}: {best["data"]["summary"]["c3"]["pct"]:.1f}%')
    print(f'   L/H: {best["patterns"]["low_count"]}L/{best["patterns"]["high_count"]}H, Flips: {best["patterns"]["flip_count"]}')
    
    print(f'\n📉 WORST SESSION:')
    worst = sessions_by_c3[-1]
    print(f'   {worst["data"]["filename"]}: {worst["data"]["summary"]["c3"]["pct"]:.1f}%')
    print(f'   L/H: {worst["patterns"]["low_count"]}L/{worst["patterns"]["high_count"]}H, Flips: {worst["patterns"]["flip_count"]}')
    
    # Recommendations
    print(f'\n💡 RECOMMENDATIONS TO REACH 80%:\n')
    
    if avg_c3 < 70:
        print('   1. CRITICAL: Current adaptive thresholds not aggressive enough for 5-min windows')
        print('   2. Consider using threshold=3 for stable 5-min patterns')
        print('   3. Boost confidence when L/H ratio is extreme (>70% or <30%)')
        print('   4. Reduce lookback to 8-10 rolls max for 5-min windows')
    elif avg_c3 < 80:
        print('   1. Fine-tune flip detection for 5-min window characteristics')
        print('   2. Add pattern type detection (stable vs alternating)')
        print('   3. Boost confidence for dominant patterns (>65% L or H)')
        print('   4. Consider early prediction after just 3-4 rolls')

if __name__ == '__main__':
    main()
