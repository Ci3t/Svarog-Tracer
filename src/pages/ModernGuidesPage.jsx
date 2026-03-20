// Modern Guides Page - Professional Animated Version with GSAP
import React, { useState, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import GuideModal from '../components/GuideModal';
import LiveModeGuide from '../components/guides/LiveModeGuide';
import LongStringGuide from '../components/guides/LongStringGuide';
import KiyoGuide from '../components/guides/KiyoGuide';
import WarpGuide from '../components/guides/WarpGuide';
import guidesData from '../data/guides.json';
import { useAuth } from '../hooks/useAuth';
import { buildApiUrl } from '../utils/apiBase';

// API Configuration
const API_URL = buildApiUrl('/api/guides');

const getYouTubeEmbedUrl = (videoId) => `https://www.youtube.com/embed/${videoId}`;
const getYouTubeThumbnail = (videoId) => `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

const COLOR_CLASSES = {
  amber: { border: 'border-amber-500/20', gradient: 'from-amber-500/30 to-orange-500/30', text: 'text-amber-400', glow: 'shadow-amber-500/20' },
  purple: { border: 'border-purple-500/20', gradient: 'from-purple-500/30 to-violet-500/30', text: 'text-purple-400', glow: 'shadow-purple-500/20' },
  emerald: { border: 'border-emerald-500/20', gradient: 'from-emerald-500/30 to-teal-500/30', text: 'text-emerald-400', glow: 'shadow-emerald-500/20' },
  cyan: { border: 'border-cyan-500/20', gradient: 'from-cyan-500/30 to-blue-500/30', text: 'text-cyan-400', glow: 'shadow-cyan-500/20' },
};

// Video Card with GSAP hover animations
function VideoCard({ video, color, creatorName, className = "", delay = 0, isAdmin, onEdit, onDelete, onMove }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const cardRef = useRef(null);
  const playButtonRef = useRef(null);
  const colors = COLOR_CLASSES[color];

  useEffect(() => {
    gsap.fromTo(cardRef.current,
      { y: 50, opacity: 0, scale: 0.9 },
      { y: 0, opacity: 1, scale: 1, duration: 0.8, ease: 'back.out(1.2)', delay }
    );
  }, [delay]);

  const handleMouseEnter = () => {
    if (!isPlaying) {
      gsap.to(cardRef.current, { y: -8, boxShadow: `0 20px 40px rgba(147, 51, 234, 0.4)`, duration: 0.3, ease: 'power2.out' });
      gsap.to(playButtonRef.current, { scale: 1.2, rotation: 15, duration: 0.3, ease: 'back.out(2)' });
    }
  };

  const handleMouseLeave = () => {
    if (!isPlaying) {
      gsap.to(cardRef.current, { y: 0, boxShadow: '0 0 0 rgba(0,0,0,0)', duration: 0.3 });
      gsap.to(playButtonRef.current, { scale: 1, rotation: 0, duration: 0.3 });
    }
  };

  return (
    <div
      ref={cardRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`group relative bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-xl border ${colors.border} overflow-hidden theme-glass-card ${className}`}
    >
      <div className="relative aspect-[16/7.6] bg-slate-900">
        {isPlaying ? (
          <iframe src={`${getYouTubeEmbedUrl(video.id)}?autoplay=1`} className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen title={video.title} />
        ) : (
          <>
            <img src={getYouTubeThumbnail(video.id)} alt={video.title} className="w-full h-full object-cover opacity-80" onError={(e) => { e.target.src = `https://img.youtube.com/vi/${video.id}/hqdefault.jpg`; }} />
            <button onClick={() => setIsPlaying(true)} className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/30 transition-colors cursor-pointer">
              <div ref={playButtonRef} className={`w-12 h-12 rounded-full bg-gradient-to-br ${colors.gradient} flex items-center justify-center shadow-2xl border border-white/10`}>
                <svg className="w-6 h-6 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
              </div>
            </button>
            {video.featured && (
              <div className="absolute top-2.5 left-2.5 px-2 py-1 bg-gradient-to-r from-amber-500/80 to-orange-500/80 rounded-full text-[9px] font-bold text-white uppercase tracking-wider shadow-lg">
                ⭐ Featured
              </div>
            )}
          </>
        )}
      </div>
      <div className="p-3.5">
        <h3 className="text-[13px] font-bold text-white mb-1.5 line-clamp-2">{video.title}</h3>
        <p className="text-[11px] text-slate-400 line-clamp-2 mb-2.5">{video.description}</p>

        {isAdmin && (
          <div className="flex items-center gap-2 mb-3 p-2 bg-black/40 rounded-lg border border-white/5">
            <button onClick={() => onEdit(video)} className="p-1 hover:bg-white/10 rounded-md text-slate-400 hover:text-white transition-colors cursor-pointer" title="Edit Video">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            </button>
            <div className="h-3 w-px bg-white/10"></div>
            <button onClick={() => onMove(video, 'up')} className="p-1 hover:bg-white/10 rounded-md text-slate-400 hover:text-white transition-colors cursor-pointer" title="Move Up">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
            </button>
            <button onClick={() => onMove(video, 'down')} className="p-1 hover:bg-white/10 rounded-md text-slate-400 hover:text-white transition-colors cursor-pointer" title="Move Down">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            <div className="ml-auto flex items-center gap-2">
              <div className="h-3 w-px bg-white/10"></div>
              <button onClick={() => onDelete(video.id)} className="p-1 hover:bg-red-500/20 rounded-md text-slate-500 hover:text-red-400 transition-colors cursor-pointer" title="Delete Video">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className={`text-[10px] font-medium ${colors.text} uppercase tracking-wider`}>{creatorName}</span>
          <a href={`https://www.youtube.com/watch?v=${video.id}`} target="_blank" rel="noopener noreferrer" className="text-[11px] text-slate-500 hover:text-white transition-colors flex items-center gap-1 cursor-pointer">
            Watch on YouTube
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
          </a>
        </div>
      </div>
    </div>
  );
}

