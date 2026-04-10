// src/components/ClaraChat.jsx
// Floating Clara chat assistant widget.
// Props:
//   claraImageUrl  – optional URL for Clara's avatar (circle). Shows "C" fallback if absent.

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "../hooks/useAuth";
import { resolvePlaygroundClaraAsset } from "../utils/claraCosmetics";
import { buildApiUrl } from "../utils/apiBase";
import gsap from "gsap";

const API_URL = import.meta.env.VITE_CLARA_API_URL || buildApiUrl("/api/ai-analyze-warp");

const FAQ_CHIPS = [
  { id: "site_overview", label: "What does each page do?" },
  { id: "site_utilization", label: "How do I utilize the site?" },
  { id: "zones_page_usage", label: "What is Zone Tracker?" },
  { id: "zones_how_to_use", label: "How do I use Zones?" },
  { id: "getting_started", label: "How should a beginner start?" },
  { id: "live_mode", label: "What is live mode?" },
  { id: "playground_page_usage", label: "What is Playground?" },
  { id: "marketplace_page_usage", label: "What is Marketplace for?" },
  { id: "live_mode_how_to_use", label: "How do I use Live mode?" },
  { id: "lab_longstring_how_to_use", label: "How do I use Lab / Long String?" },
  { id: "kiyo_pairs_how_to_use", label: "How do I use Kiyo pairs?" },
  { id: "warp_analyzer_how_to_use", label: "How do I use Warp Analyzer?" },
  { id: "caverns_how_to_use", label: "How do I use Caverns?" },
  { id: "guides_how_to_use", label: "How do I use Guides?" },
  { id: "debug_panel_export_txt", label: "How do I export TXT logs?" },
  { id: "relic_manipulation", label: "What is relic manipulation?" },
  { id: "control_point", label: "What is the control point?" },
  { id: "caesar_shift", label: "What is Caesar shift?" },
  { id: "force_line", label: "What does force line do?" },
  { id: "commons_noise", label: "What are commons and noise?" },
  { id: "calm_board", label: "What is a calm board?" },
  { id: "pair_safety", label: "What is pair safety?" },
  { id: "trusted_pair", label: "What does trusted pair mean?" },
  { id: "pair_at_risk", label: "What does pair at risk mean?" },
  { id: "may_break", label: "What does may break mean?" },
  { id: "break_danger", label: "What does break danger mean?" },
  { id: "svarog_eye", label: "Svarog Eye vs main predictor" },
  { id: "trend_types", label: "What do trends mean?" },
  { id: "trend_share", label: "What does trend share mean?" },
  { id: "trend_trust", label: "What does trend trust mean?" },
  { id: "trend_freshness", label: "What does freshness mean?" },
  { id: "deciding_trends", label: "How do I decide which trend to trust?" },
  { id: "eye_override", label: "When should Svarog Eye override?" },
  { id: "noise_high_percent", label: "What does high noise percent mean?" },
  { id: "translate_lines", label: "How do raw and 4x reads connect?" },
  { id: "raw_pair", label: "What is a raw pair?" },
  { id: "four_x_control", label: "What is 4x control?" },
  { id: "why_miss", label: "Why did my relic miss even though the pair looked good?" },
  { id: "drills", label: "What do drills teach me?" },
  { id: "tutorial", label: "What does the tutorial teach?" },
  { id: "challenge_mode", label: "What is challenge mode?" },
];

function TypingIndicator() {
  return (
    <div className="flex gap-1.5 py-1">
      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 opacity-60 animate-bounce [animation-delay:-0.32s]" />
      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 opacity-60 animate-bounce [animation-delay:-0.16s]" />
      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 opacity-60 animate-bounce" />
    </div>
  );
}

