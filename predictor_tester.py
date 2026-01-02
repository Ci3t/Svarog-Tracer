#!/usr/bin/env python3
"""
Svarog Predictor Tester v2.0 - COMPLETE 1:1 PORT
================================================
Complete Python implementation of pairTransitionPredictor.js

This mirrors the JavaScript v3.7+ Beast Mode logic EXACTLY.
Use this for fast testing before syncing changes to JS.

Usage:
    python predictor_tester.py "41,42,43,41,41,43,42,41,42,44,43,42,42,42,44"
"""

import sys
from collections import Counter
from typing import Dict, List, Tuple, Optional, Any

VALUES = ['41', '42', '43', '44']

# Property map for meta-pattern analysis
PROPERTIES = {
    '41': {'parity': 'odd', 'position': 'outer'},
    '42': {'parity': 'even', 'position': 'inner'},
    '43': {'parity': 'odd', 'position': 'inner'},
    '44': {'parity': 'even', 'position': 'outer'}
}


def get_parity(v: str) -> str:
    return PROPERTIES.get(v, {}).get('parity', 'unknown')


def get_distribution(rolls: List[str]) -> Dict[str, int]:
    """Get percentage distribution of each value"""
    if not rolls:
        return {v: 0 for v in VALUES}
    counter = Counter(rolls)
    total = len(rolls)
    return {v: round((counter.get(v, 0) / total) * 100) for v in VALUES}


def identify_commons_noise(rolls: List[str]) -> Dict[str, Any]:
    """Identify common and noise values, current run length, run break likely, noise rising"""
    dist = get_distribution(rolls)
    sorted_vals = sorted(VALUES, key=lambda v: dist[v], reverse=True)
    commons = sorted_vals[:2]
    noise = sorted_vals[2:]
    
    # Calculate current run length
    if not rolls:
        return {
            'commons': commons, 'noise': noise, 'distribution': dist,
            'current_run_length': 0, 'run_break_likely': False, 'noise_rising': []
        }
    
    last_roll = rolls[-1]
    current_run = 0
    for r in reversed(rolls):
        if r == last_roll:
            current_run += 1
        else:
            break
    
    run_break_likely = current_run >= 3
    
    # Detect noise rising (noise values that are approaching common %)
    noise_rising = []
    for n in noise:
        for c in commons:
            if dist[n] > 0 and dist[c] - dist[n] <= 10:
                noise_rising.append(n)
                break
    
    return {
        'commons': commons,
        'noise': noise,
        'distribution': dist,
        'current_run_length': current_run,
        'run_break_likely': run_break_likely,
        'noise_rising': noise_rising
    }


def build_pair_matrix(rolls: List[str]) -> Dict[str, Any]:
    """Build 1-gram and 2-gram transition matrices"""
    matrix = {v: {v2: {'count': 0, 'pct': 0, 'samples': 0} for v2 in VALUES} for v in VALUES}
    matrix2gram = {}
    
    last_roll = rolls[-1] if rolls else None
    last2 = ''.join(rolls[-2:]) if len(rolls) >= 2 else None
    
    # Build 1-gram matrix
    for i in range(len(rolls) - 1):
        current = rolls[i]
        next_val = rolls[i + 1]
        matrix[current][next_val]['count'] += 1
    
    # Calculate percentages
    for v in VALUES:
        total = sum(matrix[v][v2]['count'] for v2 in VALUES)
        for v2 in VALUES:
            if total > 0:
                matrix[v][v2]['pct'] = round((matrix[v][v2]['count'] / total) * 100)
                matrix[v][v2]['samples'] = total
    
    # Build 2-gram matrix
    for i in range(len(rolls) - 2):
        key = rolls[i] + rolls[i + 1]
        next_val = rolls[i + 2]
        if key not in matrix2gram:
            matrix2gram[key] = {v: {'count': 0, 'pct': 0, 'samples': 0} for v in VALUES}
        matrix2gram[key][next_val]['count'] += 1
    
    for key in matrix2gram:
        total = sum(matrix2gram[key][v]['count'] for v in VALUES)
        for v in VALUES:
            if total > 0:
                matrix2gram[key][v]['pct'] = round((matrix2gram[key][v]['count'] / total) * 100)
                matrix2gram[key][v]['samples'] = total
    
    return {
        'matrix': matrix,
        'matrix2gram': matrix2gram,
        'last_roll': last_roll,
        'last2_rolls': last2
    }


