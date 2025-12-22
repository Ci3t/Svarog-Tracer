#!/usr/bin/env python3
"""
Properly extract and test 2-str sequences from debug files
Extracts from prediction contexts, not the "Long String"
"""

import re
from pathlib import Path
from collections import Counter

def extract_2str_sequence(filepath):
    """Extract 2-str sequence from prediction contexts"""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Find all 2-str predictions
    pattern = r'\[([^\]]+)\] 2-str → pred: ([^\s]+).*?actual: (\d+).*?ctx: ([^\n]+)'
    matches = re.findall(pattern, content)
    
    if not matches:
        return None
    
    # Build sequence from contexts (chronological order)
    # Matches are in reverse chronological order, so reverse them
    matches.reverse()
    
    # Extract the full sequence from contexts
    sequence = []
    for time, pred, actual, ctx in matches:
        # Parse context
        ctx_values = [v.strip() for v in ctx.split(',')]
        # Add context values if not already in sequence
        for val in ctx_values:
            if val and val not in sequence[-5:]:  # Avoid duplicates in recent history
                sequence.append(val)
        # Add actual value
        if actual not in sequence[-2:]:
            sequence.append(actual)
    
    # Filter to only valid 2-str values (41-44)
    valid_sequence = [v for v in sequence if v in ['41', '42', '43', '44']]
    
    return valid_sequence, matches

def test_improved_beast_mode(rolls, filename):
    """Test improved beast mode logic on a sequence"""
    print(f"\n{'='*80}")
    print(f"📊 Testing: {filename}")
    print(f"{'='*80}")
    print(f"Total rolls: {len(rolls)}")
    print(f"Sequence: {' → '.join(rolls)}")
    
    # Analyze distribution
    freq = Counter(rolls)
    print(f"\nDistribution:")
    for val, count in sorted(freq.items(), key=lambda x: x[1], reverse=True):
        pct = (count / len(rolls)) * 100
        print(f"  {val}: {count:2d} ({pct:5.1f}%)")
    
    # Check for chaos
    sorted_freq = sorted(freq.items(), key=lambda x: x[1], reverse=True)
    if len(sorted_freq) >= 4:
        max_pct = sorted_freq[0][1] / len(rolls) * 100
        min_pct = sorted_freq[-1][1] / len(rolls) * 100
        spread = max_pct - min_pct
        print(f"\nSpread (max-min): {spread:.1f}%")
        is_chaotic = spread < 10
        print(f"Chaos detection (10% threshold): {'CHAOTIC ❌' if is_chaotic else 'OK ✅'}")
        
        if is_chaotic:
            print("\n⚠️  Session is chaotic - improved system would SKIP predictions")
            return None
    
    # Identify commons (>15% threshold)
    valid_commons = [val for val, count in sorted_freq if (count/len(rolls))*100 > 15]
    
    if len(valid_commons) < 2:
        print(f"\n❌ Not enough valid commons (>15%) - session is chaotic")
        return None
    
    commons = valid_commons[:2]
    print(f"\n✅ Commons identified: {commons}")
    
    # Calculate commons coverage
    commons_count = sum(freq[c] for c in commons)
    commons_coverage = (commons_count / len(rolls)) * 100
    print(f"   Commons coverage: {commons_coverage:.1f}%")
    
    # Test predictions
    print(f"\n{'='*80}")
    print("TESTING PREDICTIONS")
    print("=" * 80)
    
    correct = 0
    total = 0
    predictions = []
    
    for i in range(6, len(rolls)):
        history = rolls[:i]
        actual = rolls[i]
        last_roll = history[-1]
        recent = history[-8:]
        
        # Pattern detection
        if last_roll not in commons:
            # NOISE RECOVERY
            for j in range(len(history)-2, -1, -1):
                if history[j] in commons:
                    predicted = history[j]
                    break
            else:
                predicted = commons[0]
            pattern = "noise-recovery"
        else:
            # Check for dominance
            freq_recent = Counter(recent)
            for val in commons:
                pct = (freq_recent.get(val, 0) / len(recent)) * 100
                if pct > 60:
                    predicted = val
                    pattern = "dominance"
                    break
            else:
                # Check for alternating
                commons_only = [r for r in recent if r in commons]
                if len(commons_only) >= 4:
                    flips = sum(1 for j in range(len(commons_only)-1) 
                               if commons_only[j] != commons_only[j+1])
                    flip_rate = flips / (len(commons_only)-1) if len(commons_only) > 1 else 0
                    
                    if flip_rate > 0.6:
                        # Alternating
                        predicted = commons[1] if last_roll == commons[0] else commons[0]
                        pattern = "alternating"
                    elif flip_rate < 0.3:
                        # Sticky
                        predicted = last_roll
                        pattern = "sticky"
                    else:
                        # Balanced
                        common_counts = [(c, freq_recent.get(c, 0)) for c in commons]
                        common_counts.sort(key=lambda x: x[1], reverse=True)
                        predicted = common_counts[0][0]
                        pattern = "balanced"
                else:
                    predicted = commons[0]
                    pattern = "balanced"
        
        total += 1
        is_correct = (predicted == actual)
        if is_correct:
            correct += 1
        
        predictions.append({
            'roll_num': i+1,
            'predicted': predicted,
            'actual': actual,
            'correct': is_correct,
            'pattern': pattern
        })
        
        status = "✅" if is_correct else "❌"
        print(f"{status} Roll {i+1}: pred={predicted} actual={actual} (pattern: {pattern})")
    
    if total == 0:
        print("\n⚠️  Not enough rolls for predictions")
        return None
    
    accuracy = (correct / total) * 100
    
    # Pattern breakdown
    pattern_stats = {}
    for p in predictions:
        pat = p['pattern']
        if pat not in pattern_stats:
            pattern_stats[pat] = {'total': 0, 'correct': 0}
        pattern_stats[pat]['total'] += 1
        if p['correct']:
            pattern_stats[pat]['correct'] += 1
    
    print(f"\n{'='*80}")
    print(f"📊 RESULTS")
    print(f"{'='*80}")
    print(f"Accuracy: {accuracy:.1f}% ({correct}/{total})")
    
    print(f"\n📈 Accuracy by Pattern:")
    for pat, stats in sorted(pattern_stats.items(), key=lambda x: x[1]['correct']/x[1]['total'] if x[1]['total'] > 0 else 0, reverse=True):
        pat_acc = (stats['correct'] / stats['total']) * 100 if stats['total'] > 0 else 0
        print(f"   {pat:20s}: {pat_acc:5.1f}% ({stats['correct']}/{stats['total']})")
    
    if accuracy >= 70:
        print("\n✅ TARGET ACHIEVED (≥70%)")
    elif accuracy >= 60:
        print("\n⚠️  CLOSE TO TARGET (60-70%)")
    else:
        print("\n❌ BELOW TARGET (<60%)")
    
    return accuracy

