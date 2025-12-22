#!/usr/bin/env python3
"""
Interactive Beast Mode Tester - Test one session at a time
"""

from collections import Counter

def test_session(rolls, session_name="Test Session"):
    """Test improved beast mode on a single session"""
    print("=" * 80)
    print(f"🦁 BEAST MODE TEST: {session_name}")
    print("=" * 80)
    print(f"\nSequence ({len(rolls)} rolls):")
    print(" → ".join(rolls))
    
    # Distribution
    freq = Counter(rolls)
    print(f"\n📊 Distribution:")
    for val, count in sorted(freq.items(), key=lambda x: x[1], reverse=True):
        pct = (count / len(rolls)) * 100
        bar = "█" * int(pct / 5)
        print(f"  {val}: {bar} {count:2d} ({pct:5.1f}%)")
    
    # Chaos check
    sorted_freq = sorted(freq.items(), key=lambda x: x[1], reverse=True)
    if len(sorted_freq) >= 4:
        max_pct = sorted_freq[0][1] / len(rolls) * 100
        min_pct = sorted_freq[-1][1] / len(rolls) * 100
        spread = max_pct - min_pct
        print(f"\n🔍 Spread: {spread:.1f}% (chaos if <10%)")
        
        if spread < 10:
            print("❌ CHAOTIC - System would SKIP predictions")
            return
    
    # Identify commons
    valid_commons = [val for val, count in sorted_freq if (count/len(rolls))*100 > 15]
    
    if len(valid_commons) < 2:
        print("\n❌ Not enough valid commons (>15%) - CHAOTIC")
        return
    
    commons = valid_commons[:2]
    commons_count = sum(freq[c] for c in commons)
    commons_pct = (commons_count / len(rolls)) * 100
    
    print(f"\n✅ Commons: {commons[0]} and {commons[1]}")
    print(f"   Coverage: {commons_pct:.1f}%")
    
    # Test predictions
    print(f"\n{'='*80}")
    print("PREDICTIONS (starting from roll 7)")
    print("=" * 80)
    
    correct = 0
    total = 0
    pattern_stats = {}
    
    for i in range(6, len(rolls)):
        history = rolls[:i]
        actual = rolls[i]
        last_roll = history[-1]
        recent = history[-8:]
        
        # Prediction logic
        if last_roll not in commons:
            # Noise recovery
            for j in range(len(history)-2, -1, -1):
                if history[j] in commons:
                    predicted = history[j]
                    break
            else:
                predicted = commons[0]
            pattern = "noise-recovery"
        else:
            # Check dominance
            freq_recent = Counter(recent)
            dominant = None
            for val in commons:
                pct = (freq_recent.get(val, 0) / len(recent)) * 100
                if pct > 60:
                    dominant = val
                    break
            
            if dominant:
                predicted = dominant
                pattern = "dominance"
            else:
                # Check alternating
                commons_only = [r for r in recent if r in commons]
                if len(commons_only) >= 4:
                    flips = sum(1 for j in range(len(commons_only)-1) 
                               if commons_only[j] != commons_only[j+1])
                    flip_rate = flips / (len(commons_only)-1) if len(commons_only) > 1 else 0
                    
                    if flip_rate > 0.6:
                        predicted = commons[1] if last_roll == commons[0] else commons[0]
                        pattern = "alternating"
                    else:
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
        
        # Track pattern stats
        if pattern not in pattern_stats:
            pattern_stats[pattern] = {'correct': 0, 'total': 0}
        pattern_stats[pattern]['total'] += 1
        if is_correct:
            pattern_stats[pattern]['correct'] += 1
        
        status = "✅" if is_correct else "❌"
        print(f"{status} Roll {i+1:2d}: pred={predicted} actual={actual} | {pattern:15s} | recent: {' '.join(recent[-4:])}")
    
    # Results
    accuracy = (correct / total) * 100 if total > 0 else 0
    
    print(f"\n{'='*80}")
    print("📊 RESULTS")
    print("=" * 80)
    print(f"Accuracy: {accuracy:.1f}% ({correct}/{total})")
    
    print(f"\nBy Pattern:")
    for pat, stats in sorted(pattern_stats.items(), key=lambda x: x[1]['correct']/x[1]['total'] if x[1]['total'] > 0 else 0, reverse=True):
        pat_acc = (stats['correct'] / stats['total']) * 100 if stats['total'] > 0 else 0
        print(f"  {pat:20s}: {pat_acc:5.1f}% ({stats['correct']}/{stats['total']})")
    
    if accuracy >= 70:
        print("\n🎉 TARGET ACHIEVED (≥70%)")
    elif accuracy >= 60:
        print("\n⚠️  CLOSE TO TARGET (60-70%)")
    else:
        print("\n❌ BELOW TARGET (<60%)")
    
    print("\n" + "=" * 80)

# Test sessions
print("\n" + "=" * 80)
print("🦁 BEAST MODE - INDIVIDUAL SESSION TESTING")
print("=" * 80)

# Session 1: 43 dominant
print("\n\n")
input("Press Enter to test SESSION 1 (43 dominant)...")
session1 = ["42", "44", "44", "43", "42", "43", "41", "43", "43", "43", "42", "43", "43", "41", "43"]
test_session(session1, "Session 1 - 43 Dominant")

# Session 2: 43 very dominant
print("\n\n")
input("Press Enter to test SESSION 2 (43 very dominant)...")
session2 = ["42", "43", "44", "44", "42", "43", "43", "41", "43", "41", "42", "43", "43", "43", "43", "43", "43", "43", "43", "43", "44"]
test_session(session2, "Session 2 - 43 Very Dominant")

# Session 3: 41 dominant
print("\n\n")
input("Press Enter to test SESSION 3 (41 dominant)...")
session3 = ["43", "43", "41", "41", "42", "44", "44", "41", "41", "41", "41", "41", "43", "41", "42"]
test_session(session3, "Session 3 - 41 Dominant")

# Session 4: Mixed/chaotic
print("\n\n")
input("Press Enter to test SESSION 4 (mixed/chaotic)...")
session4 = ["42", "41", "44", "44", "41", "42", "41", "44", "42", "43", "41", "42", "42", "44", "42", "41", "43", "42", "44"]
test_session(session4, "Session 4 - Mixed/Chaotic")

# Session 5: Alternating
print("\n\n")
input("Press Enter to test SESSION 5 (41-43 alternating)...")
session5 = ["42", "43", "41", "43", "43", "41", "43", "41", "43", "41", "43", "44", "41", "41"]
test_session(session5, "Session 5 - Alternating")

print("\n\n✅ All sessions tested!")
