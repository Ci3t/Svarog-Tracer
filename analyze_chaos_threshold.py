#!/usr/bin/env python3
"""
Detailed analysis of why sessions are chaotic and what accuracy we'd get with different thresholds
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

def analyze_chaos_threshold(rolls, window_size=None):
    """Analyze what happens with different chaos thresholds"""
    if window_size:
        rolls = rolls[-window_size:]
    
    freq = Counter(rolls)
    sorted_freq = sorted(freq.items(), key=lambda x: x[1], reverse=True)
    total = len(rolls)
    
    pcts = [(val, (count/total)*100) for val, count in sorted_freq]
    
    print(f"\n  Rolls analyzed: {total}")
    print(f"  Distribution:")
    for val, pct in pcts:
        print(f"    {val}: {pct:5.1f}%")
    
    if len(pcts) >= 4:
        max_pct = pcts[0][1]
        min_pct = pcts[-1][1]
        spread = max_pct - min_pct
        print(f"  Spread (max-min): {spread:.1f}%")
        
        print(f"\n  Chaos Detection:")
        for threshold in [5, 10, 15, 20, 25]:
            is_chaotic = spread < threshold
            print(f"    {threshold}% threshold: {'CHAOTIC ❌' if is_chaotic else 'OK ✅'}")
    
    # Check minimum threshold
    valid_commons = [val for val, pct in pcts if pct > 15]
    print(f"\n  Commons (>15%): {valid_commons}")
    
    return pcts

def test_with_rolling_window(rolls, window_size=12):
    """Test accuracy using rolling window for commons identification"""
    print(f"\n{'='*80}")
    print(f"Testing with {window_size}-roll rolling window")
    print(f"{'='*80}")
    
    correct = 0
    total = 0
    
    for i in range(window_size, len(rolls)):
        window = rolls[i-window_size:i]
        actual = rolls[i]
        
        # Identify commons in window
        freq = Counter(window)
        sorted_freq = sorted(freq.items(), key=lambda x: x[1], reverse=True)
        pcts = [(val, (count/len(window))*100) for val, count in sorted_freq]
        
        # Check chaos (using 15% threshold - more lenient)
        if len(pcts) >= 4:
            spread = pcts[0][1] - pcts[-1][1]
            if spread < 15:
                continue  # Skip chaotic windows
        
        # Get valid commons
        valid_commons = [val for val, pct in pcts if pct > 15]
        if len(valid_commons) < 2:
            continue
        
        commons = valid_commons[:2]
        
        # Simple prediction: if actual is in commons, count as predictable
        total += 1
        if actual in commons:
            correct += 1
    
    if total > 0:
        accuracy = (correct / total) * 100
        print(f"\n  Predictions made: {total}/{len(rolls)-window_size}")
        print(f"  Accuracy (actual in commons): {accuracy:.1f}%")
        return accuracy
    else:
        print(f"\n  No predictions made (all windows chaotic)")
        return 0

def main():
    debug_dir = Path('d:/Coding/HSR_PatternRecord/debugstxt')
    
    files = [
        'Svarog-Tracer-Debug-23-38-00.txt',
        'Svarog-Tracer-Debug-02-45-54.txt'
    ]
    
    print("=" * 80)
    print("🔍 DETAILED CHAOS ANALYSIS")
    print("=" * 80)
    
    for filename in files:
        filepath = debug_dir / filename
        if not filepath.exists():
            continue
        
        rolls = parse_actual_sequence(filepath)
        if not rolls:
            continue
        
        print(f"\n{'='*80}")
        print(f"File: {filename}")
        print(f"{'='*80}")
        print(f"Total rolls: {len(rolls)}")
        
        # Analyze full session
        print(f"\n📊 FULL SESSION ANALYSIS:")
        analyze_chaos_threshold(rolls)
        
        # Analyze last 12 rolls (typical window)
        if len(rolls) >= 12:
            print(f"\n📊 LAST 12 ROLLS ANALYSIS:")
            analyze_chaos_threshold(rolls, window_size=12)
        
        # Test with rolling window
        for window_size in [8, 10, 12]:
            test_with_rolling_window(rolls, window_size)

if __name__ == '__main__':
    main()
