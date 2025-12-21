"""
Compare file (13) BEFORE vs file (14) AFTER alternating detection
Focus on BOTH Col2 and Col3
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
    
    # Parse tracking table for detailed analysis
    table_match = re.search(r'Idx  Time.*?\n-+\n(.*?)\n\n', content, re.DOTALL)
    predictions = []
    if table_match:
        for line in table_match.group(1).strip().split('\n'):
            parts = line.split()
            if len(parts) >= 9:
                predictions.append({
                    'idx': int(parts[0]),
                    'actual': parts[3],
                    'wave_c2': parts[4],
                    'c2_result': parts[5],
                    'wave_c3': parts[6],
                    'c3_result': parts[7],
                })
    
    return stats, predictions

debug_dir = Path('d:/Coding/HSR_PatternRecord/debugstxt')

file13_stats, file13_preds = parse_file(debug_dir / 'Kiyo-Debug-v3-2025-12-20 (13).txt')
file14_stats, file14_preds = parse_file(debug_dir / 'Kiyo-Debug-v3-2025-12-20 (14).txt')

print('🔬 ALTERNATING PATTERN DETECTION - BEFORE vs AFTER\n')
print('=' * 80)
print('\n📊 COMPARISON (Same rolls from session):\n')
print(f'{"Metric":<20} {"BEFORE (13)":<18} {"AFTER (14)":<18} {"CHANGE":<15} {"STATUS"}')
print('-' * 80)

metrics = [
    ('Wave C2 (O/I)', 'c2'),
    ('Wave C3 (L/H)', 'c3'),
    ('Combined', 'combined'),
    ('Prefix', 'prefix'),
]

improvements = []
regressions = []

for label, key in metrics:
    before = file13_stats[key]['pct']
    before_str = f"{before:.1f}% ({file13_stats[key]['hits']}/{file13_stats[key]['total']})"
    
    after = file14_stats[key]['pct']
    after_str = f"{after:.1f}% ({file14_stats[key]['hits']}/{file14_stats[key]['total']})"
    
    change = after - before
    
    if change > 10:
        status = '🎉 BIG WIN'
        improvements.append((label, change))
    elif change > 0:
        status = '✅ IMPROVED'
        improvements.append((label, change))
    elif change == 0:
        status = '➖ SAME'
    elif change > -10:
        status = '⚠️ SLIGHT DOWN'
        regressions.append((label, abs(change)))
    else:
        status = '❌ WORSE'
        regressions.append((label, abs(change)))
    
    print(f'{label:<20} {before_str:<18} {after_str:<18} {change:>+6.1f}%{"":<8} {status}')

print('\n' + '=' * 80)
print('\n💡 DETAILED ANALYSIS:\n')

# Col2 analysis
c2_change = file14_stats['c2']['pct'] - file13_stats['c2']['pct']
print(f'📍 Column 2 (Outer/Inner):')
print(f'   Before: {file13_stats["c2"]["pct"]:.1f}% ({file13_stats["c2"]["hits"]}/{file13_stats["c2"]["total"]})')
print(f'   After:  {file14_stats["c2"]["pct"]:.1f}% ({file14_stats["c2"]["hits"]}/{file14_stats["c2"]["total"]})')
print(f'   Change: {c2_change:+.1f}%')
if c2_change > 0:
    print(f'   ✅ Improved! Alternating detection helped C2 as well')
elif c2_change < 0:
    print(f'   ⚠️ Slight regression - may need C2-specific tuning')
else:
    print(f'   ➖ No change')

# Col3 analysis
c3_change = file14_stats['c3']['pct'] - file13_stats['c3']['pct']
print(f'\n📍 Column 3 (Low/High):')
print(f'   Before: {file13_stats["c3"]["pct"]:.1f}% ({file13_stats["c3"]["hits"]}/{file13_stats["c3"]["total"]})')
print(f'   After:  {file14_stats["c3"]["pct"]:.1f}% ({file14_stats["c3"]["hits"]}/{file14_stats["c3"]["total"]})')
print(f'   Change: {c3_change:+.1f}%')
if c3_change > 0:
    print(f'   ✅ Improved!')
elif c3_change < 0:
    print(f'   ❌ Regression - alternating detection may not be working')
else:
    print(f'   ➖ No change')

# Combined analysis
combined_change = file14_stats['combined']['pct'] - file13_stats['combined']['pct']
print(f'\n📍 Combined (Both columns agree):')
print(f'   Before: {file13_stats["combined"]["pct"]:.1f}% ({file13_stats["combined"]["hits"]}/{file13_stats["combined"]["total"]})')
print(f'   After:  {file14_stats["combined"]["pct"]:.1f}% ({file14_stats["combined"]["hits"]}/{file14_stats["combined"]["total"]})')
print(f'   Change: {combined_change:+.1f}%')

# Overall verdict
print(f'\n📈 OVERALL VERDICT:\n')

total_change = c2_change + c3_change
avg_change = total_change / 2

if avg_change > 10:
    print(f'   🎉 EXCELLENT! Average improvement: {avg_change:+.1f}%')
    print(f'   Alternating detection is working!')
elif avg_change > 0:
    print(f'   ✅ POSITIVE! Average improvement: {avg_change:+.1f}%')
    print(f'   Some improvement, may need more tuning')
elif avg_change == 0:
    print(f'   ➖ NO CHANGE: {avg_change:.1f}%')
    print(f'   Alternating detection may not be triggering')
else:
    print(f'   ❌ REGRESSION: Average change: {avg_change:+.1f}%')
    print(f'   Need to debug alternating detection logic')

# Check if alternating was detected
print(f'\n🔍 PATTERN ANALYSIS:')
print(f'   File 13 had 7 flips in 11 rolls = 63.6% alternation rate')
print(f'   Should trigger alternating detection (threshold: 66%)')
print(f'   ')
if c3_change < -5:
    print(f'   ⚠️ C3 got WORSE - alternating detection may not be working correctly')
    print(f'   Need to check if detection is triggering')
elif c3_change > 5:
    print(f'   ✅ C3 improved - alternating detection likely working!')
else:
    print(f'   ➖ Minimal change - need more data or threshold adjustment')

# Recommendations
print(f'\n💡 NEXT STEPS:\n')
if avg_change < 5:
    print(f'   1. Check if alternating detection is actually triggering')
    print(f'   2. May need to lower threshold from 66% to 60%')
    print(f'   3. Verify the flip prediction logic for alternating patterns')
    print(f'   4. Add debug logging to see which strategy is being used')
else:
    print(f'   1. ✅ Keep current alternating detection')
    print(f'   2. Test with more 5-minute sessions')
    print(f'   3. Fine-tune confidence levels')
    print(f'   4. Consider adding C2-specific alternating detection')
