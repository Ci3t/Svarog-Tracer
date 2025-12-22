#!/usr/bin/env python3
"""
Test each session independently - Real game data analysis
"""

from collections import Counter

def analyze_session(rolls, session_name):
    """Detailed analysis of a single session"""
    print("\n" + "=" * 80)
    print(f"🦁 {session_name}")
    print("=" * 80)
    print(f"Sequence ({len(rolls)} rolls): {' → '.join(rolls)}")
    
    # Distribution
    freq = Counter(rolls)
    print(f"\n📊 Distribution:")
    for val, count in sorted(freq.items(), key=lambda x: x[1], reverse=True):
        pct = (count / len(rolls)) * 100
        bar = "█" * int(pct / 5)
        marker = "🔥" if pct > 30 else "  "
        print(f"  {marker} {val}: {bar:15s} {count:2d} ({pct:5.1f}%)")
    
    # Chaos check
    sorted_freq = sorted(freq.items(), key=lambda x: x[1], reverse=True)
    if len(sorted_freq) >= 4:
        max_pct = sorted_freq[0][1] / len(rolls) * 100
        min_pct = sorted_freq[-1][1] / len(rolls) * 100
        spread = max_pct - min_pct
        print(f"\n🔍 Analysis:")
        print(f"   Spread: {spread:.1f}% (chaos if <10%)")
        
        if spread < 10:
            print("   ❌ CHAOTIC - System would SKIP")
            return None
        else:
            print("   ✅ Not chaotic")
    
    # Commons
    valid_commons = [val for val, count in sorted_freq if (count/len(rolls))*100 > 15]
    
    if len(valid_commons) < 2:
        print("   ❌ Not enough valid commons (>15%)")
        return None
    
    commons = valid_commons[:2]
    commons_count = sum(freq[c] for c in commons)
    commons_pct = (commons_count / len(rolls)) * 100
    
    print(f"   Commons: {commons[0]} and {commons[1]} ({commons_pct:.1f}% coverage)")
    
    # Predictions
    print(f"\n{'='*80}")
    print("PREDICTIONS")
    print("=" * 80)
    
    correct = 0
    total = 0
    
    for i in range(6, len(rolls)):
        history = rolls[:i]
        actual = rolls[i]
        last_roll = history[-1]
        recent = history[-8:]
        
        # Prediction
        if last_roll not in commons:
            for j in range(len(history)-2, -1, -1):
                if history[j] in commons:
                    predicted = history[j]
                    break
            else:
                predicted = commons[0]
            pattern = "noise"
        else:
            freq_recent = Counter(recent)
            dominant = None
            for val in commons:
                pct = (freq_recent.get(val, 0) / len(recent)) * 100
                if pct > 60:
                    dominant = val
                    break
            
            if dominant:
                predicted = dominant
                pattern = "dom"
            else:
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
        print(f"{status} Roll {i+1:2d}: pred={predicted} actual={actual} ({pattern:5s}) | {' '.join(recent[-4:])}")
    
    accuracy = (correct / total) * 100 if total > 0 else 0
    
    print(f"\n{'='*80}")
    print(f"📊 RESULT: {accuracy:.1f}% ({correct}/{total})")
    
    if accuracy >= 70:
        print("🎉 TARGET ACHIEVED (≥70%)")
    elif accuracy >= 60:
        print("⚠️  CLOSE (60-70%)")
    else:
        print("❌ BELOW TARGET")
    
    print("=" * 80)
    return accuracy

# Extract sessions
sessions = {
    "Session 1 - 43 Dominant": [
        "42", "44", "44", "43", "42", "43", "41", "43", "43", "43", "42", "43", "43", "41", "43"
    ],
    
    "Session 2 - 43 Very Dominant": [
        "42", "43", "44", "44", "42", "43", "43", "41", "43", "41", "42", "43", "43", "43", "43", 
        "43", "43", "43", "43", "43", "44"
    ],
    
    "Session 3 - 41 Dominant": [
        "43", "43", "41", "41", "42", "44", "44", "41", "41", "41", "41", "41", "43", "41", "42"
    ],
    
    "Session 4 - Mixed": [
        "42", "41", "44", "44", "41", "42", "41", "44", "42", "43", "41", "42", "42", "44", "42", 
        "41", "43", "42", "44"
    ],
    
    "Session 5 - Sparse Data": [
        "42", "44", "41", "41", "44", "41", "44", "43", "43", "41", "42", "41"
    ],
    
    "Session 6 - 41-43 Alternating": [
        "42", "43", "41", "43", "43", "41", "43", "41", "43", "41", "43", "44", "41", "41"
    ]
}

print("=" * 80)
print("🦁 BEAST MODE - INDIVIDUAL SESSION ANALYSIS")
print("=" * 80)

results = {}
for name, rolls in sessions.items():
    acc = analyze_session(rolls, name)
    if acc is not None:
        results[name] = acc

# Summary
print("\n\n" + "=" * 80)
print("📊 SUMMARY OF ALL SESSIONS")
print("=" * 80)

for name, acc in sorted(results.items(), key=lambda x: x[1], reverse=True):
    status = "✅" if acc >= 70 else "⚠️" if acc >= 60 else "❌"
    print(f"{status} {name:35s}: {acc:5.1f}%")

if results:
    avg = sum(results.values()) / len(results)
    print(f"\n{'='*80}")
    print(f"Average: {avg:.1f}% ({len(results)} sessions)")
    print("=" * 80)
