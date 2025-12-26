"""
Deep analysis of which columns/predictions work best per 5-minute window
Goal: Find patterns to adaptively select best predictor per window
"""

import re
import json
from pathlib import Path
from collections import defaultdict
from datetime import datetime, timedelta

def parse_time(time_str):
    """Convert '06:12:03 PM' to datetime"""
    try:
        return datetime.strptime(time_str, '%I:%M:%S %p')
    except:
        return None

def get_5min_window(dt):
    """Get 5-minute window key"""
    if not dt:
        return None
    minute_bucket = (dt.minute // 5) * 5
    return f"{dt.hour:02d}:{minute_bucket:02d}"

def analyze_per_window_performance(debug_files):
    """Analyze which column performs best in each 5-min window"""
    
    window_stats = defaultdict(lambda: {
        'c2': {'hits': [], 'misses': [], 'predictions': []},
        'c3': {'hits': [], 'misses': [], 'predictions': []},
        'prefix': {'hits': [], 'misses': [], 'predictions': []},
        'rolls': [],
        'patterns': []
    })
    
    for filepath in debug_files:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Parse tracking table
        table_match = re.search(r'Idx  Time.*?\n-+\n(.*?)\n\n', content, re.DOTALL)
        if not table_match:
            continue
            
        table_lines = table_match.group(1).strip().split('\n')
        
        for line in table_lines:
            parts = line.split()
            if len(parts) < 9:
                continue
                
            idx = int(parts[0])
            time_str = f"{parts[1]} {parts[2]}"
            actual = parts[3]
            wave_c2 = parts[4]
            c2_result = parts[5]
            wave_c3 = parts[6]
            c3_result = parts[7]
            prefix = parts[8] if len(parts) > 8 else '-'
            prefix_result = parts[9] if len(parts) > 9 else '✗'
            
            dt = parse_time(time_str)
            window_key = get_5min_window(dt)
            
            if not window_key:
                continue
            
            w = window_stats[window_key]
            w['rolls'].append(actual)
            
            # Track C2
            if wave_c2 not in ['-', '[]', '']:
                w['c2']['predictions'].append(wave_c2)
                if c2_result == '✓':
                    w['c2']['hits'].append(actual)
                else:
                    w['c2']['misses'].append(actual)
            
            # Track C3
            if wave_c3 not in ['-', '[]', '']:
                w['c3']['predictions'].append(wave_c3)
                if c3_result == '✓':
                    w['c3']['hits'].append(actual)
                else:
                    w['c3']['misses'].append(actual)
            
            # Track Prefix
            if prefix != '-':
                w['prefix']['predictions'].append(prefix)
                if prefix_result in ['M', 'A']:
                    w['prefix']['hits'].append(actual)
                else:
                    w['prefix']['misses'].append(actual)
    
    return window_stats

def calculate_window_accuracy(window_data):
    """Calculate accuracy for each predictor in a window"""
    results = {}
    
    for predictor in ['c2', 'c3', 'prefix']:
        data = window_data[predictor]
        total = len(data['predictions'])
        hits = len(data['hits'])
        acc = (hits / total * 100) if total > 0 else 0
        results[predictor] = {
            'accuracy': acc,
            'hits': hits,
            'total': total
        }
    
    return results

def identify_best_predictor_per_window(window_stats):
    """Identify which predictor works best in each window"""
    
    analysis = {}
    
    for window_key in sorted(window_stats.keys()):
        w = window_stats[window_key]
        acc = calculate_window_accuracy(w)
        
        # Find best predictor
        best = max(acc.items(), key=lambda x: x[1]['accuracy'])
        
        # Analyze pattern in this window
        rolls = w['rolls']
        if len(rolls) >= 3:
            # Count L/H distribution
            low_count = sum(1 for r in rolls if r[2] in ['1', '2'])
            high_count = sum(1 for r in rolls if r[2] in ['3', '4'])
            total = low_count + high_count
            
            pattern_type = 'BALANCED'
            if total > 0:
                low_ratio = low_count / total
                if low_ratio > 0.7:
                    pattern_type = 'LOW_DOMINANT'
                elif low_ratio < 0.3:
                    pattern_type = 'HIGH_DOMINANT'
                elif 0.4 <= low_ratio <= 0.6:
                    pattern_type = 'BALANCED'
                else:
                    pattern_type = 'MIXED'
        else:
            pattern_type = 'INSUFFICIENT_DATA'
        
        analysis[window_key] = {
            'best_predictor': best[0],
            'best_accuracy': best[1]['accuracy'],
            'all_accuracies': acc,
            'pattern_type': pattern_type,
            'roll_count': len(rolls),
            'low_high_ratio': f"{low_count}/{high_count}" if 'low_count' in locals() else 'N/A'
        }
    
    return analysis

def main():
    debug_dir = Path('d:/Coding/HSR_PatternRecord/debugstxt')
    files = sorted(debug_dir.glob('Kiyo-Debug*.txt'))
    
    print('🔍 DEEP WINDOW ANALYSIS\n')
    print('=' * 80)
    
    window_stats = analyze_per_window_performance(files)
    analysis = identify_best_predictor_per_window(window_stats)
    
    print(f'\n📊 PER-WINDOW PERFORMANCE BREAKDOWN:\n')
    print(f'{"Window":<10} {"Best":<8} {"C2 Acc":<10} {"C3 Acc":<10} {"Prefix":<10} {"Pattern":<15} {"L/H Ratio"}')
    print('-' * 80)
    
    for window_key in sorted(analysis.keys()):
        a = analysis[window_key]
        acc = a['all_accuracies']
        
        c2_str = f"{acc['c2']['accuracy']:.1f}% ({acc['c2']['total']})"
        c3_str = f"{acc['c3']['accuracy']:.1f}% ({acc['c3']['total']})"
        prefix_str = f"{acc['prefix']['accuracy']:.1f}% ({acc['prefix']['total']})"
        
        best_marker = {
            'c2': '→ C2',
            'c3': '→ C3',
            'prefix': '→ PRE'
        }[a['best_predictor']]
        
        print(f"{window_key:<10} {best_marker:<8} {c2_str:<10} {c3_str:<10} {prefix_str:<10} {a['pattern_type']:<15} {a['low_high_ratio']}")
    
    # Summary insights
    print(f'\n💡 KEY INSIGHTS:\n')
    
    c3_wins = sum(1 for a in analysis.values() if a['best_predictor'] == 'c3')
    c2_wins = sum(1 for a in analysis.values() if a['best_predictor'] == 'c2')
    prefix_wins = sum(1 for a in analysis.values() if a['best_predictor'] == 'prefix')
    
    print(f'  Best Predictor Distribution:')
    print(f'    C3 (Low/High): {c3_wins} windows')
    print(f'    C2 (Outer/Inner): {c2_wins} windows')
    print(f'    Prefix: {prefix_wins} windows')
    
    # Pattern correlation
    print(f'\n  Pattern Type Correlation:')
    pattern_predictor = defaultdict(lambda: {'c2': 0, 'c3': 0, 'prefix': 0})
    for a in analysis.values():
        pattern_predictor[a['pattern_type']][a['best_predictor']] += 1
    
    for pattern, counts in sorted(pattern_predictor.items()):
        print(f'    {pattern}: C2={counts["c2"]}, C3={counts["c3"]}, Prefix={counts["prefix"]}')
    
    # Recommendations
    print(f'\n🎯 ADAPTIVE STRATEGY RECOMMENDATIONS:\n')
    print(f'  1. Use C3 as PRIMARY predictor (wins {c3_wins}/{len(analysis)} windows)')
    print(f'  2. Track per-window accuracy in real-time')
    print(f'  3. Switch to best-performing predictor after 3-4 rolls per window')
    print(f'  4. Use prefix as TIEBREAKER when C2/C3 disagree')
    print(f'  5. Boost confidence when multiple predictors agree')
    
    # Export
    report = {
        'window_analysis': analysis,
        'summary': {
            'c3_wins': c3_wins,
            'c2_wins': c2_wins,
            'prefix_wins': prefix_wins,
            'pattern_correlation': dict(pattern_predictor)
        }
    }
    
    output_path = debug_dir / 'window_analysis.json'
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=2)
    
    print(f'\n✅ Detailed analysis saved to: {output_path}')

if __name__ == '__main__':
    main()
