/**
 * Admin Dashboard Page
 * Manage banners, caches, and game assets.
 */

import React, { useState, useEffect } from "react";
import { buildApiUrl } from "../utils/apiBase";

const ADMIN_API = buildApiUrl('/api/admin');

export default function AdminPage() {
  const [banners, setBanners] = useState({});
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [toast, setToast] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchBanners = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${ADMIN_API}?action=banners&game=all`);
      const data = await res.json();
      if (data.success) {
        setBanners(data.data);
        showToast('Banners refreshed!', 'success');
      }
    } catch (e) {
      showToast(`Error: ${e.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchStatus = async () => {
    try {
      const res = await fetch(`${ADMIN_API}?action=status`);
      const data = await res.json();
      if (data.success) setStatus(data);
    } catch (e) {
      console.error('Status fetch failed:', e);
    }
  };

  const clearCache = async () => {
    try {
      // Clear client caches
      const keys = [
        'cached_banner_data_v2',
        'genshin_cached_banners_v2',
        'wuwa_live_banners_cache_v5',
        'wuwa_parser_working_strategy'
      ];
      let cleared = 0;
      for (const key of keys) {
        if (localStorage.getItem(key)) {
          localStorage.removeItem(key);
          cleared++;
        }
      }

      // Signal server
      await fetch(`${ADMIN_API}?action=clear-cache`, { method: 'POST' });

      showToast(`Cleared ${cleared} cache entries`, 'success');
      setTimeout(() => window.location.reload(), 1000);
    } catch (e) {
      showToast(`Error: ${e.message}`, 'error');
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchBanners();
  }, []);

  const renderBannerCard = (banner, game) => (
    <div key={banner.id} className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
      <div className="flex items-center gap-3">
        {banner.image && (
          <img
            src={banner.image}
            alt={banner.name}
            className="w-12 h-12 rounded object-cover bg-slate-900"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-white truncate">{banner.name}</div>
          <div className="text-xs text-slate-400 flex gap-2 mt-0.5">
            <span className="uppercase tracking-wider">{banner.type}</span>
            <span>ID: {banner.bannerId || banner.id}</span>
            {banner.source && <span className="text-blue-400">{banner.source}</span>}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      {/* Header */}
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <p className="text-slate-400 text-sm mt-1">Manage banners, caches, and assets</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={fetchBanners}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {loading ? '↻ Refreshing...' : '↻ Refresh Banners'}
            </button>
            <button
              onClick={clearCache}
              className="px-4 py-2 bg-red-600/80 hover:bg-red-500 rounded-lg text-sm font-medium transition-colors"
            >
              🗑 Clear Caches
            </button>
          </div>
        </div>

        {/* Toast */}
        {toast && (
          <div className={`mb-4 p-3 rounded-lg text-sm ${
            toast.type === 'error' ? 'bg-red-900/50 text-red-200 border border-red-700' :
            toast.type === 'success' ? 'bg-green-900/50 text-green-200 border border-green-700' :
            'bg-blue-900/50 text-blue-200 border border-blue-700'
          }`}>
            {toast.message}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-slate-900/50 p-1 rounded-lg w-fit">
          {['overview', 'genshin', 'wuwa', 'hsr', 'assets'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-md text-sm font-medium capitalize transition-colors ${
                activeTab === tab
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800">
                <div className="text-slate-400 text-xs uppercase tracking-wider mb-1">Environment</div>
                <div className="text-lg font-semibold">{status?.environment || 'Unknown'}</div>
              </div>
              <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800">
                <div className="text-slate-400 text-xs uppercase tracking-wider mb-1">Cloudinary</div>
                <div className={`text-lg font-semibold ${status?.features?.cloudinary ? 'text-green-400' : 'text-red-400'}`}>
                  {status?.features?.cloudinary ? '✓ Connected' : '✗ Disconnected'}
                </div>
              </div>
              <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800">
                <div className="text-slate-400 text-xs uppercase tracking-wider mb-1">Turso DB</div>
                <div className={`text-lg font-semibold ${status?.features?.turso ? 'text-green-400' : 'text-red-400'}`}>
                  {status?.features?.turso ? '✓ Connected' : '✗ Disconnected'}
                </div>
              </div>
              <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800">
                <div className="text-slate-400 text-xs uppercase tracking-wider mb-1">Last Check</div>
                <div className="text-lg font-semibold">
                  {status?.timestamp ? new Date(status.timestamp).toLocaleTimeString() : 'Never'}
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-slate-900/50 rounded-xl p-5 border border-slate-800">
                <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                  HSR Banners
                </h3>
                <div className="text-3xl font-bold">{banners.hsr?.length || 0}</div>
                <div className="text-xs text-slate-500 mt-1">Active banners detected</div>
              </div>
              <div className="bg-slate-900/50 rounded-xl p-5 border border-slate-800">
                <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  Genshin Banners
                </h3>
                <div className="text-3xl font-bold">{banners.genshin?.length || 0}</div>
                <div className="text-xs text-slate-500 mt-1">Active banners detected</div>
              </div>
              <div className="bg-slate-900/50 rounded-xl p-5 border border-slate-800">
                <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                  WuWa Banners
                </h3>
                <div className="text-3xl font-bold">{banners.wuwa?.length || 0}</div>
                <div className="text-xs text-slate-500 mt-1">Active banners detected</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'genshin' && (
          <div className="space-y-4">
            <div className="bg-slate-900/50 rounded-xl p-5 border border-slate-800">
              <h3 className="text-lg font-semibold mb-4">Genshin Banners</h3>
              <div className="grid gap-2">
                {banners.genshin?.map(b => renderBannerCard(b, 'genshin')) || (
                  <div className="text-slate-500 text-sm">No banners loaded. Click Refresh.</div>
                )}
              </div>
            </div>

            <div className="bg-slate-900/50 rounded-xl p-5 border border-slate-800">
              <h3 className="text-lg font-semibold mb-2">Auto-Detection Info</h3>
              <p className="text-sm text-slate-400 mb-3">
                Genshin now uses smart statistical gap analysis to auto-detect 5-star characters.
                The featured 5-star has 5x-50x more pulls than 4-stars, creating a clear gap.
              </p>
              <div className="text-xs text-slate-500 bg-slate-950/50 p-3 rounded-lg font-mono">
                Detection priority:<br/>
                1. Whitelist match (if character is known)<br/>
                2. Statistical gap heuristic (ratio between counts)<br/>
                3. Legacy count-based fallback
              </div>
            </div>
          </div>
        )}

        {activeTab === 'wuwa' && (
          <div className="space-y-4">
            <div className="bg-slate-900/50 rounded-xl p-5 border border-slate-800">
              <h3 className="text-lg font-semibold mb-4">WuWa Banners</h3>
              <div className="grid gap-2">
                {banners.wuwa?.map(b => renderBannerCard(b, 'wuwa')) || (
                  <div className="text-slate-500 text-sm">No banners loaded. Click Refresh.</div>
                )}
              </div>
            </div>

            <div className="bg-slate-900/50 rounded-xl p-5 border border-slate-800">
              <h3 className="text-lg font-semibold mb-2">Scraper Status</h3>
              <p className="text-sm text-slate-400">
                WuWa uses adaptive HTML scraping from wuwatracker.com.
                Banner names and images are now fully dynamic — no hardcoded IDs.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'hsr' && (
          <div className="space-y-4">
            <div className="bg-slate-900/50 rounded-xl p-5 border border-slate-800">
              <h3 className="text-lg font-semibold mb-4">HSR Banners</h3>
              <div className="grid gap-2">
                {banners.hsr?.map(b => renderBannerCard(b, 'hsr')) || (
                  <div className="text-slate-500 text-sm">No banners loaded. Click Refresh.</div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'assets' && (
          <div className="space-y-4">
            <div className="bg-slate-900/50 rounded-xl p-5 border border-slate-800">
              <h3 className="text-lg font-semibold mb-4">Asset Upload</h3>
              <p className="text-sm text-slate-400 mb-4">
                Upload new game assets to Cloudinary and regenerate maps.
                Run this after downloading new character/weapon images.
              </p>

              <div className="space-y-3">
                <div className="bg-slate-950/50 p-4 rounded-lg font-mono text-sm">
                  <div className="text-slate-500 mb-2"># Upload specific game</div>
                  <div className="text-green-400">node scripts/auto-upload-assets.js genshin</div>
                  <div className="text-green-400">node scripts/auto-upload-assets.js wuwa</div>
                  <div className="text-slate-500 mt-3 mb-2"># Upload all games</div>
                  <div className="text-green-400">node scripts/auto-upload-assets.js all</div>
                </div>

                <div className="bg-amber-900/20 border border-amber-700/30 p-3 rounded-lg">
                  <div className="text-amber-400 text-sm font-medium">⚠️ Manual Step Required</div>
                  <div className="text-amber-300/70 text-xs mt-1">
                    Asset upload requires Cloudinary API access and must be run from the project directory.
                    Copy the commands above and run in your terminal.
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-900/50 rounded-xl p-5 border border-slate-800">
              <h3 className="text-lg font-semibold mb-2">Asset Locations</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-2 border-b border-slate-800">
                  <span className="text-slate-400">Genshin</span>
                  <span className="font-mono text-slate-300">D:\Coding\Assests Hoyo\genshin</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-800">
                  <span className="text-slate-400">WuWa</span>
                  <span className="font-mono text-slate-300">D:\Coding\Assests Hoyo\wuwa</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-slate-400">Generated Maps</span>
                  <span className="font-mono text-slate-300">src/generated/</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