def calculate_wave_signals(rolls: List[str], commons: List[str]) -> Dict[str, Any]:
    """Calculate wave detection signals"""
    if len(rolls) < 3:
        return {'wave_flip_probability': 0, 'noise_appearance_count': 0, 'last_common_run_length': 0}
    
    last6 = rolls[-6:] if len(rolls) >= 6 else rolls
    
    # Count noise appearances in recent window
    noise = [v for v in VALUES if v not in commons]
    noise_count = sum(1 for r in last6 if r in noise)
    
    # Calculate last common run length
    common_run = 0
    for r in reversed(rolls):
        if r in commons:
            common_run += 1
        else:
            break
    
    # Wave flip probability (simplified)
    flip_prob = min(noise_count * 15, 60)
    if common_run >= 3:
        flip_prob += 10
    
    return {
        'wave_flip_probability': flip_prob,
        'noise_appearance_count': noise_count,
        'last_common_run_length': common_run
    }


def calculate_trends(rolls: List[str]) -> Dict[str, Dict[str, Any]]:
    """Calculate trend (rising/falling/stable) for each value"""
    trends = {}
    
    if len(rolls) < 6:
        for v in VALUES:
            trends[v] = {'direction': 'stable', 'early_pct': 0, 'late_pct': 0}
        return trends
    
    mid = len(rolls) // 2
    early = rolls[:mid]
    late = rolls[mid:]
    
    early_dist = get_distribution(early)
    late_dist = get_distribution(late)
    
    for v in VALUES:
        diff = late_dist[v] - early_dist[v]
        direction = 'rising' if diff > 5 else 'falling' if diff < -5 else 'stable'
        trends[v] = {
            'direction': direction,
            'early_pct': early_dist[v],
            'late_pct': late_dist[v]
        }
    
    return trends


def calculate_momentum(rolls: List[str]) -> Dict[str, float]:
    """Calculate momentum score for each value using exponential decay"""
    momentum = {v: 0.0 for v in VALUES}
    
    window_size = min(12, len(rolls))
    for i in range(len(rolls) - window_size, len(rolls)):
        if i >= 0:
            v = rolls[i]
            distance = len(rolls) - 1 - i
            score = 1 / ((distance + 1) ** 1.5)
            momentum[v] += score
    
    return {k: round(v, 2) for k, v in momentum.items()}


def calculate_last_seen(rolls: List[str]) -> Dict[str, int]:
    """Calculate how many rolls ago each value last appeared"""
    last_seen = {v: -1 for v in VALUES}  # -1 means never seen
    
    for v in VALUES:
        for i in range(len(rolls) - 1, -1, -1):
            if rolls[i] == v:
                last_seen[v] = len(rolls) - 1 - i
                break
    
    return last_seen


def detect_alternating(rolls: List[str]) -> Tuple[bool, Optional[List[str]]]:
    """Detect if last 4 rolls form alternating pattern"""
    if len(rolls) < 4:
        return False, None
    
    last4 = rolls[-4:]
    unique = list(set(last4))
    
    if len(unique) != 2:
        return False, None
    
    # Check if strictly alternating
    for i in range(3):
        if last4[i] == last4[i + 1]:
            return False, None
    
    return True, unique


def detect_double_tap(rolls: List[str], noise: List[str]) -> Tuple[bool, Optional[str]]:
    """Detect if noise value tends to come in pairs"""
    if len(rolls) < 3:
        return False, None
    
    last_roll = rolls[-1]
    if last_roll not in noise:
        return False, None
    
    # Check history - does this noise value often repeat?
    pairs = 0
    for i in range(len(rolls) - 1):
        if rolls[i] == last_roll and rolls[i + 1] == last_roll:
            pairs += 1
    
    if pairs >= 1:  # Has paired before
        return True, last_roll
    
    return False, None


