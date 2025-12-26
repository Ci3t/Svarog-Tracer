"""
Quick comparison of file (10) vs file (11) to see tuning improvements
"""

import re
from pathlib import Path

def parse_summary(filepath):
    """Extract summary stats from debug file"""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    stats = {'filename': Path(filepath).name}
    
    # Wave performance
    wave_match = re.search(r'Column 2 Hits: (\d+) / (\d+) \(([\d.]+)%\).*?Column 3 Hits: (\d+) / (\d+) \(([\d.]+)%\).*?Combined: (\d+) / (\d+) \(([\d.]+)%\)', content, re.DOTALL)
    if wave_match:
        stats['c2'] = {'hits': int(wave_match.group(1)), 'total': int(wave_match.group(2)), 'pct': float(wave_match.group(3))}
        stats['c3'] = {'hits': int(wave_match.group(4)), 'total': int(wave_match.group(5)), 'pct': float(wave_match.group(6))}
        stats['combined'] = {'hits': int(wave_match.group(7)), 'total': int(wave_match.group(8)), 'pct': float(wave_match.group(9))}
    
    # Prefix
    prefix_match = re.search(r'Total: (\d+) / (\d+) \(([\d.]+)%\)', content)
    if prefix_match:
        stats['prefix'] = {'hits': int(prefix_match.group(1)), 'total': int(prefix_match.group(2)), 'pct': float(prefix_match.group(3))}
    
    return stats

debug_dir = Path('d:/Coding/HSR_PatternRecord/debugstxt')

file10 = parse_summary(debug_dir / 'Kiyo-Debug-v3-2025-12-20 (10).txt')
file11 = parse_summary(debug_dir / 'Kiyo-Debug-v3-2025-12-20 (11).txt')

print('🔬 TUNING RESULTS COMPARISON\n')
print('=' * 70)
print(f'\n📊 BEFORE TUNING (File 10) vs AFTER TUNING (File 11):\n')
print(f'{"Metric":<20} {"BEFORE (10)":<15} {"AFTER (11)":<15} {"CHANGE":<15} {"STATUS"}')
print('-' * 70)

metrics = [
    ('Wave C2 (O/I)', 'c2'),
    ('Wave C3 (L/H)', 'c3'),
    ('Prefix', 'prefix'),
    ('Combined', 'combined'),
]

total_improvement = 0

for label, key in metrics:
    before = file10[key]['pct']
    after = file11[key]['pct']
    change = after - before
    total_improvement += change
    
    status = '✅ IMPROVED' if change > 5 else '➕ SLIGHT UP' if change > 0 else '➖ SAME' if change == 0 else '⚠️ SLIGHT DOWN' if change > -5 else '❌ WORSE'
    
    print(f'{label:<20} {before:>6.1f}%{"":<8} {after:>6.1f}%{"":<8} {change:>+6.1f}%{"":<8} {status}')

print('\n' + '=' * 70)
print(f'\n💡 ANALYSIS:\n')

if file11['c3']['pct'] > file10['c3']['pct']:
    print(f'✅ Wave C3 IMPROVED: {file10["c3"]["pct"]:.1f}% → {file11["c3"]["pct"]:.1f}% (+{file11["c3"]["pct"] - file10["c3"]["pct"]:.1f}%)')
    print('   🎉 Tuning fixes worked! More conservative thresholds helped.')
elif file11['c3']['pct'] == file10['c3']['pct']:
    print(f'➖ Wave C3 UNCHANGED: {file11["c3"]["pct"]:.1f}%')
    print('   Pattern might be similar, need more testing.')
else:
    print(f'⚠️ Wave C3 STILL STRUGGLING: {file10["c3"]["pct"]:.1f}% → {file11["c3"]["pct"]:.1f}% ({file11["c3"]["pct"] - file10["c3"]["pct"]:.1f}%)')
    print('   May need further tuning or different pattern.')

if file11['c2']['pct'] > file10['c2']['pct']:
    print(f'\n✅ Wave C2 IMPROVED: {file10["c2"]["pct"]:.1f}% → {file11["c2"]["pct"]:.1f}% (+{file11["c2"]["pct"] - file10["c2"]["pct"]:.1f}%)')

if file11['prefix']['pct'] < file10['prefix']['pct']:
    print(f'\n⚠️ Prefix REGRESSED: {file10["prefix"]["pct"]:.1f}% → {file11["prefix"]["pct"]:.1f}% ({file11["prefix"]["pct"] - file10["prefix"]["pct"]:.1f}%)')
    print('   This is concerning - live data priority might need adjustment.')
elif file11['prefix']['pct'] == file10['prefix']['pct']:
    print(f'\n➖ Prefix UNCHANGED: {file11["prefix"]["pct"]:.1f}%')

print(f'\n📈 NET CHANGE: {total_improvement:+.1f}%')

if total_improvement > 10:
    print('   🎉 Significant overall improvement!')
elif total_improvement > 0:
    print('   ✅ Positive trend')
else:
    print('   ⚠️ Need more tuning')

print(f'\n🎯 DISTANCE TO 80% TARGET:')
print(f'   Wave C3: {file11["c3"]["pct"]:.1f}% (need +{80 - file11["c3"]["pct"]:.1f}%)')
print(f'   Prefix: {file11["prefix"]["pct"]:.1f}% (need +{70 - file11["prefix"]["pct"]:.1f}%)')
