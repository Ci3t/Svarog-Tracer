#!/usr/bin/env python3
"""
Test the improved Beast Mode logic with historical data
Simulates what the NEW code would predict
"""

import re
from pathlib import Path
from collections import Counter

def parse_actual_sequence(filepath):
    """Extract the actual roll sequence from debug file"""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Find the long string at the end
    match = re.search(r'--- Long String \(chronological\) ---\n(\d+)', content)
    if match:
        sequence = match.group(1)
        # Convert to 2-digit pairs
        rolls = [sequence[i:i+2] for i in range(0, len(sequence), 2)]
        return rolls
    return []

def identify_commons_improved(rolls):
    """Improved commons identification with chaos detection"""
    if len(rolls) < 3:
        return None, True
    
    freq = Counter(rolls)
    sorted_freq = sorted(freq.items(), key=lambda x: x[1], reverse=True)
    total = len(rolls)
    
    # Calculate percentages
    pcts = [(val, (count/total)*100) for val, count in sorted_freq]
    
    # Chaos detection: all values within 10% of each other
    if len(pcts) >= 4:
        max_pct = pcts[0][1]
        min_pct = pcts[-1][1]
        if max_pct - min_pct < 10:
            return None, True  # Chaotic
    
    # Minimum threshold: commons must have >15%
    valid_commons = [val for val, pct in pcts if pct > 15]
    
    if len(valid_commons) < 2:
        return None, True  # Chaotic
    
    commons = valid_commons[:2]
    return commons, False

def predict_with_improved_logic(rolls, commons):
    """Simulate improved beast mode prediction"""
    if not commons or len(rolls) < 6:
        return None
    
    last_roll = rolls[-1]
    
    # CRITICAL: If last roll is noise, predict snap-back to common
    if last_roll not in commons:
        # Find most recent common
        for i in range(len(rolls)-2, -1, -1):
            if rolls[i] in commons:
                return rolls[i]
        return commons[0]  # Fallback
    
    # Check for dominance (>60%)
    recent = rolls[-8:]
    freq = Counter(recent)
    for val in commons:
        pct = (freq.get(val, 0) / len(recent)) * 100
        if pct > 60:
            return val
    
    # Check for alternating between commons
    commons_only = [r for r in recent if r in commons]
    if len(commons_only) >= 4:
        flips = sum(1 for i in range(len(commons_only)-1) 
                   if commons_only[i] != commons_only[i+1])
        flip_rate = flips / (len(commons_only)-1) if len(commons_only) > 1 else 0
        
        if flip_rate > 0.6:
            # Predict opposite
            return commons[1] if last_roll == commons[0] else commons[0]
    
    # Default: predict most frequent common
    common_counts = [(c, freq.get(c, 0)) for c in commons]
    common_counts.sort(key=lambda x: x[1], reverse=True)
    return common_counts[0][0]

def test_improved_logic(filepath):
    """Test improved logic on historical data"""
    rolls = parse_actual_sequence(filepath)
    if not rolls:
        print(f"Could not parse sequence from {filepath}")
        return
    
    print(f"\n{'='*80}")
    print(f"Testing: {filepath.name}")
    print(f"{'='*80}")
    print(f"Total rolls: {len(rolls)}")
    
    # Identify commons for the full session
    commons, is_chaotic = identify_commons_improved(rolls)
    
    if is_chaotic:
        print(f"\n❌ Session is CHAOTIC - would skip predictions")
        return
    
    print(f"\n✅ Commons identified: {commons}")
    
    # Frequency distribution
    freq = Counter(rolls)
    print(f"\nFrequency distribution:")
    for val, count in sorted(freq.items(), key=lambda x: x[1], reverse=True):
        pct = (count / len(rolls)) * 100
        marker = "🔥" if val in commons else "  "
        print(f"  {marker} {val}: {count:3d} ({pct:5.1f}%)")
    
    # Test predictions (starting from roll 7 onwards)
    correct = 0
    total = 0
    predictions = []
    
    for i in range(6, len(rolls)):
        history = rolls[:i]
        actual = rolls[i]
        
        # Re-identify commons with current history
        hist_commons, hist_chaotic = identify_commons_improved(history)
        if hist_chaotic:
            continue
        
        predicted = predict_with_improved_logic(history, hist_commons)
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
                'commons': hist_commons
            })
    
    if total == 0:
        print("\n❌ No predictions made")
        return
    
    accuracy = (correct / total) * 100
    print(f"\n📊 IMPROVED LOGIC RESULTS:")
    print(f"   Accuracy: {accuracy:.1f}% ({correct}/{total})")
    
    # Show sample predictions
    print(f"\n📝 Sample Predictions:")
    for p in predictions[:10]:
        status = "✅" if p['correct'] else "❌"
        print(f"   {status} Roll {p['roll_num']}: pred={p['predicted']} actual={p['actual']} commons={p['commons']}")
    
    # Show failed predictions
    failed = [p for p in predictions if not p['correct']]
    if failed:
        print(f"\n❌ Failed Predictions ({len(failed)}/{total}):")
        for p in failed[:5]:
            print(f"   Roll {p['roll_num']}: pred={p['predicted']} actual={p['actual']} commons={p['commons']}")
    
    return accuracy

def main():
    debug_dir = Path('d:/Coding/HSR_PatternRecord/debugstxt')
    
    files = [
        'Svarog-Tracer-Debug-00-50-21 (1).txt',  # New file 1
        'Svarog-Tracer-Debug-20-32-55 (2).txt',  # New file 2
        'Svarog-Tracer-Debug-22-05-16 (2).txt',  # New file 2 (another)
    ]
    
    print("=" * 80)
    print("🦁 TESTING IMPROVED BEAST MODE LOGIC")
    print("=" * 80)
    
    accuracies = []
    for filename in files:
        filepath = debug_dir / filename
        if not filepath.exists():
            print(f"\n❌ File not found: {filename}")
            continue
        
        acc = test_improved_logic(filepath)
        if acc:
            accuracies.append(acc)
    
    if accuracies:
        avg_acc = sum(accuracies) / len(accuracies)
        print(f"\n{'='*80}")
        print(f"📈 AVERAGE ACCURACY: {avg_acc:.1f}%")
        print(f"{'='*80}")
        
        if avg_acc >= 70:
            print("✅ TARGET ACHIEVED (≥70%)")
        elif avg_acc >= 60:
            print("⚠️  CLOSE TO TARGET (60-70%)")
        else:
            print("❌ BELOW TARGET (<60%)")

if __name__ == '__main__':
    main()
