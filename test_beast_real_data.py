#!/usr/bin/env python3
"""
Test improved Beast Mode on ACTUAL 2-str data from new debug files
"""

import re
from pathlib import Path
from collections import Counter

def parse_2str_sequence(filepath):
    """Extract 2-str sequence from debug file"""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Find the long string at the end
    match = re.search(r'--- Long String \(chronological\) ---\n(\d+)', content)
    if match:
        sequence = match.group(1)
        # Convert to 2-digit pairs (41, 42, 43, 44)
        rolls = [sequence[i:i+2] for i in range(0, len(sequence), 2)]
        return rolls
    return []

def identify_commons_improved(rolls, lookback=12):
    """Improved commons identification with chaos detection"""
    window = rolls[-lookback:] if len(rolls) > lookback else rolls
    
    if len(window) < 3:
        return None, True, {}
    
    freq = Counter(window)
    sorted_freq = sorted(freq.items(), key=lambda x: x[1], reverse=True)
    total = len(window)
    
    # Calculate percentages
    pcts = {val: (count/total)*100 for val, count in sorted_freq}
    
    # Chaos detection: all values within 10% of each other
    if len(sorted_freq) >= 4:
        max_pct = sorted_freq[0][1] / total * 100
        min_pct = sorted_freq[-1][1] / total * 100
        if max_pct - min_pct < 10:
            return None, True, pcts  # Chaotic
    
    # Minimum threshold: commons must have >15%
    valid_commons = [val for val, count in sorted_freq if (count/total)*100 > 15]
    
    if len(valid_commons) < 2:
        return None, True, pcts  # Chaotic
    
    commons = valid_commons[:2]
    return commons, False, pcts

def predict_improved(rolls, commons, lookback=8):
    """Simulate improved beast mode prediction"""
    if not commons or len(rolls) < 6:
        return None, "insufficient-data"
    
    last_roll = rolls[-1]
    recent = rolls[-lookback:]
    
    # Pattern 1: NOISE RECOVERY (highest priority)
    if last_roll not in commons:
        # Find most recent common
        for i in range(len(rolls)-2, -1, -1):
            if rolls[i] in commons:
                return rolls[i], "noise-recovery"
        return commons[0], "noise-recovery"
    
    # Pattern 2: DOMINANCE (>60%)
    freq = Counter(recent)
    for val in commons:
        pct = (freq.get(val, 0) / len(recent)) * 100
        if pct > 60:
            return val, "dominance"
    
    # Pattern 3: ALTERNATING (>60% flip rate)
    commons_only = [r for r in recent if r in commons]
    if len(commons_only) >= 4:
        flips = sum(1 for i in range(len(commons_only)-1) 
                   if commons_only[i] != commons_only[i+1])
        flip_rate = flips / (len(commons_only)-1) if len(commons_only) > 1 else 0
        
        if flip_rate > 0.6:
            # Predict opposite
            return commons[1] if last_roll == commons[0] else commons[0], "alternating"
    
    # Pattern 4: STICKY (<30% flip rate)
    if len(commons_only) >= 4:
        if flip_rate < 0.3:
            return last_roll, "sticky"
    
    # Pattern 5: RUN-BASED
    run_length = 1
    for i in range(len(recent)-2, -1, -1):
        if recent[i] == last_roll:
            run_length += 1
        else:
            break
    
    if run_length >= 3:
        # Long run - flip to other common
        return commons[1] if last_roll == commons[0] else commons[0], "run-flip"
    elif run_length >= 2:
        return last_roll, "run-continue"
    
    # Default: predict most frequent common
    common_counts = [(c, freq.get(c, 0)) for c in commons]
    common_counts.sort(key=lambda x: x[1], reverse=True)
    return common_counts[0][0], "balanced"