function ClaraAvatar({ imageUrl, size = 54, withAura = false }) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="relative group" style={{ width: size, height: size }}>
      {withAura && (
        <div className="absolute -inset-0.5 bg-cyan-400/20 rounded-full blur-sm group-hover:bg-cyan-400/30 transition-colors" />
      )}
      <div className="relative w-full h-full rounded-full border border-cyan-400/40 bg-slate-950 overflow-hidden flex items-center justify-center">
        {imageUrl && !imgError ? (
          <img
            src={imageUrl}
            alt="Clara"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-cyan-400 font-black text-xl">C</span>
        )}
        {withAura && (
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-400/10 to-transparent h-1/5 animate-[scanline_3s_linear_infinite]" />
        )}
      </div>
      {!imgError && withAura && (
        <div className="absolute -inset-1 border-2 border-dashed border-cyan-400/30 rounded-full animate-[spin_8s_linear_infinite] pointer-events-none" />
      )}
    </div>
  );
}

function ClaraTacticalAvatar({ imageUrl, size = 48, active = false }) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="relative flex-shrink-0 flex items-center justify-center" style={{ width: size, height: size }}>
      <div className={`absolute -inset-1.5 border border-dashed border-cyan-400/60 rounded-full ${active ? 'animate-[spin_2s_linear_infinite]' : ''}`} />
      <div className="relative w-full h-full rounded-full border-2 border-white/10 overflow-hidden bg-black/80">
        {imageUrl && !imgError ? (
          <img
            src={imageUrl}
            alt="Clara Focus"
            onError={() => setImgError(true)}
            className="absolute top-0 left-0 w-full h-full object-cover pointer-events-none"
            style={{ transform: "scale(3.2) translateY(30%) translateX(0%)" }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-cyan-400 font-black text-lg">C</div>
        )}
        <div className="absolute inset-x-0 h-[30%] bg-gradient-to-b from-transparent via-cyan-400/10 to-transparent animate-[scanline_3s_linear_infinite] pointer-events-none" />
      </div>
    </div>
  );
}

