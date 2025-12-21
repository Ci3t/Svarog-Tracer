"""
Quick analysis of file (19) vs previous attempts
"""

import re
from pathlib import Path

def parse_summary(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    wave_match = re.search(r'Column 2 Hits: (\d+) / (\d+) \(([\d.]+)%\).*?Column 3 Hits: (\d+) / (\d+) \(([\d.]+)%\)', content, re.DOTALL)
    
    if wave_match:
        return {
            'c2': float(wave_match.group(3)),
            'c3': float(wave_match.group(6)),
            'c2_hits': f"{wave_match.group(1)}/{wave_match.group(2)}",
            'c3_hits': f"{wave_match.group(4)}/{wave_match.group(5)}"
        }
    return None

debug_dir = Path('d:/Coding/HSR_PatternRecord/debugstxt')

# Compare progression
files = {
    '13 (Before)': parse_summary(debug_dir / 'Kiyo-Debug-v3-2025-12-20 (13).txt'),
    '17 (6-roll lookback)': parse_summary(debug_dir / 'Kiyo-Debug-v3-2025-12-20 (17).txt'),
    '18 (5-roll lookback)': parse_summary(debug_dir / 'Kiyo-Debug-v3-2025-12-20 (18).txt'),
    '19 (Current)': parse_summary(debug_dir / 'Kiyo-Debug-v3-2025-12-20 (19).txt'),
}

print('🔬 PROGRESSION ANALYSIS\n')
print('=' * 80)
print(f'\n{"Version":<25} {"C2 Accuracy":<20} {"C3 Accuracy":<20} {"Average"}')
print('-' * 80)

for name, stats in files.items():
    if stats:
        avg = (stats['c2'] + stats['c3']) / 2
        print(f'{name:<25} {stats["c2"]:>6.1f}% ({stats["c2_hits"]:<8}) {stats["c3"]:>6.1f}% ({stats["c3_hits"]:<8}) {avg:>6.1f}%')

print('\n' + '=' * 80)

# Best results
if files['19 (Current)']:
    current = files['19 (Current)']
    baseline = files['13 (Before)']
    
    print(f'\n📊 CURRENT RESULTS (File 19):')
    print(f'   C2: {current["c2"]:.1f}% ({current["c2_hits"]})')
    print(f'   C3: {current["c3"]:.1f}% ({current["c3_hits"]})')
    print(f'   Average: {(current["c2"] + current["c3"]) / 2:.1f}%')
    
    c2_change = current['c2'] - baseline['c2']
    c3_change = current['c3'] - baseline['c3']
    
    print(f'\n📈 IMPROVEMENT vs BASELINE:')
    print(f'   C2: {c2_change:+.1f}%')
    print(f'   C3: {c3_change:+.1f}%')
    print(f'   Total: {c2_change + c3_change:+.1f}%')
    
    avg = (current["c2"] + current["c3"]) / 2
    if avg >= 70:
        print(f'\n🎉 HIT 70% TARGET! Average: {avg:.1f}%')
    elif avg >= 60:
        print(f'\n✅ Good progress! Need +{70 - avg:.1f}% to hit 70%')
    else:
        print(f'\n⚠️ Need +{70 - avg:.1f}% to hit 70% target')
