"""
Debug File Analysis Script for Kiyo Mode
Analyzes live session debug files to identify failure patterns and calculate accuracy
"""

import re
import json
from pathlib import Path
from collections import defaultdict
from datetime import datetime

def parse_debug_file(filepath):
    """Parse a single debug file and extract all relevant data"""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    data = {
        'filename': Path(filepath).name,
        'total_rolls': 0,
        'rolls': [],
        'predictions': [],
        'wave_accuracy': {'col2': {'hits': 0, 'total': 0}, 'col3': {'hits': 0, 'total': 0}},
        'prefix_accuracy': {'main': 0, 'alt': 0, 'total': 0},
        'patterns': []
    }
    
    # Extract total rolls
    total_match = re.search(r'Total Rolls: (\d+)', content)
    if total_match:
        data['total_rolls'] = int(total_match.group(1))
    
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
                pred = {
                    'idx': int(parts[0]),
                    'time': f"{parts[1]} {parts[2]}",
                    'actual': parts[3],
                    'wave_c2': parts[4],
                    'c2_result': parts[5],
                    'wave_c3': parts[6],
                    'c3_result': parts[7],
                    'prefix': parts[8] if len(parts) > 8 else '-',
                    'prefix_result': parts[9] if len(parts) > 9 else '✗'
                }
                data['predictions'].append(pred)
    
    # Extract pattern analysis
    pattern_match = re.search(r'Roll \| Digit 2.*?\n-+\n(.*?)Current Streaks:', content, re.DOTALL)
    if pattern_match:
        pattern_lines = pattern_match.group(1).strip().split('\n')
        for line in pattern_lines:
            parts = [p.strip() for p in line.split('|')]
            if len(parts) >= 6:
                data['patterns'].append({
                    'roll': parts[0],
                    'digit2': parts[1],
                    'digit3': parts[2],
                    'col2': parts[3],
                    'col3': parts[4],
                    'pattern': parts[5]
                })
    
    return data

def analyze_failures(all_data):
    """Analyze all data to find failure patterns"""
    analysis = {
        'overall_stats': {
            'total_predictions': 0,
            'wave_c2_hits': 0,
            'wave_c2_total': 0,
            'wave_c3_hits': 0,
            'wave_c3_total': 0,
            'prefix_hits': 0,
            'prefix_total': 0,
            'combined_hits': 0,
            'combined_total': 0
        },
        'failure_patterns': {
            'consecutive_misses': [],
            'wrong_flip_predictions': [],
            'prefix_failures': [],
            'pattern_changes': []
        },
        'insights': []
    }
    
    # Aggregate all predictions
    for file_data in all_data:
        for pred in file_data['predictions']:
            analysis['overall_stats']['total_predictions'] += 1
            
            # Wave C2
            if pred['wave_c2'] not in ['-', '[]', '']:
                analysis['overall_stats']['wave_c2_total'] += 1
                if pred['c2_result'] == '✓':
                    analysis['overall_stats']['wave_c2_hits'] += 1
                else:
                    analysis['failure_patterns']['wrong_flip_predictions'].append({
                        'file': file_data['filename'],
                        'idx': pred['idx'],
                        'time': pred['time'],
                        'actual': pred['actual'],
                        'predicted': pred['wave_c2'],
                        'column': 'C2'
                    })
            
            # Wave C3
            if pred['wave_c3'] not in ['-', '[]', '']:
                analysis['overall_stats']['wave_c3_total'] += 1
                if pred['c3_result'] == '✓':
                    analysis['overall_stats']['wave_c3_hits'] += 1
                else:
                    analysis['failure_patterns']['wrong_flip_predictions'].append({
                        'file': file_data['filename'],
                        'idx': pred['idx'],
                        'time': pred['time'],
                        'actual': pred['actual'],
                        'predicted': pred['wave_c3'],
                        'column': 'C3'
                    })
            
            # Combined (both C2 and C3 hit)
            if pred['wave_c2'] not in ['-', '[]', ''] and pred['wave_c3'] not in ['-', '[]', '']:
                analysis['overall_stats']['combined_total'] += 1
                if pred['c2_result'] == '✓' and pred['c3_result'] == '✓':
                    analysis['overall_stats']['combined_hits'] += 1
            
            # Prefix
            if pred['prefix'] != '-':
                analysis['overall_stats']['prefix_total'] += 1
                if pred['prefix_result'] in ['M', 'A']:
                    analysis['overall_stats']['prefix_hits'] += 1
                else:
                    analysis['failure_patterns']['prefix_failures'].append({
                        'file': file_data['filename'],
                        'idx': pred['idx'],
                        'time': pred['time'],
                        'actual': pred['actual'],
                        'predicted': pred['prefix']
                    })
    
    # Calculate accuracy percentages
    stats = analysis['overall_stats']
    wave_c2_acc = (stats['wave_c2_hits'] / stats['wave_c2_total'] * 100) if stats['wave_c2_total'] > 0 else 0
    wave_c3_acc = (stats['wave_c3_hits'] / stats['wave_c3_total'] * 100) if stats['wave_c3_total'] > 0 else 0
    prefix_acc = (stats['prefix_hits'] / stats['prefix_total'] * 100) if stats['prefix_total'] > 0 else 0
    combined_acc = (stats['combined_hits'] / stats['combined_total'] * 100) if stats['combined_total'] > 0 else 0
    
    analysis['insights'].append(f"Wave C2 Accuracy: {wave_c2_acc:.1f}% ({stats['wave_c2_hits']}/{stats['wave_c2_total']})")
    analysis['insights'].append(f"Wave C3 Accuracy: {wave_c3_acc:.1f}% ({stats['wave_c3_hits']}/{stats['wave_c3_total']})")
    analysis['insights'].append(f"Combined Wave Accuracy: {combined_acc:.1f}% ({stats['combined_hits']}/{stats['combined_total']})")
    analysis['insights'].append(f"Prefix Accuracy: {prefix_acc:.1f}% ({stats['prefix_hits']}/{stats['prefix_total']})")
    
    # Identify consecutive miss patterns
    for file_data in all_data:
        consecutive_misses = 0
        start_idx = None
        
        for i, pred in enumerate(file_data['predictions']):
            is_miss = pred['c3_result'] == '✗' and pred['prefix_result'] == '✗'
            
            if is_miss:
                if consecutive_misses == 0:
                    start_idx = pred['idx']
                consecutive_misses += 1
            else:
                if consecutive_misses >= 3:
                    analysis['failure_patterns']['consecutive_misses'].append({
                        'file': file_data['filename'],
                        'start_idx': start_idx,
                        'end_idx': file_data['predictions'][i-1]['idx'],
                        'count': consecutive_misses
                    })
                consecutive_misses = 0
    
    return analysis