export default function ClaraChat({ claraImageUrl }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [showFaq, setShowFaq] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "clara",
      text: "I can help with the tutorial, drills, predictor basics, trends, and route control. Ask me something simple and I’ll explain it clearly.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const windowRef = useRef(null);
  const messagesWrapRef = useRef(null);
  const inputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const faqOverlayRef = useRef(null);

  // Assets
  const avatarImageUrl = claraImageUrl || resolvePlaygroundClaraAsset(user?.user_metadata || {}, { speaking: false });
  const activeAvatarUrl = claraImageUrl || resolvePlaygroundClaraAsset(user?.user_metadata || {}, { speaking: loading });

  const geminiHistoryRef = useRef([]);

  // GSAP: Window Animations
  useEffect(() => {
    if (open) {
      gsap.fromTo(windowRef.current,
        { scale: 0.8, opacity: 0, y: 20 },
        { scale: 1, opacity: 1, y: 0, duration: 0.4, ease: "power3.out" }
      );
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [open]);

  // GSAP: FAQ Panel Animation
  useEffect(() => {
    if (showFaq) {
      gsap.fromTo(faqOverlayRef.current,
        { y: 50, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.4, ease: "back.out(1.7)" }
      );
    }
  }, [showFaq]);

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading, scrollToBottom]);

  const sendMessage = useCallback(
    async (text, faqId = null) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      setMessages((prev) => [...prev, { role: "user", text: trimmed }]);
      setInput("");
      setLoading(true);
      setShowFaq(false);

      try {
        const res = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "clara",
            message: trimmed,
            history: geminiHistoryRef.current.slice(-6),
            ...(faqId ? { faqId } : {}),
          }),
        });

        if (!res.ok) throw new Error("Request failed");
        const data = await res.json();
        if (!data.success) throw new Error(data.error?.message || "Request failed");
        const answer = data.answer || "I couldn't answer that cleanly. Try asking it in a simpler way.";

        if (data.source === "gemini") {
          geminiHistoryRef.current = [
            ...geminiHistoryRef.current.slice(-5),
            { role: "user", parts: [{ text: trimmed }] },
            { role: "model", parts: [{ text: answer }] },
          ];
        }

        setMessages((prev) => [...prev, { role: "clara", text: answer }]);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            role: "clara",
            text: "I couldn't answer that right now. Try asking it in a simpler way, or check the tutorial and drills.",
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [loading]
  );

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const showInitialChips = messages.filter(m => m.role === "user").length === 0;

  return (
    <>
      {/* Floating Tactical Hub (FAB) */}
      <div className={`fixed bottom-6 right-6 z-[9999] transition-transform duration-300 ${open ? 'scale-110' : 'scale-100 hover:scale-105'}`}>
        <button
          onClick={() => setOpen(!open)}
          className="relative w-16 h-16 flex items-center justify-center focus:outline-none"
        >
          {open ? (
            <div className="w-14 h-14 rounded-full bg-slate-950/90 border border-cyan-400/50 backdrop-blur-xl flex items-center justify-center text-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.3)]">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </div>
          ) : (
            <ClaraAvatar imageUrl={avatarImageUrl} size={64} withAura={true} />
          )}
        </button>
      </div>

      {/* Neural-Link HUD Window */}
      {open && (
        <div
          ref={windowRef}
          className="fixed bottom-24 right-6 z-[9998] w-[380px] max-w-[calc(100vw-48px)] h-[560px] max-h-[calc(100dvh-140px)] flex flex-col bg-slate-950/85 backdrop-blur-[32px] saturate-[180%] border border-white/10 rounded-3xl shadow-[0_25px_80px_-15px_rgba(0,0,0,0.8),0_0_40px_rgba(34,211,238,0.05)] overflow-hidden font-sans"
        >
          {/* Header */}
          <div className="relative flex items-center gap-4 px-6 py-5 bg-white/5 border-b border-white/5 flex-shrink-0 z-10">
            <ClaraTacticalAvatar imageUrl={activeAvatarUrl} size={48} active={loading} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-sm font-black tracking-widest text-white uppercase">Clara</span>
                <span className="text-[9px] font-black bg-cyan-400/15 text-cyan-400 px-1.5 py-0.5 rounded border border-cyan-400/30">FAQ GUIDE</span>
              </div>
              <span className="text-[11px] text-slate-500 font-semibold truncate block">
                {loading ? 'Thinking through it...' : 'Svarog guide'}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowFaq(!showFaq)}
                className={`p-2 rounded-xl transition-all duration-200 bg-white/5 hover:bg-white/10 ${showFaq ? 'text-cyan-400' : 'text-slate-500'}`}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </button>
              <button
                onClick={() => setOpen(false)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-500 hover:text-white transition-all"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Messages Flow */}
          <div className="flex-1 overflow-y-auto px-6 py-8 flex flex-col gap-6 tactical-scrollbar">
            <div className="flex flex-col gap-6">
              {messages.map((msg, i) => (
                <div key={i} className={`flex max-w-[90%] ${msg.role === 'user' ? 'self-end justify-end' : 'self-start items-start'}`}>
                  {msg.role === 'clara' ? (
                    <div className="relative bg-white/[0.03] border border-white/[0.05] p-4 pr-5 rounded-tr-2xl rounded-br-2xl rounded-bl-2xl shadow-inner animate-[bubbleIn_0.3s_ease-out]">
                      <div className="absolute -top-px -left-px w-2 h-2 border-t-2 border-l-2 border-cyan-400" />
                      <div className="absolute -bottom-px -right-px w-2 h-2 border-b-2 border-r-2 border-cyan-400" />
                      <p className="text-sm leading-relaxed font-medium text-slate-100">{msg.text}</p>
                    </div>
                  ) : (
                    <div className="relative bg-gradient-to-br from-cyan-400 to-cyan-600 p-4 pl-5 rounded-tl-2xl rounded-bl-2xl rounded-tr-2xl text-slate-950 shadow-[0_10px_25px_-5px_rgba(34,211,238,0.3)] overflow-hidden animate-[bubbleIn_0.3s_ease-out]">
                      <div className="absolute inset-0 bg-radial-at-tr from-white/30 to-transparent pointer-events-none" />
                      <p className="text-sm font-bold leading-relaxed">{msg.text}</p>
                    </div>
                  )}
                </div>
              ))}
              {loading && (
                <div className="self-start max-w-[90%] flex items-start">
                  <div className="relative bg-white/[0.03] border border-white/[0.05] p-3 px-5 rounded-tr-2xl rounded-br-2xl rounded-bl-2xl">
                    <div className="absolute -top-px -left-px w-2 h-2 border-t-2 border-l-2 border-cyan-400" />
                    <div className="absolute -bottom-px -right-px w-2 h-2 border-b-2 border-r-2 border-cyan-400" />
                    <TypingIndicator />
                  </div>
                </div>
              )}

              {showInitialChips && !loading && (
                <div className="flex flex-col gap-3 mt-2 animate-[bubbleIn_0.4s_ease-out]">
                  <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest px-1">Suggested Intelligence</span>
                  <div className="flex flex-wrap gap-2">
                    {FAQ_CHIPS.slice(0, 10).map(chip => (
                      <button
                        key={chip.id}
                        onClick={() => sendMessage(chip.label, chip.id)}
                        className="text-[11px] font-bold text-slate-400 bg-white/5 border border-white/10 px-3.5 py-2 rounded-xl hover:bg-cyan-400/10 hover:border-cyan-400/30 hover:text-cyan-400 transition-all flex items-center gap-2 text-left"
                      >
                        <div className="w-1 h-1 rounded-full bg-cyan-400/50" />
                        {chip.label}
                      </button>
                    ))}
                    <button
                      onClick={() => setShowFaq(true)}
                      className="text-[11px] font-bold text-cyan-400 bg-cyan-400/5 border border-cyan-400/20 px-3.5 py-2 rounded-xl hover:bg-cyan-400/15 transition-all"
                    >
                      View Full Intel...
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div ref={messagesEndRef} className="h-4 flex-shrink-0" />
          </div>

          {/* Tactical Knowledge Base Reveal */}
          {showFaq && (
            <div
              ref={faqOverlayRef}
              className="absolute inset-x-6 bottom-28 z-[200] bg-slate-900/95 backdrop-blur-2xl border border-cyan-400/40 rounded-3xl p-5 shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden"
            >
              <div className="max-h-[300px] overflow-y-auto px-1 custom-scrollbar">
                <div className="text-[10px] font-black text-cyan-400 uppercase tracking-widest mb-4 sticky top-0 bg-slate-900/95 py-1">Tactical Knowledge Database</div>
                <div className="flex flex-wrap gap-2">
                  {FAQ_CHIPS.map(chip => (
                    <button
                      key={chip.id}
                      onClick={() => sendMessage(chip.label, chip.id)}
                      className="text-[11px] font-bold text-slate-300 bg-white/5 border border-white/10 px-3 py-2 rounded-xl hover:bg-cyan-400/10 hover:border-cyan-400/40 hover:text-cyan-400 transition-all text-left flex items-center gap-2"
                    >
                      <div className="w-1 h-1 rounded-full bg-cyan-400" />
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Operator Input */}
          <div className="p-6 pb-8 bg-black/30 flex items-center gap-3 relative z-10">
            <div className="relative flex-1">
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="INPUT OPERATOR COMMAND..."
                disabled={loading}
                className="w-full bg-white/5 border border-white/10 focus:border-cyan-400/40 focus:bg-white/10 rounded-2xl px-5 py-3.5 text-sm font-semibold text-white placeholder-slate-600 outline-none transition-all"
              />
              <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 bg-cyan-400 rounded-full transition-all duration-300 ${input.trim() ? 'w-[40%]' : 'w-0'}`} />
            </div>
            <button
              onClick={() => sendMessage(input)}
              disabled={loading || !input.trim()}
              className="w-12 h-12 flex items-center justify-center rounded-2xl bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 disabled:opacity-30 hover:bg-cyan-400/20 transition-all flex-shrink-0"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
              </svg>
            </button>
          </div>
        </div>
      )}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(34, 211, 238, 0.2); border-radius: 20px; }
        @keyframes scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(300%); }
        }
        @keyframes bubbleIn {
          from { opacity: 0; transform: translateY(10px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </>
  );
}
