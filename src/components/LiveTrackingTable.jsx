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
  const rollValues = rolls.map(r => r.value || r);
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
          {distribution.map((item) => (
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
                  {item.status === 'dominant' ? 'DOMINANT' : item.status.toUpperCase()}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
      {/* BBP Mode Info */}
      {beastAnalysis.commons && beastAnalysis.commons.length >= 2 && (
        <div style={{
          padding: '12px 16px',
          background: 'rgba(99, 102, 241, 0.1)',
          borderTop: '1px solid rgba(99, 102, 241, 0.2)',
          fontSize: '11px',
          color: '#a78bfa'
        }}>
          <strong>BBP Mode Commons:</strong> {beastAnalysis.commons.join(', ')} | 
          <strong> Pattern:</strong> {beastAnalysis.pattern} | 
          <strong> Confidence:</strong> {Math.round(beastAnalysis.commonsConfidence * 100)}%
        </div>
      )}
    </div>
  );
}

export default LiveTrackingTable;