def calculate_smart_run_scores(rolls: List[str], commons_data: Dict) -> Dict[str, float]:
    """Calculate run-based scoring for each value"""
    scores = {v: 1.0 for v in VALUES}
    
    if not rolls:
        return scores
    
    last_roll = rolls[-1]
    prev_roll = rolls[-2] if len(rolls) >= 2 else None
    was_change = prev_roll != last_roll if prev_roll else True
    current_run = commons_data['current_run_length']
    
    for v in VALUES:
        if v == last_roll:
            if was_change:
                scores[v] = 1.3  # Just switched - might continue
            elif current_run >= 3:
                scores[v] = 0.4  # Long run - likely to break
            elif current_run == 2:
                scores[v] = 0.8
            else:
                scores[v] = 1.0
    
    return scores


def predict(rolls: List[str]) -> Dict:
    """
    Main prediction function - COMPLETE 1:1 PORT of predictWithPairs
    """
    if len(rolls) < 6:
        return {
            'prediction': None,
            'alt': None,
            'method': 'insufficient-data',
            'confidence': 0,
            'debug': {}
        }
    
    # =========================================================================
    # BUILD ALL DATA
    # =========================================================================
    commons_data = identify_commons_noise(rolls)
    commons = commons_data['commons']
    noise = commons_data['noise']
    dist = commons_data['distribution']
    noise_rising = commons_data['noise_rising']
    current_run = commons_data['current_run_length']
    run_break_likely = commons_data['run_break_likely']
    
    pair_data = build_pair_matrix(rolls)
    matrix = pair_data['matrix']
    matrix2gram = pair_data['matrix2gram']
    last_roll = pair_data['last_roll']
    last2 = pair_data['last2_rolls']
    
    wave_signals = calculate_wave_signals(rolls, commons)
    trends = calculate_trends(rolls)
    momentum = calculate_momentum(rolls)
    last_seen = calculate_last_seen(rolls)
    
    # Hot/Cold values by momentum
    hot_values = sorted(VALUES, key=lambda v: momentum[v], reverse=True)[:2]
    cold_values = sorted(VALUES, key=lambda v: momentum[v])[:2]
    
    # Smart run scores
    smart_run_scores = calculate_smart_run_scores(rolls, commons_data)
    
    # Frequency sorted
    freq_sorted = sorted(VALUES, key=lambda v: dist[v], reverse=True)
    freq_pred = freq_sorted[0]
    freq_alt = freq_sorted[1]
    
    # Previous roll context
    prev_roll = rolls[-2] if len(rolls) >= 2 else None
    was_change = prev_roll != last_roll if prev_roll else True
    
    # Dynamic overdue threshold
    top_pct = max(dist.values()) if dist.values() else 0
    dominance_penalty = (top_pct - 40) // 10 if top_pct > 40 else 0
    overdue_threshold = 4 + dominance_penalty
    
    # Most overdue value
    most_overdue = None
    max_seen = -1
    for v in VALUES:
        if last_seen[v] != -1 and last_seen[v] > max_seen:
            max_seen = last_seen[v]
            most_overdue = v
    
    overdue_values = [v for v in VALUES if last_seen[v] >= overdue_threshold or last_seen[v] == -1]
    
    # 2-gram data
    has_2gram = False
    gram2_pred = None
    gram2_alt = None
    gram2_conf = 0
    if last2 and last2 in matrix2gram:
        gram_sorted = sorted(VALUES, key=lambda v: matrix2gram[last2][v]['pct'], reverse=True)
        if matrix2gram[last2][gram_sorted[0]]['pct'] > 0:
            gram2_pred = gram_sorted[0]
            gram2_alt = gram_sorted[1] if len(gram_sorted) > 1 else freq_alt
            samples = matrix2gram[last2][gram_sorted[0]]['samples']
            conf = matrix2gram[last2][gram_sorted[0]]['pct']
            # Sample penalty
            if samples == 1:
                conf = min(conf, 45)
            elif samples == 2:
                conf = min(conf, 65)
            gram2_conf = conf
            has_2gram = True
    
    # 1-gram data
    pair_pred = None
    pair_alt = None
    pair_conf = 0
    if last_roll and last_roll in matrix:
        pair_sorted = sorted(VALUES, key=lambda v: matrix[last_roll][v]['pct'], reverse=True)
        pair_pred = pair_sorted[0]
        pair_alt = pair_sorted[1]
        pair_conf = matrix[last_roll][pair_sorted[0]]['pct']
    
    # Alternating detection
    is_alternating, alt_pair = detect_alternating(rolls)
    
    # Pattern shift detection (noise becoming hot)
    pattern_shifted = False
    shifted_to = None
    for n in noise:
        if n in hot_values:
            pattern_shifted = True
            shifted_to = n
    
    # Noise double-tap detection
    double_tap_likely, double_tap_val = detect_double_tap(rolls, noise)
    
    # Uncertainty check
    sorted_dist = sorted([(v, dist[v]) for v in VALUES], key=lambda x: x[1], reverse=True)
    top_pct_val = sorted_dist[0][1] if sorted_dist else 0
    second_pct = sorted_dist[1][1] if len(sorted_dist) > 1 else 0
    confidence_gap = top_pct_val - second_pct
    is_uncertain = confidence_gap < 10 or top_pct_val < 35
    
    # =========================================================================
    # PREDICTION LOGIC (Priority Order)
    # =========================================================================
    prediction = None
    alt = None
    method = 'frequency'
    confidence = 0.5
    
    # Step 1: ALTERNATING PATTERN
    # 🔧 FIX: Use momentum to pick the right value from the pair
    if is_alternating and alt_pair:
        # Sort pair by momentum - pick the HOTTER one
        sorted_pair = sorted(alt_pair, key=lambda v: momentum.get(v, 0), reverse=True)
        prediction = sorted_pair[0]  # Higher momentum
        alt = sorted_pair[1]  # Lower momentum
        method = 'alternating'
        confidence = 0.75
    
    # Step 2: PATTERN SHIFT (Swapped - predicts commons)
    elif pattern_shifted and shifted_to:
        king_momentum = momentum.get(commons[0], 0) if commons else 0
        rebel_momentum = momentum.get(shifted_to, 0)
        is_rebel_hot = shifted_to in hot_values[:2]
        
        if rebel_momentum > king_momentum * 0.7 or is_rebel_hot:
            # SWAPPED: King is prediction, rebel is alt
            prediction = commons[0] if commons else freq_pred
            alt = shifted_to
            method = 'pattern-shift'
            confidence = 0.65
    
    # Step 2b: OVERDUE WAVE (with momentum filter)
    # 🔧 FIX: Only predict overdue if it has SOME momentum OR is only candidate
    elif most_overdue and last_seen.get(most_overdue, -1) >= overdue_threshold:
        overdue_momentum = momentum.get(most_overdue, 0)
        is_only_overdue = len(overdue_values) <= 1
        
        # 🔧 FIX: Raised from 0.1 to 0.15 - 0.08-0.13 was still triggering incorrectly
        if overdue_momentum >= 0.15 or is_only_overdue:
            prediction = most_overdue
            second_overdue = sorted(
                [v for v in VALUES if v != most_overdue and last_seen[v] >= 0],
                key=lambda v: last_seen[v],
                reverse=True
            )
            alt = second_overdue[0] if second_overdue else hot_values[0]
            method = 'overdue-wave'
            confidence = 0.60
    
    # Step 3: WAVE-INVERSE
    elif wave_signals['wave_flip_probability'] >= 45:
        prediction = pair_alt or freq_alt
        alt = pair_pred or freq_pred
        method = 'wave-inverse'
        confidence = min(wave_signals['wave_flip_probability'] + 10, 85) / 100
    
    # Step 4: RUN BREAK
    elif run_break_likely:
        other_common = [c for c in commons if c != last_roll]
        if other_common:
            prediction = other_common[0]
            alt = last_roll
            method = 'run-break'
            confidence = 0.80 if current_run >= 4 else 0.70
    
    # Step 5: 2-GRAM
    elif has_2gram and gram2_conf >= 40:
        prediction = gram2_pred
        alt = gram2_alt
        method = '2-gram'
        confidence = gram2_conf / 100
    
    # Step 6: NOISE DOUBLE-TAP
    elif double_tap_likely and double_tap_val:
        prediction = double_tap_val
        alt = hot_values[0] if hot_values else commons[0]
        method = 'double-tap'
        confidence = 0.68
    
    # Step 7: NOISE-SNAPBACK
    elif wave_signals['noise_appearance_count'] >= 2 and last_roll in noise and current_run == 1:
        prediction = hot_values[0] if hot_values else commons[0] if commons else freq_pred
        alt = hot_values[1] if len(hot_values) > 1 else commons[1] if len(commons) > 1 else freq_alt
        method = 'noise-snapback'
        confidence = 0.65
    
    # Step 8: NOISE RISING
    elif noise_rising:
        prediction = noise_rising[0]
        alt = hot_values[0] if hot_values else commons[0]
        method = 'noise-rising'
        confidence = 0.60
    
    # Step 9: PAIR MATRIX
    elif pair_pred and pair_conf > 0:
        prediction = pair_pred
        alt = pair_alt or freq_alt
        method = 'pair-matrix'
        confidence = pair_conf / 100
    
    # Step 10: FREQUENCY FALLBACK
    else:
        prediction = freq_pred
        alt = freq_alt
        method = 'frequency'
        confidence = dist.get(freq_pred, 0) / 100
    
    # =========================================================================
    # POST-PROCESSING
    # =========================================================================
    
    # Final safety: ensure both valid and different
    if not prediction:
        prediction = freq_pred
    if not alt:
        alt = freq_alt
    if prediction == alt:
        alt = [v for v in freq_sorted if v != prediction][0] if len(freq_sorted) > 1 else freq_alt
    
    # Smart run final check
    pred_run_score = smart_run_scores.get(prediction, 1)
    alt_run_score = smart_run_scores.get(alt, 1)
    is_pattern_shift = 'pattern-shift' in method
    
    if not is_uncertain and pred_run_score < 0.5 and alt_run_score > pred_run_score:
        prediction, alt = alt, prediction
        method += '+run-break'
        confidence = min(confidence, 0.60)
    elif was_change and prediction == last_roll and pred_run_score >= 1.2:
        confidence = min(confidence * 1.1, 0.80)
        method += '+pair-expect'
    
    # Momentum tie-breaker (skip for pattern-shift)
    if is_uncertain and prediction and alt and not is_pattern_shift:
        pred_mom = momentum.get(prediction, 0)
        alt_mom = momentum.get(alt, 0)
        if alt_mom > pred_mom + 0.2:
            prediction, alt = alt, prediction
            method += '+momentum-tie'
            confidence = min(confidence + 0.05, 0.55)
        elif pred_mom > alt_mom + 0.2:
            method += '+momentum-confirm'
            confidence = min(confidence + 0.05, 0.55)
    
    # Dynamic confidence scaling
    if confidence_gap > 30:
        confidence *= 1.1
    elif confidence_gap < 15:
        confidence *= 0.8
    
    confidence = min(max(confidence, 0), 1.0)  # Clamp to [0, 1]
    
    return {
        'prediction': prediction,
        'alt': alt,
        'method': method,
        'confidence': round(confidence, 2),
        'debug': {
            'distribution': dist,
            'momentum': momentum,
            'last_seen': last_seen,
            'commons': commons,
            'noise': noise,
            'hot_values': hot_values,
            'overdue_threshold': overdue_threshold,
            'most_overdue': most_overdue,
            'overdue_values': overdue_values,
            'is_alternating': is_alternating,
            'pattern_shifted': pattern_shifted,
            'shifted_to': shifted_to,
            'current_run': current_run,
            'run_break_likely': run_break_likely,
            'wave_flip_prob': wave_signals['wave_flip_probability'],
            'is_uncertain': is_uncertain,
            'confidence_gap': confidence_gap,
            'has_2gram': has_2gram,
            'gram2_pred': gram2_pred,
            'gram2_conf': gram2_conf,
            'noise_rising': noise_rising,
            'double_tap': double_tap_likely,
            'smart_run_scores': smart_run_scores,
        }
    }


