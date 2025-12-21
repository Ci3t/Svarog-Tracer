"""
Analyze the new debug file (10) to compare before/after accuracy
"""

import re
from pathlib import Path

def parse_debug_file_quick(filepath):
    """Quick parse to extract accuracy stats"""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    stats = {
        'filename': Path(filepath).name,
        'total_rolls': 0,
        'wave_c2': {'hits': 0, 'total': 0, 'pct': 0},
        'wave_c3': {'hits': 0, 'total': 0, 'pct': 0},
        'prefix': {'hits': 0, 'total': 0, 'pct': 0},
        'combined': {'hits': 0, 'total': 0, 'pct': 0},
        'aligned': {'hits': 0, 'total': 0, 'pct': 0}
    }
    
    # Extract total rolls
    total_match = re.search(r'Total Rolls: (\d+)', content)
    if total_match:
        stats['total_rolls'] = int(total_match.group(1))
    
    # Extract wave performance
    wave_match = re.search(r'WAVE PERFORMANCE:.*?Column 2 Hits: (\d+) / (\d+) \(([\d.]+)%\).*?Column 3 Hits: (\d+) / (\d+) \(([\d.]+)%\).*?Combined: (\d+) / (\d+) \(([\d.]+)%\)', content, re.DOTALL)
    if wave_match:
        stats['wave_c2'] = {
            'hits': int(wave_match.group(1)),
            'total': int(wave_match.group(2)),
            'pct': float(wave_match.group(3))
        }
        stats['wave_c3'] = {
            'hits': int(wave_match.group(4)),
            'total': int(wave_match.group(5)),
            'pct': float(wave_match.group(6))
        }
        stats['combined'] = {
            'hits': int(wave_match.group(7)),
            'total': int(wave_match.group(8)),
            'pct': float(wave_match.group(9))
        }
    
    # Extract prefix performance
    prefix_match = re.search(r'PREFIX PERFORMANCE:.*?Total: (\d+) / (\d+) \(([\d.]+)%\)', content, re.DOTALL)
    if prefix_match:
        stats['prefix'] = {
            'hits': int(prefix_match.group(1)),
            'total': int(prefix_match.group(2)),
            'pct': float(prefix_match.group(3))
        }
    
    # Extract aligned bets
    aligned_match = re.search(r'ALIGNED BETS.*?Hits: (\d+) / (\d+) \(([\d.]+)%\)', content, re.DOTALL)
    if aligned_match:
        stats['aligned'] = {
            'hits': int(aligned_match.group(1)),
            'total': int(aligned_match.group(2)),
            'pct': float(aligned_match.group(3))
        }
    
    return stats

