#!/usr/bin/env python3
"""
Test improved Beast Mode on the NEW file with actual 2-str data
"""

from collections import Counter

# Actual 2-str sequence from file
sequence = "43442344434211"
rolls = [sequence[i:i+2] for i in range(0, len(sequence), 2)]

print("=" * 80)
print("🦁 TESTING IMPROVED BEAST MODE - File: Svarog-Tracer-Debug-14-33-56 (1).txt")
print("=" * 80)
print(f"\n2-str sequence: {rolls}")
print(f"Total rolls: {len(rolls)}")

# Analyze distribution
freq = Counter(rolls)
print(f"\nDistribution:")
for val, count in sorted(freq.items(), key=lambda x: x[1], reverse=True):
    pct = (count / len(rolls)) * 100
    print(f"  {val}: {count} ({pct:5.1f}%)")

# Check for chaos
sorted_freq = sorted(freq.items(), key=lambda x: x[1], reverse=True)
if len(sorted_freq) >= 4:
    max_pct = sorted_freq[0][1] / len(rolls) * 100
    min_pct = sorted_freq[-1][1] / len(rolls) * 100
    spread = max_pct - min_pct
    print(f"\nSpread (max-min): {spread:.1f}%")
    print(f"Chaos threshold (10%): {'CHAOTIC ❌' if spread < 10 else 'OK ✅'}")

# Identify commons
valid_commons = [val for val, count in sorted_freq if (count/len(rolls))*100 > 15]
print(f"\nCommons (>15%): {valid_commons}")

if len(valid_commons) >= 2:
    commons = valid_commons[:2]
    print(f"✅ Identified commons: {commons}")
    
    # Test predictions
    print(f"\n{'='*80}")
    print("TESTING PREDICTIONS")
    print("=" * 80)
    
    correct = 0
    total = 0
    
    for i in range(6, len(rolls)):
        history = rolls[:i]
        actual = rolls[i]
        last_roll = history[-1]
        
        # Simple prediction logic
        if last_roll not in commons:
            # Noise recovery
            predicted = commons[0]
            pattern = "noise-recovery"
        else:
            # Check for alternating
            recent = history[-6:]
            commons_only = [r for r in recent if r in commons]
            if len(commons_only) >= 3:
                flips = sum(1 for j in range(len(commons_only)-1) 
                           if commons_only[j] != commons_only[j+1])
                flip_rate = flips / (len(commons_only)-1) if len(commons_only) > 1 else 0
                
                if flip_rate > 0.6:
                    # Alternating - predict opposite
                    predicted = commons[1] if last_roll == commons[0] else commons[0]
                    pattern = "alternating"
                else:
                    # Predict most frequent common
                    freq_recent = Counter(recent)
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
        
        status = "✅" if is_correct else "❌"
        print(f"{status} Roll {i+1}: pred={predicted} actual={actual} (pattern: {pattern})")
    
    accuracy = (correct / total) * 100 if total > 0 else 0
    print(f"\n{'='*80}")
    print(f"📊 RESULTS")
    print(f"{'='*80}")
    print(f"Accuracy: {accuracy:.1f}% ({correct}/{total})")
    
    if accuracy >= 70:
        print("✅ TARGET ACHIEVED (≥70%)")
    elif accuracy >= 60:
        print("⚠️  CLOSE TO TARGET (60-70%)")
    else:
        print("❌ BELOW TARGET (<60%)")
else:
    print(f"\n❌ Not enough valid commons - session is chaotic")