def detect_pattern_changes(file_data):
    """Detect when L/H pattern changes significantly"""
    changes = []
    window_size = 6
    
    patterns = file_data['patterns']
    if len(patterns) < window_size * 2:
        return changes
    
    for i in range(window_size, len(patterns) - window_size):
        prev_window = patterns[i - window_size:i]
        curr_window = patterns[i:i + window_size]
        
        # Count L/H distribution
        prev_lh = {'L': 0, 'H': 0}
        curr_lh = {'L': 0, 'H': 0}
        
        for p in prev_window:
            if 'Low' in p['col3']:
                prev_lh['L'] += 1
            else:
                prev_lh['H'] += 1
        
        for p in curr_window:
            if 'Low' in p['col3']:
                curr_lh['L'] += 1
            else:
                curr_lh['H'] += 1
        
        # Detect significant shift
        prev_ratio = prev_lh['L'] / (prev_lh['L'] + prev_lh['H']) if (prev_lh['L'] + prev_lh['H']) > 0 else 0
        curr_ratio = curr_lh['L'] / (curr_lh['L'] + curr_lh['H']) if (curr_lh['L'] + curr_lh['H']) > 0 else 0
        
        if abs(prev_ratio - curr_ratio) > 0.4:
            changes.append({
                'position': i,
                'roll': patterns[i]['roll'],
                'prev_dist': f"L:{prev_lh['L']} H:{prev_lh['H']}",
                'curr_dist': f"L:{curr_lh['L']} H:{curr_lh['H']}",
                'shift': f"{(curr_ratio - prev_ratio):.2f}"
            })
    
    return changes

def generate_recommendations(analysis):
    """Generate actionable recommendations based on analysis"""
    recommendations = []
    
    stats = analysis['overall_stats']
    wave_c2_acc = (stats['wave_c2_hits'] / stats['wave_c2_total']) if stats['wave_c2_total'] > 0 else 0
    wave_c3_acc = (stats['wave_c3_hits'] / stats['wave_c3_total']) if stats['wave_c3_total'] > 0 else 0
    prefix_acc = (stats['prefix_hits'] / stats['prefix_total']) if stats['prefix_total'] > 0 else 0
    combined_acc = (stats['combined_hits'] / stats['combined_total']) if stats['combined_total'] > 0 else 0
    
    if wave_c2_acc < 0.5:
        recommendations.append({
            'priority': 'HIGH',
            'issue': f'Column 2 (Outer/Inner) predictions are unreliable ({wave_c2_acc*100:.1f}%)',
            'solution': 'Disable Column 2 predictions or reduce their weight significantly',
            'impact': '+10-15% overall accuracy'
        })
    
    if wave_c3_acc < 0.7:
        recommendations.append({
            'priority': 'HIGH',
            'issue': f'Column 3 (Low/High) accuracy below target ({wave_c3_acc*100:.1f}%)',
            'solution': 'Implement adaptive thresholds based on recent accuracy + pattern change detection',
            'impact': '+15-20% overall accuracy'
        })
    
    if prefix_acc < 0.3:
        recommendations.append({
            'priority': 'CRITICAL',
            'issue': f'Prefix predictions are catastrophically bad ({prefix_acc*100:.1f}%)',
            'solution': 'Completely redesign prefix prediction algorithm - current approach is worse than random',
            'impact': '+20-30% overall accuracy'
        })
    
    if combined_acc < 0.3:
        recommendations.append({
            'priority': 'CRITICAL',
            'issue': f'Combined predictions nearly useless ({combined_acc*100:.1f}%)',
            'solution': 'Focus on single-column predictions (C3 only) until accuracy improves',
            'impact': '+25-35% overall accuracy'
        })
    
    if len(analysis['failure_patterns']['consecutive_misses']) > 3:
        recommendations.append({
            'priority': 'HIGH',
            'issue': f'Multiple consecutive miss streaks detected ({len(analysis["failure_patterns"]["consecutive_misses"])})',
            'solution': 'Implement pattern change detection to reset predictions when pattern shifts',
            'impact': '+10-15% overall accuracy'
        })
    
    return recommendations