def run_backtest(rolls_str: str, verbose: bool = True):
    """Run backtest on a sequence of rolls"""
    rolls = [r.strip() for r in rolls_str.split(',') if r.strip()]
    
    if len(rolls) < 7:
        print("Need at least 7 rolls for testing")
        return
    
    print(f"\n{'='*70}")
    print(f"🧪 SVAROG PREDICTOR TESTER v2.0 - COMPLETE PORT - {len(rolls)} rolls")
    print(f"{'='*70}\n")
    
    hits = 0
    top2 = 0
    results = []
    
    for i in range(6, len(rolls)):
        context = rolls[:i]
        actual = rolls[i]
        
        result = predict(context)
        pred = result['prediction']
        alt_val = result['alt']
        method = result['method']
        conf = result['confidence']
        debug = result['debug']
        
        is_hit = actual == pred
        is_alt = actual == alt_val
        
        if is_hit:
            hits += 1
            top2 += 1
            status = "✅ HIT"
        elif is_alt:
            top2 += 1
            status = "⚡ ALT-HIT"
        else:
            status = "❌ MISS"
        
        if verbose:
            print(f"[{i+1:2d}] pred: {pred} ({int(conf*100):2d}%) | alt: {alt_val} | method: {method}")
            print(f"     ↳ actual: {actual} | {status}")
            print(f"     🔥 MOMENTUM: {debug['momentum']} | Hot: {debug['hot_values']}")
            print(f"     🔍 LAST-SEEN: {debug['last_seen']} | Overdue(≥{debug['overdue_threshold']}): {debug['overdue_values'] or 'none'}")
            
            if debug['is_uncertain']:
                print(f"     ⚠️ UNCERTAIN (gap: {debug['confidence_gap']}%)")
            if debug['is_alternating']:
                print(f"     🔄 ALTERNATING PATTERN")
            if debug['pattern_shifted']:
                print(f"     🔀 PATTERN SHIFT: {debug['shifted_to']} rising!")
            if debug['current_run'] >= 3:
                print(f"     ⏱️ LONG RUN: x{debug['current_run']} - break likely")
            if debug['double_tap']:
                print(f"     🔁 DOUBLE-TAP expected")
            if debug['noise_rising']:
                print(f"     📈 NOISE RISING: {debug['noise_rising']}")
            
            print()
        
        results.append({
            'index': i + 1,
            'pred': pred,
            'alt': alt_val,
            'actual': actual,
            'hit': is_hit,
            'alt_hit': is_alt,
            'method': method
        })
    
    total = len(results)
    main_acc = int(hits/total*100) if total > 0 else 0
    top2_acc = int(top2/total*100) if total > 0 else 0
    
    print(f"{'='*70}")
    print(f"📊 SUMMARY")
    print(f"{'='*70}")
    print(f"Main Hits:  {hits}/{total} = {main_acc}%")
    print(f"Top-2:      {top2}/{total} = {top2_acc}%")
    print()
    
    # Method breakdown
    method_stats = {}
    for r in results:
        m = r['method'].split('+')[0]  # Base method
        if m not in method_stats:
            method_stats[m] = {'total': 0, 'hits': 0, 'alt': 0}
        method_stats[m]['total'] += 1
        if r['hit']:
            method_stats[m]['hits'] += 1
        elif r['alt_hit']:
            method_stats[m]['alt'] += 1
    
    print("📈 METHOD BREAKDOWN:")
    for m, stats in sorted(method_stats.items(), key=lambda x: x[1]['total'], reverse=True):
        t = stats['total']
        h = stats['hits']
        a = stats['alt']
        main_pct = int(h/t*100) if t > 0 else 0
        top2_pct = int((h+a)/t*100) if t > 0 else 0
        print(f"  {m:20s}: {h}/{t} main ({main_pct:2d}%), {h+a}/{t} top-2 ({top2_pct:2d}%)")
    
    return {
        'main_hits': hits,
        'top2_hits': top2,
        'total': total,
        'main_acc': main_acc,
        'top2_acc': top2_acc,
        'results': results,
        'method_stats': method_stats
    }


if __name__ == '__main__':
    if len(sys.argv) < 2:
        # Default test data from user's session
        test_rolls = "41,42,43,41,41,43,42,41,42,44,43,42,42,42,44"
        print(f"Usage: python predictor_tester.py \"41,42,43,...\"")
        print(f"Running with default test data...")
        print()
    else:
        test_rolls = sys.argv[1]
    
    run_backtest(test_rolls)
