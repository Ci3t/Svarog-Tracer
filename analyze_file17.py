"""
Analyze file (17) - the REAL test with alternating detection!
"""

import re
from pathlib import Path

def parse_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Extract summary
    wave_match = re.search(r'Column 2 Hits: (\d+) / (\d+) \(([\d.]+)%\).*?Column 3 Hits: (\d+) / (\d+) \(([\d.]+)%\).*?Combined: (\d+) / (\d+) \(([\d.]+)%\)', content, re.DOTALL)
    
    stats = {}
    if wave_match:
        stats['c2'] = {'hits': int(wave_match.group(1)), 'total': int(wave_match.group(2)), 'pct': float(wave_match.group(3))}
        stats['c3'] = {'hits': int(wave_match.group(4)), 'total': int(wave_match.group(5)), 'pct': float(wave_match.group(6))}
        stats['combined'] = {'hits': int(wave_match.group(7)), 'total': int(wave_match.group(8)), 'pct': float(wave_match.group(9))}
    
    prefix_match = re.search(r'Total: (\d+) / (\d+) \(([\d.]+)%\)', content)
    if prefix_match:
        stats['prefix'] = {'hits': int(prefix_match.group(1)), 'total': int(prefix_match.group(2)), 'pct': float(prefix_match.group(3))}
    
    return stats

debug_dir = Path('d:/Coding/HSR_PatternRecord/debugstxt')

# Compare 13 (before) vs 17 (after with alternating detection)
file13_stats = parse_file(debug_dir / 'Kiyo-Debug-v3-2025-12-20 (13).txt')
file17_stats = parse_file(debug_dir / 'Kiyo-Debug-v3-2025-12-20 (17).txt')

print('🎯 ALTERNATING PATTERN DETECTION - FINAL TEST\n')
print('=' * 80)
print('\n📊 File (13) BEFORE vs File (17) AFTER:\n')
print(f'{"Metric":<20} {"BEFORE (13)":<18} {"AFTER (17)":<18} {"CHANGE":<15} {"STATUS"}')
print('-' * 80)

metrics = [
    ('Wave C2 (O/I)', 'c2'),
    ('Wave C3 (L/H)', 'c3'),
    ('Combined', 'combined'),
    ('Prefix', 'prefix'),
]

total_improvement = 0

for label, key in metrics:
    before = file13_stats[key]['pct']
    before_str = f"{before:.1f}% ({file13_stats[key]['hits']}/{file13_stats[key]['total']})"
    
    after = file17_stats[key]['pct']
    after_str = f"{after:.1f}% ({file17_stats[key]['hits']}/{file17_stats[key]['total']})"
    
    change = after - before
    total_improvement += change
    
    if change >= 20:
        status = '🎉 HUGE WIN!'
    elif change >= 10:
        status = '🎉 BIG WIN'
    elif change > 0:
        status = '✅ IMPROVED'
    elif change == 0:
        status = '➖ SAME'
    elif change > -10:
        status = '⚠️ SLIGHT DOWN'
    else:
        status = '❌ WORSE'
    
    print(f'{label:<20} {before_str:<18} {after_str:<18} {change:>+6.1f}%{"":<8} {status}')

print('\n' + '=' * 80)
print('\n💡 DETAILED ANALYSIS:\n')

# Focus on C2 and C3
c2_change = file17_stats['c2']['pct'] - file13_stats['c2']['pct']
c3_change = file17_stats['c3']['pct'] - file13_stats['c3']['pct']

print(f'📍 Column 2 (Outer/Inner):')
print(f'   {file13_stats["c2"]["pct"]:.1f}% → {file17_stats["c2"]["pct"]:.1f}% ({c2_change:+.1f}%)')
if c2_change >= 10:
    print(f'   🎉 Excellent improvement!')
elif c2_change > 0:
    print(f'   ✅ Improved')
else:
    print(f'   ⚠️ Needs work')

print(f'\n📍 Column 3 (Low/High) - PRIMARY TARGET:')
print(f'   {file13_stats["c3"]["pct"]:.1f}% → {file17_stats["c3"]["pct"]:.1f}% ({c3_change:+.1f}%)')
if c3_change >= 30:
    print(f'   🎉 AMAZING! Alternating detection is working!')
elif c3_change >= 20:
    print(f'   🎉 EXCELLENT! Big improvement!')
elif c3_change >= 10:
    print(f'   ✅ Good improvement')
elif c3_change > 0:
    print(f'   ✅ Slight improvement')
else:
    print(f'   ❌ Still not working - need to debug')

avg_wave = (file17_stats['c2']['pct'] + file17_stats['c3']['pct']) / 2

print(f'\n📊 OVERALL WAVE ACCURACY:')
print(f'   Average: {avg_wave:.1f}%')

if avg_wave >= 70:
    print(f'   🎉 HIT 70% TARGET!')
elif avg_wave >= 60:
    print(f'   ✅ Good! Close to 70% target (need +{70-avg_wave:.1f}%)')
elif avg_wave >= 50:
    print(f'   ⚠️ Moderate (need +{70-avg_wave:.1f}% to hit 70%)')
else:
    print(f'   ❌ Below 50% (need +{70-avg_wave:.1f}% to hit 70%)')

print(f'\n📈 TOTAL IMPROVEMENT: {total_improvement:+.1f}%')

if total_improvement >= 50:
    print(f'   🎉 MASSIVE SUCCESS!')
elif total_improvement >= 30:
    print(f'   🎉 EXCELLENT!')
elif total_improvement >= 10:
    print(f'   ✅ Good progress')
elif total_improvement > 0:
    print(f'   ✅ Slight improvement')
else:
    print(f'   ❌ Need to investigate')

# Check if alternating detection worked
print(f'\n🔍 ALTERNATING DETECTION CHECK:')
if c3_change >= 20:
    print(f'   ✅ Alternating detection is WORKING!')
    print(f'   The 60% threshold and flip logic are correct')
elif c3_change >= 10:
    print(f'   ✅ Partially working, may need fine-tuning')
else:
    print(f'   ❌ Not working as expected')
    print(f'   Need to check if detection is triggering')
