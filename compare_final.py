"""
Compare file 20 vs file 21 to see tuning impact
"""

import re
from pathlib import Path

def parse_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    m = re.search(r'Column 2 Hits: (\d+) / (\d+) \(([\d.]+)%\).*?Column 3 Hits: (\d+) / (\d+) \(([\d.]+)%\)', content, re.DOTALL)
    if m:
        return {
            'c2': float(m.group(3)),
            'c3': float(m.group(6)),
            'c2_hits': f"{m.group(1)}/{m.group(2)}",
            'c3_hits': f"{m.group(4)}/{m.group(5)}"
        }
    return None

debug_dir = Path('d:/Coding/HSR_PatternRecord/debugstxt')

file20 = parse_file(debug_dir / 'Kiyo-Debug-v3-2025-12-20 (20).txt')
file21 = parse_file(debug_dir / 'Kiyo-Debug-v3-2025-12-20 (21).txt')

print('🎯 FINAL TUNING RESULTS\n')
print('=' * 80)
print(f'\n{"Version":<20} {"C2 (Target: 5-7/9)":<25} {"C3 (Target: 6-8/9)":<25} {"Average"}')
print('-' * 80)

if file20:
    avg20 = (file20['c2'] + file20['c3']) / 2
    print(f'{"File 20 (Before)":<20} {file20["c2"]:>6.1f}% ({file20["c2_hits"]:<8}) {file20["c3"]:>6.1f}% ({file20["c3_hits"]:<8}) {avg20:>6.1f}%')

if file21:
    avg21 = (file21['c2'] + file21['c3']) / 2
    print(f'{"File 21 (After)":<20} {file21["c2"]:>6.1f}% ({file21["c2_hits"]:<8}) {file21["c3"]:>6.1f}% ({file21["c3_hits"]:<8}) {avg21:>6.1f}%')

print('\n' + '=' * 80)

if file20 and file21:
    c2_change = file21['c2'] - file20['c2']
    c3_change = file21['c3'] - file20['c3']
    
    print(f'\n📈 CHANGE:')
    print(f'   C2: {c2_change:+.1f}%')
    print(f'   C3: {c3_change:+.1f}%')
    
    print(f'\n🎯 TARGET ACHIEVEMENT:')
    
    # Parse hits
    c2_hits = int(file21['c2_hits'].split('/')[0])
    c3_hits = int(file21['c3_hits'].split('/')[0])
    
    # C2 target: 5-7/9
    if c2_hits >= 7:
        print(f'   C2: 🎉 EXCELLENT! {c2_hits}/9 (max target)')
    elif c2_hits >= 5:
        print(f'   C2: ✅ HIT TARGET! {c2_hits}/9')
    else:
        print(f'   C2: ❌ Below target: {c2_hits}/9 (need {5-c2_hits} more)')
    
    # C3 target: 6-8/9
    if c3_hits >= 8:
        print(f'   C3: 🎉 EXCELLENT! {c3_hits}/9 (max target)')
    elif c3_hits >= 6:
        print(f'   C3: ✅ HIT TARGET! {c3_hits}/9')
    else:
        print(f'   C3: ❌ Below target: {c3_hits}/9 (need {6-c3_hits} more)')
    
    avg = (file21['c2'] + file21['c3']) / 2
    print(f'\n📊 OVERALL AVERAGE: {avg:.1f}%')
    
    if avg >= 70:
        print(f'   🎉 HIT 70% TARGET!')
    elif avg >= 60:
        print(f'   ✅ Good! Need +{70-avg:.1f}% for 70%')
    else:
        print(f'   ⚠️ Need +{70-avg:.1f}% for 70%')