def compare_results():
    debug_dir = Path('d:/Coding/HSR_PatternRecord/debugstxt')
    
    # Get baseline (files 5-8, before changes)
    baseline_files = [
        debug_dir / 'Kiyo-Debug-v3-2025-12-20 (5).txt',
        debug_dir / 'Kiyo-Debug-v3-2025-12-20 (6).txt',
        debug_dir / 'Kiyo-Debug-v3-2025-12-20 (7).txt',
        debug_dir / 'Kiyo-Debug-v3-2025-12-20 (8).txt',
    ]
    
    # Get new file (after changes)
    new_file = debug_dir / 'Kiyo-Debug-v3-2025-12-20 (10).txt'
    
    print('🔬 BEFORE vs AFTER COMPARISON\n')
    print('=' * 80)
    
    # Calculate baseline averages
    baseline_stats = {
        'wave_c2': [],
        'wave_c3': [],
        'prefix': [],
        'combined': [],
        'aligned': []
    }
    
    for filepath in baseline_files:
        if filepath.exists():
            stats = parse_debug_file_quick(filepath)
            baseline_stats['wave_c2'].append(stats['wave_c2']['pct'])
            baseline_stats['wave_c3'].append(stats['wave_c3']['pct'])
            baseline_stats['prefix'].append(stats['prefix']['pct'])
            baseline_stats['combined'].append(stats['combined']['pct'])
            baseline_stats['aligned'].append(stats['aligned']['pct'])
    
    baseline_avg = {
        'wave_c2': sum(baseline_stats['wave_c2']) / len(baseline_stats['wave_c2']),
        'wave_c3': sum(baseline_stats['wave_c3']) / len(baseline_stats['wave_c3']),
        'prefix': sum(baseline_stats['prefix']) / len(baseline_stats['prefix']),
        'combined': sum(baseline_stats['combined']) / len(baseline_stats['combined']),
        'aligned': sum(baseline_stats['aligned']) / len(baseline_stats['aligned'])
    }
    
    # Get new results
    new_stats = parse_debug_file_quick(new_file)
    
    print('\n📊 ACCURACY COMPARISON:\n')
    print(f'{"Metric":<20} {"BEFORE":<15} {"AFTER":<15} {"CHANGE":<15} {"STATUS"}')
    print('-' * 80)
    
    metrics = [
        ('Wave C2 (O/I)', 'wave_c2'),
        ('Wave C3 (L/H)', 'wave_c3'),
        ('Prefix', 'prefix'),
        ('Combined', 'combined'),
        ('Aligned Bets', 'aligned')
    ]
    
    improvements = []
    regressions = []
    
    for label, key in metrics:
        before = baseline_avg[key]
        after = new_stats[key]['pct']
        change = after - before
        
        if change > 0:
            status = '✅ IMPROVED'
            improvements.append((label, change))
        elif change < 0:
            status = '❌ WORSE'
            regressions.append((label, abs(change)))
        else:
            status = '➖ SAME'
        
        print(f'{label:<20} {before:>6.1f}%{"":<8} {after:>6.1f}%{"":<8} {change:>+6.1f}%{"":<8} {status}')
    
    print('\n' + '=' * 80)
    print('\n💡 SUMMARY:\n')
    
    if improvements:
        print('✅ IMPROVEMENTS:')
        for label, change in improvements:
            print(f'   {label}: +{change:.1f}%')
    
    if regressions:
        print('\n❌ REGRESSIONS:')
        for label, change in regressions:
            print(f'   {label}: -{change:.1f}%')
    
    # Overall verdict
    total_change = sum(change for _, change in improvements) - sum(change for _, change in regressions)
    
    print(f'\n📈 OVERALL CHANGE: {total_change:+.1f}%')
    
    if total_change > 10:
        print('   🎉 SIGNIFICANT IMPROVEMENT!')
    elif total_change > 0:
        print('   ✅ Slight improvement')
    elif total_change == 0:
        print('   ➖ No change')
    else:
        print('   ⚠️ Performance decreased')
    
    # Detailed new stats
    print(f'\n📋 DETAILED NEW RESULTS (File 10):')
    print(f'   Total Rolls: {new_stats["total_rolls"]}')
    print(f'   Wave C2: {new_stats["wave_c2"]["hits"]}/{new_stats["wave_c2"]["total"]} ({new_stats["wave_c2"]["pct"]:.1f}%)')
    print(f'   Wave C3: {new_stats["wave_c3"]["hits"]}/{new_stats["wave_c3"]["total"]} ({new_stats["wave_c3"]["pct"]:.1f}%)')
    print(f'   Prefix: {new_stats["prefix"]["hits"]}/{new_stats["prefix"]["total"]} ({new_stats["prefix"]["pct"]:.1f}%)')
    print(f'   Combined: {new_stats["combined"]["hits"]}/{new_stats["combined"]["total"]} ({new_stats["combined"]["pct"]:.1f}%)')
    
    # Check if we hit 80% target
    print(f'\n🎯 TARGET ACHIEVEMENT:')
    target = 80.0
    
    if new_stats['wave_c3']['pct'] >= target:
        print(f'   ✅ Wave C3 HIT TARGET: {new_stats["wave_c3"]["pct"]:.1f}% >= {target}%')
    else:
        gap = target - new_stats['wave_c3']['pct']
        print(f'   ⚠️ Wave C3 below target: {new_stats["wave_c3"]["pct"]:.1f}% (need +{gap:.1f}%)')
    
    if new_stats['prefix']['pct'] >= 70:
        print(f'   ✅ Prefix HIT TARGET: {new_stats["prefix"]["pct"]:.1f}% >= 70%')
    else:
        gap = 70 - new_stats['prefix']['pct']
        print(f'   ⚠️ Prefix below target: {new_stats["prefix"]["pct"]:.1f}% (need +{gap:.1f}%)')

if __name__ == '__main__':
    compare_results()
