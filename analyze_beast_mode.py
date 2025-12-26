#!/usr/bin/env python3
"""
Analyze 2-Str Beast Mode Debug Files
Calculate accuracy and identify failure patterns
"""

import re
from pathlib import Path
from collections import defaultdict

def parse_debug_file(filepath):
    """Parse a Svarog debug file and extract predictions"""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Extract 2-str predictions
    pattern = r'\[([^\]]+)\] 2-str → pred: ([^\s]+) \((\d+)%\).*?mode: ([^\s]+).*?actual: (\d+)'
    matches = re.findall(pattern, content)
    
    predictions = []
    for time, pred, conf, mode, actual in matches:
        if pred == '—':  # Skip insufficient data
            continue
        predictions.append({
            'time': time,
            'predicted': pred,
            'confidence': int(conf),
            'mode': mode,
            'actual': actual,
            'correct': pred == actual
        })
    
    return predictions

def analyze_predictions(predictions):
    """Calculate accuracy metrics"""
    if not predictions:
        return None
    
    total = len(predictions)
    correct = sum(1 for p in predictions if p['correct'])
    accuracy = (correct / total) * 100
    
    # Accuracy by mode
    by_mode = defaultdict(lambda: {'total': 0, 'correct': 0})
    for p in predictions:
        mode = p['mode']
        by_mode[mode]['total'] += 1
        if p['correct']:
            by_mode[mode]['correct'] += 1
    
    mode_accuracy = {}
    for mode, stats in by_mode.items():
        mode_accuracy[mode] = {
            'accuracy': (stats['correct'] / stats['total']) * 100,
            'total': stats['total'],
            'correct': stats['correct']
        }
    
    # Accuracy by confidence range
    by_confidence = defaultdict(lambda: {'total': 0, 'correct': 0})
    for p in predictions:
        conf = p['confidence']
        if conf >= 65:
            bucket = 'high (65%+)'
        elif conf >= 55:
            bucket = 'medium (55-64%)'
        else:
            bucket = 'low (<55%)'
        
        by_confidence[bucket]['total'] += 1
        if p['correct']:
            by_confidence[bucket]['correct'] += 1
    
    conf_accuracy = {}
    for bucket, stats in by_confidence.items():
        conf_accuracy[bucket] = {
            'accuracy': (stats['correct'] / stats['total']) * 100,
            'total': stats['total'],
            'correct': stats['correct']
        }
    
    return {
        'total': total,
        'correct': correct,
        'accuracy': accuracy,
        'by_mode': mode_accuracy,
        'by_confidence': conf_accuracy,
        'predictions': predictions
    }

def analyze_virtual_columns(predictions):
    """Analyze if Virtual 2-Column approach would improve accuracy"""
    # Extract the actual sequence
    sequence = [p['actual'] for p in predictions]
    
    if len(sequence) < 6:
        return None
    
    # Count frequency of each value
    from collections import Counter
    freq = Counter(sequence)
    sorted_freq = sorted(freq.items(), key=lambda x: x[1], reverse=True)
    
    # Identify commons (top 2) and noise (bottom 2)
    commons = [v for v, _ in sorted_freq[:2]]
    noise = [v for v, _ in sorted_freq[2:]]
    
    # Calculate what would happen if we only predicted commons
    commons_only_correct = sum(1 for actual in sequence if actual in commons)
    commons_coverage = (commons_only_correct / len(sequence)) * 100
    
    # Analyze alternating pattern between commons
    commons_sequence = [v for v in sequence if v in commons]
    if len(commons_sequence) >= 2:
        flips = sum(1 for i in range(len(commons_sequence)-1) 
                   if commons_sequence[i] != commons_sequence[i+1])
        flip_rate = (flips / (len(commons_sequence)-1)) * 100 if len(commons_sequence) > 1 else 0
    else:
        flip_rate = 0
    
    return {
        'commons': commons,
        'noise': noise,
        'frequency': dict(sorted_freq),
        'commons_coverage': commons_coverage,
        'flip_rate': flip_rate,
        'commons_sequence_length': len(commons_sequence)
    }

def main():
    debug_dir = Path('d:/Coding/HSR_PatternRecord/debugstxt')
    
    files = [
        'Svarog-Tracer-Debug-23-38-00.txt',
        'Svarog-Tracer-Debug-02-45-54.txt'
    ]
    
    print("=" * 80)
    print("🦁 BEAST MODE 2-STR ANALYSIS")
    print("=" * 80)
    
    for filename in files:
        filepath = debug_dir / filename
        if not filepath.exists():
            print(f"\n❌ File not found: {filename}")
            continue
        
        print(f"\n\n📊 Analyzing: {filename}")
        print("-" * 80)
        
        predictions = parse_debug_file(filepath)
        
        if not predictions:
            print("No predictions found in file")
            continue
        
        analysis = analyze_predictions(predictions)
        
        print(f"\n📈 Overall Accuracy: {analysis['accuracy']:.1f}% ({analysis['correct']}/{analysis['total']})")
        
        print(f"\n🎯 Accuracy by Mode:")
        for mode, stats in sorted(analysis['by_mode'].items(), key=lambda x: x[1]['accuracy'], reverse=True):
            print(f"  {mode:25s}: {stats['accuracy']:5.1f}% ({stats['correct']}/{stats['total']})")
        
        print(f"\n💪 Accuracy by Confidence:")
        for bucket, stats in sorted(analysis['by_confidence'].items()):
            print(f"  {bucket:20s}: {stats['accuracy']:5.1f}% ({stats['correct']}/{stats['total']})")
        
        # Virtual column analysis
        vc_analysis = analyze_virtual_columns(predictions)
        if vc_analysis:
            print(f"\n🔍 Virtual 2-Column Analysis:")
            print(f"  Commons (top 2): {vc_analysis['commons']}")
            print(f"  Noise (bottom): {vc_analysis['noise']}")
            print(f"  Frequency distribution: {vc_analysis['frequency']}")
            print(f"  Commons coverage: {vc_analysis['commons_coverage']:.1f}%")
            print(f"  Flip rate between commons: {vc_analysis['flip_rate']:.1f}%")
        
        # Find worst predictions
        print(f"\n❌ Sample Failed Predictions:")
        failed = [p for p in predictions if not p['correct']][:5]
        for p in failed:
            print(f"  [{p['time']}] pred: {p['predicted']} ({p['confidence']}%) | actual: {p['actual']} | mode: {p['mode']}")
    
    print("\n" + "=" * 80)
    print("✅ Analysis Complete")
    print("=" * 80)

if __name__ == '__main__':
    main()