def main():
    """Main execution"""
    debug_dir = Path('d:/Coding/HSR_PatternRecord/debugstxt')
    files = sorted(debug_dir.glob('Kiyo-Debug*.txt'))
    
    print('🔬 Analyzing Debug Files...\n')
    print(f'Found {len(files)} debug files\n')
    
    all_data = [parse_debug_file(f) for f in files]
    
    # Overall analysis
    analysis = analyze_failures(all_data)
    
    print('=' * 70)
    print('📊 OVERALL ACCURACY RESULTS')
    print('=' * 70)
    for insight in analysis['insights']:
        print(f'  {insight}')
    
    print(f'\n❌ FAILURE PATTERNS:')
    print(f'  Consecutive Miss Streaks: {len(analysis["failure_patterns"]["consecutive_misses"])}')
    print(f'  Wrong Flip Predictions: {len(analysis["failure_patterns"]["wrong_flip_predictions"])}')
    print(f'  Prefix Failures: {len(analysis["failure_patterns"]["prefix_failures"])}')
    
    # Pattern changes
    print(f'\n🔄 PATTERN CHANGES DETECTED:')
    for file_data in all_data:
        changes = detect_pattern_changes(file_data)
        if changes:
            print(f'\n  {file_data["filename"]}:')
            for change in changes:
                print(f'    Roll {change["position"]}: {change["prev_dist"]} → {change["curr_dist"]} (shift: {change["shift"]})')
    
    # Recommendations
    recommendations = generate_recommendations(analysis)
    print(f'\n' + '=' * 70)
    print('💡 RECOMMENDATIONS TO REACH 80%+ ACCURACY')
    print('=' * 70)
    for i, rec in enumerate(recommendations, 1):
        print(f'\n{i}. [{rec["priority"]}] {rec["issue"]}')
        print(f'   Solution: {rec["solution"]}')
        print(f'   Expected Impact: {rec["impact"]}')
    
    # Export detailed report
    report = {
        'timestamp': datetime.now().isoformat(),
        'analysis': analysis,
        'recommendations': recommendations,
        'summary': {
            'current_accuracy': {
                'wave_c2': f"{(analysis['overall_stats']['wave_c2_hits'] / analysis['overall_stats']['wave_c2_total'] * 100):.1f}%" if analysis['overall_stats']['wave_c2_total'] > 0 else '0%',
                'wave_c3': f"{(analysis['overall_stats']['wave_c3_hits'] / analysis['overall_stats']['wave_c3_total'] * 100):.1f}%" if analysis['overall_stats']['wave_c3_total'] > 0 else '0%',
                'prefix': f"{(analysis['overall_stats']['prefix_hits'] / analysis['overall_stats']['prefix_total'] * 100):.1f}%" if analysis['overall_stats']['prefix_total'] > 0 else '0%',
                'combined': f"{(analysis['overall_stats']['combined_hits'] / analysis['overall_stats']['combined_total'] * 100):.1f}%" if analysis['overall_stats']['combined_total'] > 0 else '0%'
            },
            'target_accuracy': '80%+',
            'gap_to_target': f"{80 - (analysis['overall_stats']['wave_c3_hits'] / analysis['overall_stats']['wave_c3_total'] * 100):.1f}%" if analysis['overall_stats']['wave_c3_total'] > 0 else '80%'
        }
    }
    
    report_path = debug_dir / 'analysis_report.json'
    with open(report_path, 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=2, ensure_ascii=False)
    
    print(f'\n✅ Analysis complete! Detailed report saved to: {report_path}')
    
    return report

if __name__ == '__main__':
    main()