def test_file(filepath):
    """Test improved logic on a debug file"""
    rolls = parse_2str_sequence(filepath)
    if not rolls:
        print(f"❌ Could not parse: {filepath.name}")
        return None
    
    print(f"\n{'='*80}")
    print(f"📊 Testing: {filepath.name}")
    print(f"{'='*80}")
    print(f"Total rolls: {len(rolls)}")
    
    # Show distribution
    freq = Counter(rolls)
    print(f"\nFull session distribution:")
    for val, count in sorted(freq.items(), key=lambda x: x[1], reverse=True):
        pct = (count / len(rolls)) * 100
        print(f"  {val}: {count:3d} ({pct:5.1f}%)")
    
    # Test with rolling window
    correct = 0
    total = 0
    predictions = []
    skipped = 0
    
    for i in range(6, len(rolls)):
        history = rolls[:i]
        actual = rolls[i]
        
        # Identify commons with 12-roll lookback
        commons, is_chaotic, pcts = identify_commons_improved(history, lookback=12)
        
        if is_chaotic:
            skipped += 1
            continue
        
        predicted, pattern = predict_improved(history, commons, lookback=8)
        
        if predicted:
            total += 1
            is_correct = (predicted == actual)
            if is_correct:
                correct += 1
            
            predictions.append({
                'roll_num': i+1,
                'predicted': predicted,
                'actual': actual,
                'correct': is_correct,
                'pattern': pattern,
                'commons': commons
            })
    
    if total == 0:
        print(f"\n❌ No predictions made (all windows chaotic)")
        print(f"   Skipped: {skipped}/{len(rolls)-6} rolls")
        return 0
    
    accuracy = (correct / total) * 100
    print(f"\n🎯 IMPROVED BEAST MODE RESULTS:")
    print(f"   Predictions made: {total}/{len(rolls)-6}")
    print(f"   Skipped (chaotic): {skipped}/{len(rolls)-6}")
    print(f"   Accuracy: {accuracy:.1f}% ({correct}/{total})")
    
    # Pattern breakdown
    pattern_stats = {}
    for p in predictions:
        pat = p['pattern']
        if pat not in pattern_stats:
            pattern_stats[pat] = {'total': 0, 'correct': 0}
        pattern_stats[pat]['total'] += 1
        if p['correct']:
            pattern_stats[pat]['correct'] += 1
    
    print(f"\n📈 Accuracy by Pattern:")
    for pat, stats in sorted(pattern_stats.items(), key=lambda x: x[1]['correct']/x[1]['total'] if x[1]['total'] > 0 else 0, reverse=True):
        pat_acc = (stats['correct'] / stats['total']) * 100 if stats['total'] > 0 else 0
        print(f"   {pat:20s}: {pat_acc:5.1f}% ({stats['correct']}/{stats['total']})")
    
    # Show sample predictions
    print(f"\n✅ Sample Correct Predictions:")
    correct_preds = [p for p in predictions if p['correct']][:5]
    for p in correct_preds:
        print(f"   Roll {p['roll_num']}: {p['predicted']} (pattern: {p['pattern']}, commons: {p['commons']})")
    
    # Show failed predictions
    failed = [p for p in predictions if not p['correct']]
    if failed:
        print(f"\n❌ Sample Failed Predictions ({len(failed)}/{total}):")
        for p in failed[:5]:
            print(f"   Roll {p['roll_num']}: pred={p['predicted']} actual={p['actual']} (pattern: {p['pattern']}, commons: {p['commons']})")
    
    return accuracy

def main():
    debug_dir = Path('d:/Coding/HSR_PatternRecord/debugstxt')
    
    files = [
        'Svarog-Tracer-Debug-00-50-21 (1).txt',
        'Svarog-Tracer-Debug-20-32-55 (2).txt',
        'Svarog-Tracer-Debug-22-05-16 (2).txt',
    ]
    
    print("=" * 80)
    print("🦁 TESTING IMPROVED BEAST MODE ON REAL 2-STR DATA")
    print("=" * 80)
    
    accuracies = []
    for filename in files:
        filepath = debug_dir / filename
        if not filepath.exists():
            print(f"\n❌ File not found: {filename}")
            continue
        
        acc = test_file(filepath)
        if acc is not None and acc > 0:
            accuracies.append(acc)
    
    if accuracies:
        avg_acc = sum(accuracies) / len(accuracies)
        print(f"\n{'='*80}")
        print(f"📊 OVERALL RESULTS")
        print(f"{'='*80}")
        print(f"Average Accuracy: {avg_acc:.1f}%")
        print(f"Files tested: {len(accuracies)}")
        
        if avg_acc >= 70:
            print("✅ TARGET ACHIEVED (≥70%)")
        elif avg_acc >= 60:
            print("⚠️  CLOSE TO TARGET (60-70%)")
        else:
            print("❌ BELOW TARGET (<60%)")
            print("   Note: May need more stable sessions for better results")

if __name__ == '__main__':
    main()