def main():
    debug_dir = Path('d:/Coding/HSR_PatternRecord/debugstxt')
    
    files = [
        'Svarog-Tracer-Debug-14-33-56 (1).txt',
        'Svarog-Tracer-Debug-20-19-26.txt',
    ]
    
    print("=" * 80)
    print("🦁 TESTING IMPROVED BEAST MODE - PROPER 2-STR EXTRACTION")
    print("=" * 80)
    
    accuracies = []
    for filename in files:
        filepath = debug_dir / filename
        if not filepath.exists():
            print(f"\n❌ File not found: {filename}")
            continue
        
        result = extract_2str_sequence(filepath)
        if not result:
            print(f"\n❌ Could not extract 2-str sequence from: {filename}")
            continue
        
        rolls, matches = result
        
        if len(rolls) < 7:
            print(f"\n⚠️  {filename}: Too few rolls ({len(rolls)}) - need at least 7")
            continue
        
        acc = test_improved_beast_mode(rolls, filename)
        if acc is not None:
            accuracies.append(acc)
    
    if accuracies:
        avg_acc = sum(accuracies) / len(accuracies)
        print(f"\n{'='*80}")
        print(f"📊 OVERALL RESULTS")
        print(f"{'='*80}")
        print(f"Average Accuracy: {avg_acc:.1f}%")
        print(f"Files tested: {len(accuracies)}")
        
        if avg_acc >= 70:
            print("\n✅ TARGET ACHIEVED (≥70%)")
        elif avg_acc >= 60:
            print("\n⚠️  CLOSE TO TARGET (60-70%)")
        else:
            print("\n❌ BELOW TARGET (<60%)")

if __name__ == '__main__':
    main()
