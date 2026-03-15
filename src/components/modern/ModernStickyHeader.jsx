// Modern Sticky Header - Timer + Progress + Roll Input
import React, { useState, useEffect } from 'react';

export default function ModernStickyHeader({ 
  secondsLeft, 
  onStart,
  onStop,
  onRestart,
  timerRunning,
  rollInput,
  setRollInput,
  onAddRoll,
  entriesCount
}) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isScrolled, setIsScrolled] = useState(false);

  // Update clock every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Detect scroll position
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  
  // Format PC clock
  const clockStr = currentTime.toLocaleTimeString();
  
  // Calculate progress percentage
  const totalSeconds = 300; // 5 minutes
  const progressPercent = ((totalSeconds - secondsLeft) / totalSeconds) * 100;
  const progressStage = progressPercent >= 90 ? 'danger' : progressPercent >= 70 ? 'warning' : 'safe';
  const isCriticalTimer = secondsLeft <= 30;
  const progressColorClass =
    progressStage === 'danger'
      ? 'bg-gradient-to-r from-red-500 to-pink-500'
      : progressStage === 'warning'
        ? 'bg-gradient-to-r from-amber-500 to-yellow-500'
        : 'bg-gradient-to-r from-emerald-500 to-green-500';

  const handleSubmit = (e) => {
    e.preventDefault();
    onAddRoll();
  };

  return (
    <div 
      className="sticky top-[110px] sm:top-[120px] lg:top-[64px] z-40 transition-all duration-300 glacial-header-glass"
      style={{ opacity: isScrolled ? 0.95 : 1 }}
    >
      <div className="max-w-[1920px] mx-auto px-4 py-3">
        {/* Responsive Grid: Timer on top/left, Input in middle, Control on bottom/right */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Left: Session Timer + Clock */}
          <div className="flex items-center justify-between lg:justify-start gap-4 lg:min-w-[180px]">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none mb-1">Session Timer</h2>
                <div className="text-xs font-mono text-purple-300">
                  {clockStr}
                </div>
              </div>
            </div>
            {/* Counter Badge Mobile Only */}
            <div className="lg:hidden px-2 py-1 bg-slate-800 rounded text-[10px] text-slate-400 border border-slate-700">
              {entriesCount} rolls
            </div>
          </div>

          {/* Center: Roll Input + Add Button */}
          <form onSubmit={handleSubmit} className="flex items-center gap-2 flex-1 w-full lg:max-w-2xl">
            <div className="flex-1 relative">
              <input
                type="text"
                value={rollInput}
                onChange={(e) => {
                  const sanitized = e.target.value.replace(/[^1-4]/g, '').slice(0, 6);
                  setRollInput(sanitized);
                }}
                placeholder="Enter roll (e.g., 42, 43...)"
                className="w-full px-3 py-2.5 bg-slate-900/50 border border-slate-700/50 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/40 transition-all"
              />
              <div className="hidden sm:block absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 font-medium">
                {entriesCount} rolls
              </div>
            </div>
            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-purple-500/20 active:scale-95 transition-all"
            >
              ADD
            </button>
          </form>

          {/* Right: Countdown Timer + Start/Stop/Restart Buttons */}
          <div className="flex items-center justify-between lg:justify-end gap-3 lg:min-w-[220px]">
            <div className={`text-2xl sm:text-3xl font-black font-mono tracking-tighter ${
              isCriticalTimer
                ? 'text-red-400 animate-pulse drop-shadow-[0_0_8px_rgba(248,113,113,0.45)]'
                : 'bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent'
            }`}>
              {timeStr}
            </div>
            <div className="flex items-center gap-2">
              {!timerRunning ? (
                <button
                  onClick={onStart}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-purple-500/20 active:scale-95 transition-all whitespace-nowrap"
                >
                  START SESSION
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={onStop}
                    className="p-2 sm:px-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 hover:bg-red-500/20 active:scale-95 transition-all"
                    title="Stop"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
                    </svg>
                  </button>
                  <button
                    onClick={onRestart}
                    className="p-2 sm:px-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/20 active:scale-95 transition-all"
                    title="Restart"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom: Full-width Progress Bar */}
        <div className="mt-3 h-1.5 sm:h-2 glacial-progress-track rounded-full overflow-hidden relative border border-cyan-400/45 shadow-inner shadow-cyan-500/10">
          <div
            className={`h-full transition-all duration-1000 ease-linear relative window-progress-bar progress-${progressStage} ${progressColorClass}`}
            style={{ width: `${progressPercent}%` }}
          >
            {/* Ice Spark Head */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full blur-[2px] shadow-[0_0_15px_#fff,0_0_25px_#7dd3fc] animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
