// src/components/LiveTrackingTable.jsx
// Frequency distribution table using BBP Mode's commons detection

import React from 'react';
import { predictNext2BBPMode } from '../utils/bbp-mode-2str';

function formatTime(timestamp) {
  if (!timestamp) return '—';
  const date = new Date(timestamp);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

export function LiveTrackingTable({ rolls = [] }) {
  if (rolls.length < 6) {
    return (
      <div className="no-data" style={{padding: '40px', textAlign: 'center', color: '#64748b'}}>
        Need at least 6 rolls to analyze patterns
      </div>
    );
  }

  // Get BBP Mode analysis to identify commons
  // 🔥 FIX: Filter to only 2-digit rolls (exclude 3-digit like 413)
  const rollValues = rolls
    .map(r => {
      const val = r.value || r;
      return String(val).slice(0, 2); // Take only first 2 digits
    })
    .filter(v => v && v.length === 2); // Only keep 2-digit rolls
  
  const beastAnalysis = predictNext2BBPMode(rollValues);
  
  // Count occurrences of each value
  const freq = {};
  rollValues.forEach(v => {
    freq[v] = (freq[v] || 0) + 1;
  });
  
  // Build distribution data
  const total = rollValues.length;
  const distribution = Object.entries(freq).map(([value, count]) => {
    const pct = (count / total) * 100;
    
    // Get last 5 occurrences of this value
    const occurrences = rollValues
      .map((v, i) => ({ v, i }))
      .filter(({ v }) => v === value)
      .slice(-5)
      .map(({ i }) => i);
    
    // Determine trend (comparing first half vs second half)
    const mid = Math.floor(rollValues.length / 2);
    const firstHalf = rollValues.slice(0, mid).filter(v => v === value).length;
    const secondHalf = rollValues.slice(mid).filter(v => v === value).length;
    let trend = '→';
    if (secondHalf > firstHalf * 1.3) trend = '↑';
    else if (secondHalf < firstHalf * 0.7) trend = '↓';
    
    // Determine status based on BBP Mode's commons
    let status = 'noise';
    let isDominant = false; // 🔥 NEW: Check for dominance (>60%)
    
    if (beastAnalysis.commons && beastAnalysis.commons.includes(value)) {
      status = 'common';
      // Check if this common is dominant (>=55%)
      if (pct > 55) {
        isDominant = true;
        status = 'dominant'; // Special status for dominant values
      }
    }
    
    // Get last 5 rolls of this value with context
    const last5Pattern = rollValues
      .map((v, i) => ({ v, i }))
      .filter(({ v }) => v === value)
      .slice(-5)
      .map(({ v }) => v)
      .join('-') || '—';
    
    return {
      value,
      count,
      pct,
      trend,
      status,
      isDominant, // 🔥 NEW
      last5Pattern,
      // For sorting: dominant first, then commons, then by count
      sortKey: isDominant ? 2000 + count : status === 'common' ? 1000 + count : count
    };
  });
  
  // Sort: commons first (by count), then noise (by count)
  distribution.sort((a, b) => b.sortKey - a.sortKey);
  
  return (
    <div className="frequency-table">
      <style>{`
        .frequency-table {
          background: rgba(30, 41, 59, 0.4);
          border: 1px solid rgba(148, 163, 184, 0.1);
          border-radius: 12px;
          overflow: hidden;
        }
        
        .freq-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }
        
        .freq-table thead th {
          background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
          color: white;
          padding: 12px 8px;
          text-align: center;
          font-weight: 600;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-right: 1px solid rgba(255,255,255,0.1);
        }
        
        .freq-table thead th:last-child {
          border-right: none;
        }
        
        .freq-table tbody td {
          padding: 10px 8px;
          text-align: center;
          border-bottom: 1px solid rgba(148, 163, 184, 0.1);
          color: #cbd5e1;
        }
        
        .freq-table tbody tr {
          background: rgba(15, 23, 42, 0.3);
        }
        
        .freq-table tbody tr:hover {
          background: rgba(99, 102, 241, 0.1);
        }
        
        .freq-table tbody tr.is-common {
          background: rgba(34, 197, 94, 0.1);
        }
        
        .freq-table tbody tr.is-common:hover {
          background: rgba(34, 197, 94, 0.15);
        }
        
        .freq-table tbody tr.is-dominant {
          background: rgba(243, 104, 18, 0.27);
          border-left: 3px solid #fbbf24;
        }
        
        .freq-table tbody tr.is-dominant:hover {
          background: rgba(251, 191, 36, 0.2);
        }
        
        .value-cell {
          font-weight: 700;
          font-size: 18px;
          color: #e2e8f0;
        }
        
        .count-cell {
          font-weight: 600;
          color: #94a3b8;
        }
        
        .pct-cell {
          font-weight: 500;
          font-size: 14px;
        }
        
        .trend-cell {
          font-size: 20px;
          font-weight: 600;
        }
        
        .trend-up { color: #22c55e; }
        .trend-down { color: #ef4444; }
        .trend-stable { color: #64748b; }
        
        .pattern-cell {
          font-family: 'Courier New', monospace;
          font-size: 11px;
          color: #94a3b8;
        }
        
        .status-badge {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .status-common {
          background: rgba(34, 197, 94, 0.2);
          color: #22c55e;
          border: 1px solid rgba(34, 197, 94, 0.3);
        }
        
        .status-dominant {
          background: rgba(251, 191, 36, 0.3);
          color: #fbbf24;
          border: 1px solid rgba(251, 191, 36, 0.5);
          font-weight: 800;
        }
        
        .status-noise {
          background: rgba(148, 163, 184, 0.1);
          color: #94a3b8;
          border: 1px solid rgba(148, 163, 184, 0.2);
        }
        
        .no-data {
          padding: 40px;
          text-align: center;
          color: #64748b;
          font-size: 13px;
        }
      `}</style>
      
      <table className="freq-table">
        <thead>
          <tr>
            <th style={{width: '60px'}}>Value</th>
            <th style={{width: '60px'}}>Count</th>
            <th style={{width: '70px'}}>%</th>
            <th style={{width: '50px'}}>Trend</th>
            <th style={{width: '120px'}}>Last 5</th>
            <th style={{width: '90px'}}>Status</th>
          </tr>
        </thead>
        <tbody>
          {distribution.map((item) => {
            // Check if this value is a mean reversion candidate
            const candidate = beastAnalysis.candidates?.find(c => c.value === item.value);
            const isMeanReversion = candidate?.meanReversion;
            
            return (
              <tr key={item.value} className={
                item.status === 'dominant' ? 'is-dominant' : 
                item.status === 'common' ? 'is-common' : ''
              }>
                <td className="value-cell">{item.value}</td>
                <td className="count-cell">{item.count}</td>
                <td className="pct-cell">{item.pct.toFixed(1)}%</td>
                <td className={`trend-cell trend-${
                  item.trend === '↑' ? 'up' : item.trend === '↓' ? 'down' : 'stable'
                }`}>
                  {item.trend}
                </td>
                <td className="pattern-cell">{item.last5Pattern}</td>
                <td>
                  <span className={`status-badge status-${item.status}`}>
                    {item.status === 'dominant' ? 'DOMINANT' : 
                     item.status === 'common' ? 'COMMON' : 'NOISE'}
                  </span>
                  {isMeanReversion && (
                    <span style={{
                      marginLeft: '4px',
                      padding: '2px 6px',
                      background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
                      color: 'white',
                      borderRadius: '4px',
                      fontSize: '9px',
                      fontWeight: '700',
                      border: '1px solid rgba(255,255,255,0.3)',
                      boxShadow: '0 1px 3px rgba(6, 182, 212, 0.4)'
                    }}>
                      ⚡ REVERSION
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      
      {/* Trend Legend */}
      <div style={{
        padding: '8px 16px',
        background: 'rgba(71, 85, 105, 0.3)',
        borderTop: '1px solid rgba(148, 163, 184, 0.2)',
        fontSize: '10px',
        color: '#94a3b8',
        display: 'flex',
        gap: '16px',
        flexWrap: 'wrap'
      }}>
        <div><strong>Trend:</strong></div>
        <div>↑ Rising (frequency increasing)</div>
        <div>→ Stable (no change)</div>
        <div>↓ Falling (frequency decreasing)</div>
      </div>
      
      {/* BBP Mode Info - Enhanced (Inline) */}
      {beastAnalysis.commons && beastAnalysis.commons.length >= 2 && (
        <div style={{
          padding: '12px 18px',
          background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(59, 130, 246, 0.15) 100%)',
          borderTop: '2px solid rgba(139, 92, 246, 0.4)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          flexWrap: 'wrap'
        }}>
          <div style={{ 
            fontSize: '11px', 
            fontWeight: '700',
            color: '#a78bfa',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            🦁 BBP:
          </div>
          
          {/* Commons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {beastAnalysis.commons.map((c, idx) => (
              <span key={idx} style={{
                padding: '4px 10px',
                background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                color: 'white',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '700',
                boxShadow: '0 2px 6px rgba(34, 197, 94, 0.4)',
                border: '1px solid rgba(255,255,255,0.2)'
              }}>
                {c}
              </span>
            ))}
          </div>
          
          {/* Pattern */}
          <span style={{
            padding: '4px 12px',
            background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
            color: 'white',
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: '700',
            boxShadow: '0 2px 6px rgba(139, 92, 246, 0.4)',
            border: '1px solid rgba(255,255,255,0.2)',
            textTransform: 'capitalize'
          }}>
            {beastAnalysis.pattern}
          </span>
          
          {/* Confidence */}
          <span style={{
            padding: '4px 12px',
            background: beastAnalysis.commonsConfidence >= 0.7 ? 
              'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' :
              beastAnalysis.commonsConfidence >= 0.5 ?
              'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' :
              'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
            color: 'white',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: '700',
            boxShadow: `0 2px 6px ${
              beastAnalysis.commonsConfidence >= 0.7 ? 'rgba(34, 197, 94, 0.4)' :
              beastAnalysis.commonsConfidence >= 0.5 ? 'rgba(245, 158, 11, 0.4)' :
              'rgba(239, 68, 68, 0.4)'
            }`,
            border: '1px solid rgba(255,255,255,0.2)'
          }}>
            {Math.round(beastAnalysis.commonsConfidence * 100)}%
          </span>
        </div>
      )}
      
      {/* 🎯 MARK Mode Stability */}
      {beastAnalysis.markData && (
        <div style={{
          padding: '14px 16px',
          background: beastAnalysis.markData.state === 'LOCKED' ? 'rgba(34, 197, 94, 0.15)' :
                     beastAnalysis.markData.state === 'WATCH' ? 'rgba(251, 191, 36, 0.15)' :
                     beastAnalysis.markData.state === 'COUNTER' ? 'rgba(249, 115, 22, 0.15)' :
                     beastAnalysis.markData.state === 'CHAOS' ? 'rgba(239, 68, 68, 0.15)' :
                     'rgba(148, 163, 184, 0.15)',
          borderTop: '2px solid ' + (
            beastAnalysis.markData.state === 'LOCKED' ? '#22c55e' :
            beastAnalysis.markData.state === 'WATCH' ? '#fbbf24' :
            beastAnalysis.markData.state === 'COUNTER' ? '#f97316' :
            beastAnalysis.markData.state === 'CHAOS' ? '#ef4444' :
            '#94a3b8'
          ),
          fontSize: '12px'
        }}>
          {/* State Badge + Metrics */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
            <span style={{
              display: 'inline-block',
              padding: '5px 12px',
              borderRadius: '6px',
              fontWeight: '700',
              fontSize: '11px',
              background: beastAnalysis.markData.state === 'LOCKED' ? '#22c55e' :
                         beastAnalysis.markData.state === 'WATCH' ? '#fbbf24' :
                         beastAnalysis.markData.state === 'COUNTER' ? '#f97316' :
                         beastAnalysis.markData.state === 'CHAOS' ? '#ef4444' :
                         '#94a3b8',
              color: 'white',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              {beastAnalysis.markData.state === 'LOCKED' ? '🟢' :
               beastAnalysis.markData.state === 'WATCH' ? '🟡' :
               beastAnalysis.markData.state === 'COUNTER' ? '🟠' :
               beastAnalysis.markData.state === 'CHAOS' ? '🔴' : '⚪'} 
              {beastAnalysis.markData.state}
            </span>
            <span style={{ color: '#cbd5e1', fontSize: '11px' }}>
              Stability: <strong>{beastAnalysis.markData.stabilityScore}/100</strong>
            </span>
            {beastAnalysis.markData.waveIntensity > 0 && (
              <span style={{ color: '#cbd5e1', fontSize: '11px' }}>
                Wave: <strong>{beastAnalysis.markData.waveIntensity} flips</strong>
              </span>
            )}
          </div>
          
          {/* 📊 Roll Timeline */}
          <div style={{ 
            marginBottom: '12px',
            padding: '10px',
            background: 'rgba(0, 0, 0, 0.2)',
            borderRadius: '6px'
          }}>
            <div style={{ fontSize: '10px', color: '#94a3b8', marginBottom: '8px', fontWeight: '600' }}>
              📊 LAST 12 ROLLS (Oldest → Newest)
            </div>

            {/* Roll blocks */}
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {rollValues.slice(-12).map((roll, idx) => {
                const isCommon = beastAnalysis.commons?.includes(roll);
                return (
                  <div key={idx} style={{
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: '700',
                    background: isCommon ? 
                      (roll === '41' ? '#3b82f6' : 
                       roll === '42' ? '#8b5cf6' : 
                       roll === '43' ? '#ec4899' : '#f59e0b') :
                      'rgba(100, 116, 139, 0.3)',
                    color: isCommon ? 'white' : '#94a3b8',
                    border: isCommon ? '2px solid rgba(255,255,255,0.3)' : '2px solid transparent'
                  }}>
                    {roll}
                  </div>
                );
              })}
            </div>
            
            {/* Legend */}
            <div style={{ 
              marginTop: '8px', 
              fontSize: '9px', 
              color: '#94a3b8',
              display: 'flex',
              gap: '12px',
              flexWrap: 'wrap'
            }}>
              <span>🟦 41</span>
              <span>🟪 42</span>
              <span>🟥 43</span>
              <span>🟧 44</span>
              <span style={{ marginLeft: '8px' }}>⚪ = Noise</span>
            </div>
            
            {/* Metrics summary */}
            <div style={{ 
              marginTop: '8px',
              paddingTop: '8px',
              borderTop: '1px solid rgba(255,255,255,0.1)',
              fontSize: '9px',
              color: '#cbd5e1',
              display: 'flex',
              gap: '12px',
              flexWrap: 'wrap'
            }}>
              <span>Pattern Strength: <strong>{beastAnalysis.markData.csi}</strong></span>
              <span>Noise Level: <strong>{beastAnalysis.markData.ntl}</strong></span>
              <span>Clarity: <strong>{beastAnalysis.markData.pc}</strong></span>
              <span>Flips: <strong>{beastAnalysis.markData.waveIntensity}</strong></span>
            </div>
          </div>
          
          {/* 2-Column Layout: Warnings + Quick Guide */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: beastAnalysis.markData.signals?.length > 0 ? '1fr 1fr' : '1fr',
            gap: '16px',
            marginTop: '10px',
            paddingTop: '10px',
            borderTop: '1px solid rgba(255,255,255,0.1)'
          }}>
            {/* Left Column: Pattern Warnings (if any) */}
            {beastAnalysis.markData.signals && beastAnalysis.markData.signals.length > 0 && (
              <div>
                <div style={{
                  fontSize: '10px',
                  fontWeight: '700',
                  color: '#fbbf24',
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  ⚠️ Warnings
                </div>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}>
                  {beastAnalysis.markData.signals.map((signal, idx) => (
                    <div key={idx} style={{
                      padding: '6px 10px',
                      background: 'rgba(251, 191, 36, 0.15)',
                      borderRadius: '6px',
                      border: '1px solid rgba(251, 191, 36, 0.3)',
                      fontSize: '10px',
                      color: '#fde047',
                      fontWeight: '600',
                      lineHeight: '1.4'
                    }}>
                      ⚠️ {signal}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Right Column: Quick Guide */}
            <div>
              <div style={{
                fontSize: '10px',
                fontWeight: '700',
                color: '#94a3b8',
                marginBottom: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                📖 Quick Guide
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '9px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '3px',
                    background: '#22c55e',
                    flexShrink: 0
                  }} />
                  <span style={{ color: '#cbd5e1' }}>
                    <strong>BET GOOD:</strong> Strength ≥60, Noise ≤40, Clarity ≥60, Flips &lt;5
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '3px',
                    background: '#fbbf24',
                    flexShrink: 0
                  }} />
                  <span style={{ color: '#cbd5e1' }}>
                    <strong>BET OKAY:</strong> Strength ≥50, Noise &lt;60, Clarity ≥50, Flips &lt;5
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '3px',
                    background: '#ef4444',
                    flexShrink: 0
                  }} />
                  <span style={{ color: '#cbd5e1' }}>
                    <strong>SKIP:</strong> Noise &gt;60 OR Flips ≥5 OR Strength &lt;50
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div style={{
            marginTop: '12px',
            paddingTop: '12px',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            fontSize: '10px',
            color: '#94a3b8',
            display: 'flex',
            gap: '16px',
            flexWrap: 'wrap'
          }}>
            <div><strong>Stability:</strong> {beastAnalysis.markData.stabilityScore}/100</div>
            <div><strong>Wave:</strong> {beastAnalysis.markData.waveIntensity} flips</div>
          </div>

          {/* Recommendation */}
          <div style={{
            marginTop: '10px',
            padding: '8px 12px',
            borderRadius: '6px',
            background: `linear-gradient(135deg, ${
              beastAnalysis.markData.state === 'LOCKED' ? 'rgba(34, 197, 94, 0.2)' :
              beastAnalysis.markData.state === 'WATCH' ? 'rgba(251, 191, 36, 0.2)' :
              'rgba(249, 115, 22, 0.2)'
            } 0%, rgba(0,0,0,0.1) 100%)`,
            border: `1px solid ${
              beastAnalysis.markData.state === 'LOCKED' ? '#22c55e' :
              beastAnalysis.markData.state === 'WATCH' ? '#fbbf24' :
              '#f97316'
            }`,
            color: '#e2e8f0',
            fontSize: '13px',
            fontWeight: '600',
            marginBottom: beastAnalysis.markData.signals && beastAnalysis.markData.signals.length > 0 ? '10px' : '0'
          }}>
            {beastAnalysis.markData.recommendation}
          </div>
        </div>
      )}
    </div>
  );
}

export default LiveTrackingTable;
