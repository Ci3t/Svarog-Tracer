import React, { useRef } from 'react';
import { usePresenceContext } from '../contexts/PresenceContext';

export default function HomeStatsWidget() {
  const { stats } = usePresenceContext();
  const widgetRef = useRef(null);
  
  // Format numbers with commas, handle all cases robustly
  const formatNumber = (num) => {
    if (num === null || num === undefined) return '0';
    if (typeof num !== 'number') return String(num);
    if (num === 0) return '0';
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toLocaleString('en-US');
  };
  
  // Show spinner if loading and no data
  if (stats.loading && stats.total === 0) {
    return (
      <div className="home-stats-widget-loading" style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem',
        width: '100%',
        maxWidth: '1100px',
        margin: '0 auto',
        background: 'linear-gradient(135deg, #0f172a 0%, #020617 100%)',
        borderRadius: '32px',
        border: '1px solid rgba(168, 85, 247, 0.2)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
      }}>
        <div className="spinner" />
        <span style={{ 
          color: '#94a3b8', 
          fontSize: '11px', 
          fontWeight: '900', 
          letterSpacing: '4px', 
          textTransform: 'uppercase', 
          marginTop: '1.5rem',
          fontFamily: 'monospace'
        }}>
          SYNCING SVAROG NETWORK...
        </span>
        <style>{`
          .spinner {
            width: 40px;
            height: 40px;
            border: 3px solid rgba(168, 85, 247, 0.1);
            border-top: 3px solid #a855f7;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }
  
  if (stats.error && stats.total === 0) {
    return null;
  }
  
  return (
    <div 
      className="home-stats-widget"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '1rem',
        padding: '1.5rem 0',
        maxWidth: '1000px',
        margin: '0 auto',
        width: '100%',
        position: 'relative',
        zIndex: 100,
        isolation: 'isolate'
      }}
    >
      {/* Active Users */}
      <div className="stat-card stat-online">
        <div className="stat-card-glow" />
        <div className="stat-icon">👥</div>
        <div className="stat-value">{formatNumber(stats.online)}</div>
        <div className="stat-label">Online Status</div>
      </div>

      {/* Prediction Now */}
      <div className="stat-card stat-prediction">
        <div className="stat-card-glow" />
        <div className="stat-icon">🎯</div>
        <div className="stat-value">{formatNumber(stats.active)}</div>
        <div className="stat-label">Prediction Now</div>
      </div>
      
      {/* Today Predictions */}
      <div className="stat-card stat-today">
        <div className="stat-card-glow" />
        <div className="stat-icon">📊</div>
        <div className="stat-value">{formatNumber(stats.today)}</div>
        <div className="stat-label">Today Predictions</div>
      </div>
      
      {/* Total Predictions */}
      <div className="stat-card stat-total">
        <div className="stat-card-glow" />
        <div className="stat-icon">🎲</div>
        <div className="stat-value">{formatNumber(stats.total)}</div>
        <div className="stat-label">Total Predictions</div>
      </div>
      
      <style>{`
        .home-stats-widget {
          opacity: 1 !important;
          visibility: visible !important;
          margin-top: 0.5rem;
        }

        .stat-card {
          background: linear-gradient(180deg, rgba(15, 23, 42, 0.9) 0%, rgba(2, 6, 23, 1) 100%) !important;
          border-radius: 20px;
          padding: 1.5rem 1rem;
          text-align: center;
          position: relative;
          border: 1px solid rgba(255, 255, 255, 0.05);
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          overflow: hidden;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
        }

        .stat-card-glow {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at center, var(--glow-color) 0%, transparent 70%);
          opacity: 0.03;
          pointer-events: none;
        }

        .stat-card:hover {
          transform: translateY(-4px) scale(1.02);
          border-color: var(--theme-color);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6), 0 0 15px var(--glow-color);
        }

        .stat-icon {
          font-size: 1.5rem;
          margin-bottom: 0.75rem;
          filter: drop-shadow(0 0 8px rgba(255,255,255,0.1));
        }

        .stat-value {
          font-size: 2.2rem;
          font-weight: 950;
          font-family: 'JetBrains Mono', 'Monospace', monospace;
          margin-bottom: 0.25rem;
          letter-spacing: -1.5px;
          line-height: 1;
          color: white;
          text-shadow: 0 0 20px var(--glow-color);
        }

        .stat-label {
          font-size: 0.6rem;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 2px;
          color: #64748b;
          white-space: nowrap;
        }

        /* Neon Themes */
        .stat-online { 
          --theme-color: rgba(56, 189, 248, 0.5);
          --glow-color: rgba(56, 189, 248, 0.3);
          border-left: 2px solid #0ea5e9;
        }
        .stat-online .stat-value { color: #38bdf8; }

        .stat-prediction { 
          --theme-color: rgba(16, 185, 129, 0.5);
          --glow-color: rgba(16, 185, 129, 0.3);
          border-left: 2px solid #10b981;
        }
        .stat-prediction .stat-value { color: #34d399; }

        .stat-today { 
          --theme-color: rgba(245, 158, 11, 0.5);
          --glow-color: rgba(245, 158, 11, 0.3);
          border-left: 2px solid #f59e0b;
        }
        .stat-today .stat-value { color: #fbbf24; }

        .stat-total { 
          --theme-color: rgba(236, 72, 153, 0.5);
          --glow-color: rgba(236, 72, 153, 0.3);
          border-left: 2px solid #ec4899;
        }
        .stat-total .stat-value { color: #f472b6; }

      `}</style>
    </div>
  );
}
