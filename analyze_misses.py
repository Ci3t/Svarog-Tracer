"""
Detailed analysis of file (20) to identify where predictions failed
"""

# From file (20) tracking table
predictions = [
    # (Roll, Actual, C2_Pred, C2_Result, C3_Pred, C3_Result)
    (3, '423', '[1,4]', '✗', '[3,4]', '✓'),  # C2: Predicted Outer, got Inner
    (4, '411', '[2,3]', '✗', '[1,2]', '✓'),  # C2: Predicted Inner, got Outer
    (5, '432', '[2,3]', '✓', '[3,4]', '✗'),  # C3: Predicted High, got Low
    (6, '434', '[1,4]', '✗', '[3,4]', '✓'),  # C2: Predicted Outer, got Inner
    (7, '412', '[1,4]', '✓', '[1,2]', '✓'),  # Both correct!
    (8, '441', '[2,3]', '✗', '[3,4]', '✗'),  # Both wrong
    (9, '443', '[1,4]', '✓', '[3,4]', '✓'),  # Both correct!
    (10, '444', '[1,4]', '✓', '[1,2]', '✗'), # C3: Predicted Low, got High
    (11, '431', '[1,4]', '✗', '[1,2]', '✓'), # C2: Predicted Outer, got Inner
]

# Actual pattern
c2_pattern = ['O', 'O', 'I', 'O', 'I', 'I', 'O', 'O', 'O', 'O', 'I']
c3_pattern = ['H', 'L', 'H', 'L', 'L', 'H', 'L', 'L', 'H', 'H', 'L']

print('🔍 DETAILED MISS ANALYSIS\n')
print('=' * 80)

print('\n📍 C2 (Outer/Inner) Misses:')
print('   Pattern: O-O-I-O-I-I-O-O-O-O-I')
print('')

c2_misses = [
    (3, 'O-O-I', 'Predicted [1,4]=Outer', 'Got I', 'Should detect alternating starting'),
    (4, 'O-I-O', 'Predicted [2,3]=Inner', 'Got O', 'Alternating O-I-O, should predict O'),
    (6, 'I-I-O', 'Predicted [1,4]=Outer', 'Got I', 'After I-I, predicted flip but got I again'),
    (8, 'O-O-O', 'Predicted [2,3]=Inner', 'Got O', 'Stable O-O-O, should continue O'),
    (11, 'O-O-I', 'Predicted [1,4]=Outer', 'Got I', 'After O-O, predicted O but got I'),
]

for roll, context, pred, actual, issue in c2_misses:
    print(f'   Roll {roll}: {context}')
    print(f'            {pred} → {actual}')
    print(f'            Issue: {issue}')
    print()

print('\n📍 C3 (Low/High) Misses:')
print('   Pattern: H-L-H-L-L-H-L-L-H-H-L')
print('')

c3_misses = [
    (5, 'H-L-H-L', 'Predicted [3,4]=High', 'Got L', 'Alternating H-L-H-L, should predict L'),
    (8, 'H-L-L', 'Predicted [3,4]=High', 'Got L', 'After L-L, predicted flip but got L again'),
    (10, 'L-H', 'Predicted [1,2]=Low', 'Got H', 'After single H, predicted L but got H'),
]

for roll, context, pred, actual, issue in c3_misses:
    print(f'   Roll {roll}: {context}')
    print(f'            {pred} → {actual}')
    print(f'            Issue: {issue}')
    print()

print('=' * 80)
print('\n💡 KEY INSIGHTS:\n')

print('1. C2 ISSUES:')
print('   - Roll 3-4: Early alternating not detected (need 3 rolls minimum)')
print('   - Roll 8: Stable O-O-O pattern, wrongly predicted flip to Inner')
print('   - Roll 11: After O-O, predicted continuation but pattern flipped')
print('')

print('2. C3 ISSUES:')
print('   - Roll 5: Alternating H-L-H-L, should predict L (4th roll)')
print('   - Roll 8: After L-L, predicted flip but got L (3 consecutive)')
print('   - Roll 10: After single H, predicted L but got H again')
print('')

print('🎯 TUNING RECOMMENDATIONS:\n')

print('For C2 (Target: 5-7/9 = 56-78%):')
print('   Current: 4/9 = 44.4%')
print('   Need: +1-3 more hits')
print('   Fix:')
print('   - Lower alternating threshold to 50% (from 60%) for faster detection')
print('   - Increase stable pattern confidence (O-O-O should continue)')
print('   - Reduce flip prediction after just 2 consecutive')
print('')

print('For C3 (Target: 6-8/9 = 67-89%):')
print('   Current: 6/9 = 66.7%')
print('   Need: +0-2 more hits')
print('   Fix:')
print('   - Better handling of L-L-L (3 consecutive) - should continue, not flip')
print('   - Improve alternating detection for H-L-H-L patterns')
print('   - Don\'t predict flip after single occurrence')