// Creator Section
function CreatorSection({ creator, index, isAdmin, onAdd, onEdit, onDelete, onMove }) {
  const sectionRef = useRef(null);
  const headerRef = useRef(null);
  const colors = COLOR_CLASSES[creator.color];

  useEffect(() => {
    const tl = gsap.timeline({ delay: index * 0.2 });
    tl.fromTo(sectionRef.current, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' })
      .fromTo(headerRef.current, { x: -30, opacity: 0 }, { x: 0, opacity: 1, duration: 0.5, ease: 'power2.out' }, '-=0.4');
  }, [index]);

  return (
    <section ref={sectionRef} className="mb-8">
      <div ref={headerRef} className="flex items-center justify-between gap-4 mb-4 py-3 px-4 rounded-lg bg-slate-800/40 border border-slate-700/40">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${colors.gradient} flex items-center justify-center shadow-lg`}>
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
            </svg>
          </div>
          <div>
            <h2 className={`text-sm font-bold ${colors.text}`}>{creator.name}</h2>
            <p className="text-[10px] text-slate-500">{creator.description}</p>
          </div>
        </div>
        <a href={creator.channelUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-700/50 hover:bg-slate-600/50 text-white text-[10px] font-bold transition-all cursor-pointer border border-slate-600/30">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" /></svg>
          Visit Channel
        </a>

        {isAdmin && (
          <button onClick={() => onAdd(creator.id)} className="ml-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-bold transition-all cursor-pointer border border-purple-400/20 shadow-lg shadow-purple-500/20">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
            Add Video
          </button>
        )}
      </div>

      <div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
          {creator.videos.map((video, i) => (
            <VideoCard
              key={`${video.id}-${i}`}
              video={video}
              color={creator.color}
              creatorName={creator.shortName}
              className=""
              delay={i * 0.15}
              isAdmin={isAdmin}
              onEdit={(v) => onEdit(creator.id, v)}
              onDelete={(vid) => onDelete(creator.id, vid)}
              onMove={(v, dir) => onMove(creator.id, v, dir)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

// Video Management Modal (Add/Edit)
function VideoManagementModal({ isOpen, mode, video, onSave, onClose }) {
  const [formData, setFormData] = useState({ id: '', title: '', description: '', featured: false });
  const modalRef = useRef(null);
  const overlayRef = useRef(null);

  useEffect(() => {
    if (video) {
      setFormData({
        id: video.id || '',
        title: video.title || '',
        description: video.description || '',
        featured: video.featured || false
      });
    } else {
      setFormData({ id: '', title: '', description: '', featured: false });
    }
  }, [video, isOpen]);

  useEffect(() => {
    if (isOpen) {
      gsap.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.3 });
      gsap.fromTo(modalRef.current, { scale: 0.9, opacity: 0, y: 20 }, { scale: 1, opacity: 1, y: 0, duration: 0.4, ease: 'back.out(1.5)' });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      <div ref={overlayRef} onClick={onClose} className="theme-modal-overlay absolute inset-0"></div>

      <div ref={modalRef} className="theme-modal-shell relative w-full max-w-md overflow-hidden">
        {/* Animated Background Glow */}
        <div className="absolute top-0 left-1/2 h-32 w-64 -translate-x-1/2 rounded-full blur-[80px] theme-badge-accent"></div>

        <div className="relative p-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-black text-white uppercase tracking-tighter italic">
              {mode === 'add' ? 'Add New Guide' : 'Edit Video Guide'}
            </h2>
            <button onClick={onClose} className="theme-icon-button flex h-10 w-10 items-center justify-center rounded-full cursor-pointer">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <div className="space-y-5">
            <div>
              <label className="theme-text-accent block px-1 mb-2 text-[10px] font-black uppercase tracking-widest">YouTube Video ID</label>
              <input
                type="text"
                placeholder="e.g. QrqPENtcFus"
                value={formData.id}
                onChange={e => setFormData({ ...formData, id: e.target.value })}
                className="theme-input w-full rounded-2xl px-5 py-3.5 text-sm outline-none"
              />
            </div>

            <div>
              <label className="theme-text-accent block px-1 mb-2 text-[10px] font-black uppercase tracking-widest">Title</label>
              <input
                type="text"
                placeholder="Guide Title"
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                className="theme-input w-full rounded-2xl px-5 py-3.5 text-sm outline-none"
              />
            </div>

            <div>
              <label className="theme-text-accent block px-1 mb-2 text-[10px] font-black uppercase tracking-widest">Description</label>
              <textarea
                placeholder="Short description..."
                rows="3"
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                className="theme-textarea w-full resize-none rounded-2xl px-5 py-3.5 text-sm outline-none"
              ></textarea>
            </div>

            <div className="theme-subpanel flex items-center justify-between rounded-2xl p-4">
              <span className="text-xs font-bold text-slate-300">Featured Video</span>
              <button
                onClick={() => setFormData({ ...formData, featured: !formData.featured })}
                className={`relative h-6 w-12 rounded-full transition-all ${formData.featured ? 'theme-action-primary' : 'theme-action-secondary'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData.featured ? 'left-7' : 'left-1'}`}></div>
              </button>
            </div>

            <div className="pt-4 flex gap-3">
              <button
                onClick={onClose}
                className="theme-action-secondary flex-1 rounded-2xl py-4 text-xs font-bold uppercase tracking-widest transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => onSave(formData)}
                className="theme-action-primary flex-1 rounded-2xl py-4 text-xs font-bold uppercase tracking-widest transition-all cursor-pointer"
              >
                Save Guide
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Written Guide Card with simple hover animations
function GuideCard({ guide, onClick, index }) {
  const cardRef = useRef(null);
  const iconRef = useRef(null);
  const glowRef = useRef(null);
  const colors = COLOR_CLASSES[guide.color];

  useEffect(() => {
    gsap.fromTo(cardRef.current,
      { y: 40, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out', delay: index * 0.1 }
    );
    gsap.fromTo(iconRef.current,
      { scale: 0 },
      { scale: 1, duration: 0.5, ease: 'back.out(1.7)', delay: 0.2 + index * 0.1 }
    );
  }, [index]);

  const handleMouseEnter = () => {
    gsap.to(cardRef.current, { y: -8, scale: 1.02, duration: 0.3, ease: 'power2.out' });
    gsap.to(iconRef.current, { scale: 1.15, rotation: 10, duration: 0.3, ease: 'power2.out' });
    gsap.to(glowRef.current, { opacity: 0.5, duration: 0.3 });
  };

  const handleMouseLeave = () => {
    gsap.to(cardRef.current, { y: 0, scale: 1, duration: 0.3 });
    gsap.to(iconRef.current, { scale: 1, rotation: 0, duration: 0.3 });
    gsap.to(glowRef.current, { opacity: 0, duration: 0.3 });
  };

  return (
    <div className="relative">
      <div ref={glowRef} className={`absolute inset-0 bg-gradient-to-r ${colors.gradient} rounded-2xl blur-2xl opacity-0`} style={{ pointerEvents: 'none' }} />
      <button
        ref={cardRef}
        onClick={onClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`relative w-full bg-gradient-to-br from-slate-800/60 to-slate-900/60 rounded-2xl border ${colors.border} shadow-xl overflow-hidden p-6 text-left cursor-pointer backdrop-blur-sm group theme-glass-card`}
      >
        <div className="flex items-start justify-between mb-4">
          <div ref={iconRef} className={`w-14 h-14 rounded-xl bg-gradient-to-br ${colors.gradient} flex items-center justify-center text-3xl shadow-2xl ${colors.glow} border border-white/10`}>
            {guide.icon}
          </div>
          <span className="text-[10px] text-slate-500">{guide.readTime}</span>
        </div>
        <h3 className="text-lg font-bold text-white mb-2">{guide.title}</h3>
        <p className="text-xs text-slate-400 mb-4 line-clamp-2">{guide.description}</p>
        <div className={`flex items-center gap-2 text-xs font-semibold ${colors.text}`}>
          <span>Read Guide</span>
          <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </button>
    </div>
  );
}

// Main Page Component
export default function ModernGuidesPage() {
  const { isAuthenticated, getAuthHeader } = useAuth();
  const [selectedGuide, setSelectedGuide] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [creators, setCreators] = useState(() => guidesData.creators || []);
  const [guidesSource, setGuidesSource] = useState('static');
  const [adminEligible, setAdminEligible] = useState(false);

  // Admin & Notification State
  const [notifications, setNotifications] = useState([]);

  // Management Modal State
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [editingVideo, setEditingVideo] = useState(null);
  const [targetCreatorId, setTargetCreatorId] = useState(null);

  const headerRef = useRef(null);
  const badgeRef = useRef(null);
  const titleRef = useRef(null);

  const notify = (message, type = 'info') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 4000);
  };

  // Video Management Handlers
  const handleAddVideo = (creatorId) => {
    setTargetCreatorId(creatorId);
    setModalMode('add');
    setEditingVideo(null);
    setIsManageModalOpen(true);
  };

  const handleEditVideo = (creatorId, video) => {
    setTargetCreatorId(creatorId);
    setModalMode('edit');
    setEditingVideo(video);
    setIsManageModalOpen(true);
  };

  const handleSaveVideo = async (formData) => {
    try {
      const isEdit = modalMode === 'edit';
      const method = isEdit ? 'PATCH' : 'POST';
      const body = isEdit
        ? { creatorId: targetCreatorId, videoId: editingVideo.id, updates: formData }
        : { creatorId: targetCreatorId, video: formData };

      console.log(`[Guides Admin] ${method} ${API_URL}`, body);
      const res = await fetch(API_URL, {
        method,
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error('[Guides Admin] API Error:', res.status, errorData);
        throw new Error('API Error');
      }

      notify(isEdit ? 'Guide updated' : 'Guide added', 'success');
      setIsManageModalOpen(false);
      fetchGuides();
    } catch (err) {
      notify('Operation failed', 'error');
    }
  };

  const handleDeleteVideo = async (creatorId, videoId) => {
    if (!window.confirm('Erase this guide from history?')) return;
    try {
      console.log(`[Guides Admin] DELETE ${API_URL}`, { creatorId, videoId });
      const res = await fetch(API_URL, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ creatorId, videoId })
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error('[Guides Admin] DELETE Error:', res.status, errorData);
        throw new Error('API Error');
      }
      notify('Video expunged', 'success');
      // Optimistic delete
      setCreators(prev => prev.map(c => c.id === creatorId ? { ...c, videos: c.videos.filter(v => v.id !== videoId) } : c));
    } catch (err) {
      notify('Failed to delete', 'error');
    }
  };

  const handleMoveVideo = async (creatorId, video, direction) => {
    const creator = creators.find(c => c.id === creatorId);
    if (!creator) return;

    const idx = creator.videos.findIndex(v => v.id === video.id);
    if (idx === -1) return;

    const newVideos = [...creator.videos];
    if (direction === 'up' && idx > 0) {
      [newVideos[idx], newVideos[idx - 1]] = [newVideos[idx - 1], newVideos[idx]];
    } else if (direction === 'down' && idx < newVideos.length - 1) {
      [newVideos[idx], newVideos[idx + 1]] = [newVideos[idx + 1], newVideos[idx]];
    } else {
      return; // Already at boundary
    }

    try {
      console.log(`[Guides Admin] PUT ${API_URL} (Reorder)`, { creatorId, videos: newVideos });
      const res = await fetch(API_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ creatorId, videos: newVideos })
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error('[Guides Admin] PUT Error:', res.status, errorData);
        throw new Error('API Error');
      }
      notify('Order updated', 'success');
      // Optimistic update
      setCreators(prev => prev.map(c => c.id === creatorId ? { ...c, videos: newVideos } : c));
    } catch (err) {
      notify('Failed to reorder', 'error');
    }
  };

  // Fetch guides from API
  async function fetchGuides() {
    try {
      const response = await fetch(API_URL, { method: 'GET' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || `HTTP ${response.status}`);
      }
      setCreators(Array.isArray(payload?.creators) ? payload.creators : (guidesData.creators || []));
      setGuidesSource(payload?.source === 'supabase' ? 'supabase' : 'static');
    } catch (error) {
      console.error('[Guides Admin] Failed to fetch guides:', error);
      setCreators(guidesData.creators || []);
      setGuidesSource('static');
    }
  }

  useEffect(() => {
    fetchGuides();
  }, []);

  useEffect(() => {
    let mounted = true;

    async function fetchAdminStatus() {
      if (!isAuthenticated) {
        if (mounted) setAdminEligible(false);
        return;
      }

      try {
        const response = await fetch(buildApiUrl('/api/zone/export?status=true'), {
          method: 'GET',
          headers: { ...getAuthHeader() },
        });
        const payload = await response.json().catch(() => ({}));
        if (!mounted) return;
        setAdminEligible(Boolean(payload?.is_admin));
      } catch {
        if (mounted) setAdminEligible(false);
      }
    }

    fetchAdminStatus();
    return () => {
      mounted = false;
    };
  }, [getAuthHeader, isAuthenticated]);

  const WRITTEN_GUIDES = [
    { id: 'live', title: 'Live Mode Guide', icon: '🔴', description: 'Real-time pattern detection, prediction strategies, and session management', component: LiveModeGuide, color: 'purple', tag: 'Core', readTime: '5 min' },
    { id: 'longstring', title: 'Long String Lab Guide', icon: '🧪', description: 'Offline analysis, backtesting strategies, and pattern validation', component: LongStringGuide, color: 'emerald', tag: 'Lab', readTime: '4 min' },
    { id: 'kiyo', title: 'Kiyo Mode Guide', icon: '🌊', description: 'Wave analysis, column-based prediction, and flip pattern detection', component: KiyoGuide, color: 'cyan', tag: 'Advanced', readTime: '4 min' },
    { id: 'warp', title: 'Warp Analyzer Guide', icon: '📊', description: 'Community pull data analysis, lucky peaks, and shortcut strings', component: WarpGuide, color: 'amber', tag: 'Gacha', readTime: '3 min' },
  ];

  useEffect(() => {
    const tl = gsap.timeline();
    tl.fromTo(badgeRef.current, { scale: 0, rotation: -360 }, { scale: 1, rotation: 0, duration: 1, ease: 'elastic.out(1, 0.5)' })
      .fromTo(titleRef.current, { y: -50, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out' }, '-=0.6')
      .from(titleRef.current.querySelectorAll('span'), { y: 30, opacity: 0, stagger: 0.03, duration: 0.5, ease: 'back.out(2)' }, '-=0.6');

    gsap.to(badgeRef.current, {
      boxShadow: '0 0 40px rgba(147, 51, 234, 0.8), 0 0 80px rgba(147, 51, 234, 0.4)',
      duration: 2,
      ease: 'power1.inOut',
      yoyo: true,
      repeat: -1
    });
  }, []);

  const openGuide = (guide) => {
    setSelectedGuide(guide);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setTimeout(() => setSelectedGuide(null), 300);
  };

  return (
    <div className="min-h-screen bg-transparent">
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div ref={headerRef} className="relative text-center mb-12">
          <div className="pointer-events-none absolute left-1/2 top-20 h-40 w-[min(92vw,760px)] -translate-x-1/2 rounded-[2rem] bg-slate-950/68 blur-3xl" />
          <div
            ref={badgeRef}
            className="relative z-10 inline-flex items-center gap-3 px-5 py-3 rounded-full bg-gradient-to-r from-purple-600/30 to-violet-600/30 border border-purple-500/40 mb-6 shadow-2xl backdrop-blur-sm select-none group"
          >
            <svg className="w-6 h-6 text-purple-300 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <span className="text-sm font-bold text-purple-300 uppercase tracking-wider">Guides</span>
          </div>

          <div ref={titleRef} className="relative z-10 inline-block rounded-[2rem] bg-black/25 px-8 py-4 mb-6 backdrop-blur-sm border border-white/5 shadow-2xl">
            <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-fuchsia-100 to-amber-200 drop-shadow-[0_10px_24px_rgba(0,0,0,0.8)] [filter:drop-shadow(0_0_18px_rgba(255,255,255,0.14))]">
              <span>L</span><span>e</span><span>a</span><span>r</span><span>n</span><span> </span>
              <span>S</span><span>v</span><span>a</span><span>r</span><span>o</span><span>g</span><span> </span>
              <span>T</span><span>r</span><span>a</span><span>c</span><span>e</span><span>r</span>
            </h1>
          </div>
          <p className="relative z-10 text-slate-300 max-w-2xl mx-auto">
            Master relic manipulation with video tutorials and comprehensive written guides
          </p>
          <p className="relative z-10 text-slate-400 text-xs max-w-2xl mx-auto mt-3">
            {guidesSource === 'supabase'
              ? 'Video guides are live from Supabase, so admin edits update without a redeploy.'
              : 'Video guides are currently using the bundled fallback data until the Supabase guides table is ready.'}
          </p>
          {adminEligible ? (
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-emerald-200">
              Admin Guide Controls Enabled
            </div>
          ) : null}
        </div>

        {/* Written Guides Section - NOW FIRST */}
        <div className="mb-12">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-slate-200 to-slate-400 mb-2">
              Written Guides
            </h2>
            <p className="text-slate-500 text-xs">
              In-depth documentation for each mode with advanced strategies and tips
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {WRITTEN_GUIDES.map((guide, i) => (
              <GuideCard key={guide.id} guide={guide} onClick={() => openGuide(guide)} index={i} />
            ))}
          </div>
        </div>

        {/* Video Tutorials Section - NOW SECOND */}
        <div className="mb-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-slate-200 to-slate-400 mb-2">
              Video Tutorials
            </h2>
            <p className="text-slate-500 text-xs">
              Learn from the community's best relic manipulation content creators
            </p>
          </div>
          {creators.map((creator, i) => (
            <CreatorSection
              key={creator.id}
              creator={creator}
              index={i}
              isAdmin={adminEligible}
              onAdd={handleAddVideo}
              onEdit={handleEditVideo}
              onDelete={handleDeleteVideo}
              onMove={handleMoveVideo}
            />
          ))}
        </div>
      </div>

      {/* Notifications */}
      <div className="fixed bottom-8 right-8 z-[200] flex flex-col gap-3">
        {notifications.map(n => (
          <div key={n.id} className={`px-6 py-4 rounded-2xl border backdrop-blur-xl shadow-2xl flex items-center gap-4 animate-in slide-in-from-right duration-500 ${n.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
            n.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
              'bg-slate-800/80 border-slate-700 text-slate-200'
            }`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${n.type === 'success' ? 'bg-emerald-500/20' : n.type === 'error' ? 'bg-red-500/20' : 'bg-slate-700'
              }`}>
              {n.type === 'success' ? '✓' : n.type === 'error' ? '!' : 'i'}
            </div>
            <p className="text-xs font-bold uppercase tracking-widest">{n.message}</p>
          </div>
        ))}
      </div>

      {/* Guide Modal */}
      {selectedGuide && (
        <GuideModal isOpen={isModalOpen} onClose={closeModal} guideComponent={selectedGuide.component} guideTitle={selectedGuide.title} guideIcon={selectedGuide.icon} />
      )}

      {/* Admin Management Modal */}
      <VideoManagementModal
        isOpen={isManageModalOpen}
        mode={modalMode}
        video={editingVideo}
        onSave={handleSaveVideo}
        onClose={() => setIsManageModalOpen(false)}
      />
    </div>
  );
}
