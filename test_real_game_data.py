#!/usr/bin/env python3
"""
Test improved Beast Mode on real game data provided by user
"""

from collections import Counter

# Real game data sequences (first 2 digits only)
sequences = {
    "Session 1 (43 dominant)": [
        "42", "44", "44", "43", "42", "43", "41", "43", "43", "43", "42", "43", "43", "41", "43"
    ],
    "Session 2 (43 dominant)": [
        "42", "43", "44", "44", "42", "43", "43", "41", "43", "41", "42", "43", "43", "43", "43", 
        "43", "43", "43", "43", "43", "44"
    ],
    "Session 3 (41 dominant)": [
        "43", "43", "41", "41", "42", "44", "44", "41", "41", "41", "41", "41", "43", "41", "42"
    ],
    "Session 4 (mixed/chaotic)": [
        "42", "41", "44", "44", "41", "42", "41", "44", "42", "43", "41", "42", "42", "44", "42", 
        "41", "43", "42", "44"
    ],
    "Session 5 (41-43 alternating)": [
        "42", "43", "41", "43", "43", "41", "43", "41", "43", "41", "43", "44", "41", "41"
    ]
}

def test_session(name, rolls):
    """Test improved beast mode on a session"""
    print(f"\n{'='*80}")
    print(f"📊 {name}")
    print(f"{'='*80}")
    print(f"Total rolls: {len(rolls)}")
    print(f"Sequence: {' → '.join(rolls)}")
    
    # Analyze distribution
    freq = Counter(rolls)
    print(f"\nDistribution:")
    for val, count in sorted(freq.items(), key=lambda x: x[1], reverse=True):
        pct = (count / len(rolls)) * 100
        marker = "🔥" if pct > 30 else "  "
        print(f"  {marker} {val}: {count:2d} ({pct:5.1f}%)")
    
    # Check for chaos
    sorted_freq = sorted(freq.items(), key=lambda x: x[1], reverse=True)
    if len(sorted_freq) >= 4:
        max_pct = sorted_freq[0][1] / len(rolls) * 100
        min_pct = sorted_freq[-1][1] / len(rolls) * 100
        spread = max_pct - min_pct
        print(f"\nSpread (max-min): {spread:.1f}%")
        is_chaotic = spread < 10
        print(f"Chaos detection: {'CHAOTIC ❌ (would skip)' if is_chaotic else 'OK ✅'}")
        
        if is_chaotic:
            return None
    
    # Identify commons
    valid_commons = [val for val, count in sorted_freq if (count/len(rolls))*100 > 15]
    
    if len(valid_commons) < 2:
        print(f"\n❌ Not enough valid commons - chaotic session")
        return None
    
    commons = valid_commons[:2]
    commons_count = sum(freq[c] for c in commons)
    commons_coverage = (commons_count / len(rolls)) * 100
    
    print(f"\n✅ Commons: {commons} (coverage: {commons_coverage:.1f}%)")
    
    # Test predictions
    correct = 0
    total = 0
    
    for i in range(6, len(rolls)):
        history = rolls[:i]
        actual = rolls[i]
        last_roll = history[-1]
        recent = history[-8:]
        
        # Simplified prediction logic
        if last_roll not in commons:
            # Noise recovery
            for j in range(len(history)-2, -1, -1):
                if history[j] in commons:
                    predicted = history[j]
                    break
            else:
                predicted = commons[0]
            pattern = "noise"
        else:
            # Check dominance
            freq_recent = Counter(recent)
            for val in commons:
                pct = (freq_recent.get(val, 0) / len(recent)) * 100
                if pct > 60:
                    predicted = val
                    pattern = "dom"
                    break
            else:
                # Check alternating
                commons_only = [r for r in recent if r in commons]
                if len(commons_only) >= 4:
                    flips = sum(1 for j in range(len(commons_only)-1) 
                               if commons_only[j] != commons_only[j+1])
                    flip_rate = flips / (len(commons_only)-1) if len(commons_only) > 1 else 0
                    
                    if flip_rate > 0.6:
                        predicted = commons[1] if last_roll == commons[0] else commons[0]
                        pattern = "alt"
                    else:
                        common_counts = [(c, freq_recent.get(c, 0)) for c in commons]
                        common_counts.sort(key=lambda x: x[1], reverse=True)
                        predicted = common_counts[0][0]
                        pattern = "bal"
                else:
                    predicted = commons[0]
                    pattern = "bal"
        
        total += 1
        is_correct = (predicted == actual)
        if is_correct:
            correct += 1
        
        status = "✅" if is_correct else "❌"
        print(f"{status} Roll {i+1}: pred={predicted} actual={actual} ({pattern})")
    
    if total == 0:
        return None
    
    accuracy = (correct / total) * 100
    print(f"\n📊 Accuracy: {accuracy:.1f}% ({correct}/{total})")
    
    if accuracy >= 70:
        print("✅ TARGET ACHIEVED (≥70%)")
    elif accuracy >= 60:
        print("⚠️  CLOSE (60-70%)")
    else:
        print("❌ BELOW TARGET")
    
    return accuracy

# Run tests
print("=" * 80)
print("🦁 TESTING IMPROVED BEAST MODE - REAL GAME DATA")
print("=" * 80)

accuracies = []
for name, rolls in sequences.items():
    acc = test_session(name, rolls)
    if acc is not None:
        accuracies.append(acc)

if accuracies:
    avg = sum(accuracies) / len(accuracies)
    print(f"\n{'='*80}")
    print(f"📊 OVERALL RESULTS")
    print(f"{'='*80}")
    print(f"Average Accuracy: {avg:.1f}%")
    print(f"Sessions tested: {len(accuracies)}/{len(sequences)}")
    
    if avg >= 70:
        print("\n✅ TARGET ACHIEVED (≥70%)")
    elif avg >= 60:
        print("\n⚠️  CLOSE TO TARGET (60-70%)")
    else:
        print("\n❌ BELOW TARGET (<60%)")
