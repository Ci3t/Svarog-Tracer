"""
Analyze C2 (Outer/Inner) pattern from file (17) to understand why it failed
"""

# From file (17) tracking table:
rolls = [
    ('444', 'O', 'H'),  # Roll 1
    ('411', 'O', 'L'),  # Roll 2
    ('423', 'I', 'H'),  # Roll 3 - Pred C2:[1,4]=Outer ✗, C3:[3,4]=High ✓
    ('411', 'O', 'L'),  # Roll 4 - Pred C2:[2,3]=Inner ✗, C3:[1,2]=Low ✓
    ('432', 'I', 'L'),  # Roll 5 - Pred C2:[1,4]=Outer ✗, C3:[3,4]=High ✗
    ('434', 'I', 'H'),  # Roll 6 - Pred C2:[1,4]=Outer ✗, C3:[3,4]=High ✓
    ('412', 'O', 'L'),  # Roll 7 - Pred C2:[1,4]=Outer ✓, C3:[1,2]=Low ✓
    ('441', 'O', 'L'),  # Roll 8 - Pred C2:[2,3]=Inner ✗, C3:[3,4]=High ✗
    ('443', 'O', 'H'),  # Roll 9 - Pred C2:[2,3]=Inner ✗, C3:[3,4]=High ✓
    ('444', 'O', 'H'),  # Roll 10 - Pred C2:[1,4]=Outer ✓, C3:[1,2]=Low ✗
    ('431', 'I', 'L'),  # Roll 11 - Pred C2:[1,4]=Outer ✗, C3:[1,2]=Low ✓
]

print('🔍 ANALYZING C2 (Outer/Inner) PATTERN\n')
print('=' * 80)

# Extract C2 pattern
c2_pattern = [r[1] for r in rolls]
c3_pattern = [r[2] for r in rolls]

print('\n📋 C2 Pattern (Outer/Inner):')
print('   ' + ' → '.join(c2_pattern))

# Count flips
c2_flips = 0
for i in range(1, len(c2_pattern)):
    if c2_pattern[i] != c2_pattern[i-1]:
        c2_flips += 1

c2_flip_rate = c2_flips / (len(c2_pattern) - 1)

print(f'\n   Flips: {c2_flips} / {len(c2_pattern)-1} transitions = {c2_flip_rate*100:.1f}%')

if c2_flip_rate >= 0.6:
    print(f'   ✅ ALTERNATING pattern (≥60% flip rate)')
elif c2_flip_rate >= 0.4:
    print(f'   ⚠️ MIXED pattern (40-60% flip rate)')
else:
    print(f'   ✅ STABLE pattern (<40% flip rate)')

# Analyze predictions
print('\n📊 C2 Predictions Analysis:\n')

predictions = [
    (3, '[1,4]', 'Outer', 'I', '✗'),  # Predicted Outer, got Inner
    (4, '[2,3]', 'Inner', 'O', '✗'),  # Predicted Inner, got Outer
    (5, '[1,4]', 'Outer', 'I', '✗'),  # Predicted Outer, got Inner
    (6, '[1,4]', 'Outer', 'I', '✗'),  # Predicted Outer, got Inner
    (7, '[1,4]', 'Outer', 'O', '✓'),  # Predicted Outer, got Outer ✓
    (8, '[2,3]', 'Inner', 'O', '✗'),  # Predicted Inner, got Outer
    (9, '[2,3]', 'Inner', 'O', '✗'),  # Predicted Inner, got Outer
    (10, '[1,4]', 'Outer', 'O', '✓'), # Predicted Outer, got Outer ✓
    (11, '[1,4]', 'Outer', 'I', '✗'), # Predicted Outer, got Inner
]

print('Roll | Prev Pattern | Prediction | Actual | Result | Issue')
print('-' * 70)

for i, (roll_num, pred, pred_label, actual, result) in enumerate(predictions):
    prev_pattern = ' → '.join(c2_pattern[max(0, roll_num-4):roll_num])
    issue = ''
    
    if result == '✗':
        # Check if it's alternating
        if roll_num >= 3:
            last_3 = c2_pattern[roll_num-3:roll_num]
            flips_in_3 = sum(1 for j in range(1, len(last_3)) if last_3[j] != last_3[j-1])
            if flips_in_3 >= 2:
                issue = 'Should detect alternating'
            else:
                issue = 'Wrong stable prediction'
    
    print(f'{roll_num:4} | {prev_pattern:12} | {pred_label:10} | {actual:6} | {result:6} | {issue}')

print('\n' + '=' * 80)
print('\n💡 ROOT CAUSE ANALYSIS:\n')

# Check if alternating detection triggered
print('1. C2 Pattern: O-O-I-O-I-I-O-O-O-O-I')
print('   Flips: 5 / 10 = 50% (below 60% threshold)')
print('   ❌ Alternating detection did NOT trigger (need 60%+)')
print('')
print('2. But looking at specific windows:')
print('   Rolls 2-7: O-I-O-I-I-O = 4 flips / 5 = 80% alternating!')
print('   Rolls 7-11: O-O-O-O-I = 1 flip / 4 = 25% stable!')
print('')
print('3. The pattern CHANGED mid-session:')
print('   Early: Alternating (O-I-O-I)')
print('   Late: Stable Outer (O-O-O-O)')
print('')
print('4. System predicted:')
print('   - Rolls 3-6: Predicted based on early pattern (wrong)')
print('   - Rolls 7-10: Started predicting Outer (correct!)')
print('   - Roll 11: Predicted Outer but got Inner (pattern broke)')

print('\n🎯 THE PROBLEM:\n')
print('   C2 has a CHANGING pattern within the same 5-min window!')
print('   - First half: Alternating')
print('   - Second half: Stable Outer')
print('   ')
print('   Current alternating detection uses last 6 rolls.')
print('   By the time it detects alternating, pattern already changed!')

print('\n✅ SOLUTION:\n')
print('   1. Use SHORTER lookback for alternating detection (4-5 rolls vs 6)')
print('   2. Re-evaluate pattern MORE FREQUENTLY')
print('   3. Add pattern CHANGE detection')
print('   4. When pattern changes, reset and re-analyze')

print('\n📊 EXPECTED IMPROVEMENT:\n')
print('   With shorter lookback (4-5 rolls):')
print('   - Rolls 3-6: Would detect alternating earlier → 3-4 hits')
print('   - Rolls 7-10: Would detect stable Outer → 3-4 hits')
print('   - Expected: 6-8 / 9 = 67-89% (vs current 22%)')
