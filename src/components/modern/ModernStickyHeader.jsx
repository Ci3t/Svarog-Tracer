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
  
  // Color based on time remaining
  const getColor = () => {
    if (secondsLeft > 180) return 'from-emerald-500 to-green-500'; // > 3 min
    if (secondsLeft > 60) return 'from-amber-500 to-yellow-500';   // > 1 min
    return 'from-red-500 to-pink-500';                              // < 1 min
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onAddRoll();
  };

  return (
    <div 
      className="sticky top-0 z-50 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border-b border-slate-700/50 shadow-2xl backdrop-blur-sm transition-opacity duration-300"
      style={{ opacity: isScrolled ? 0.9 : 1 }}
    >
      <div className="max-w-[1920px] mx-auto px-4 py-2">
        {/* Single Row: Session Timer | Roll Input | Countdown + Start */}
        <div className="flex items-center justify-between gap-6 mb-2">
          {/* Left: Session Timer + Clock */}
          <div className="flex items-center gap-3 min-w-[180px]">
            <div>
              <h2 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Session Timer</h2>
              <div className="text-xs font-medium text-purple-300">
                🕐 {clockStr}
              </div>
            </div>
          </div>

          {/* Center: Roll Input + Add Button */}
          <form onSubmit={handleSubmit} className="flex items-center gap-2 flex-1 max-w-xl">
            <div className="flex-1 relative">
              <input
                type="text"
                value={rollInput}
                onChange={(e) => {
                  // Only allow digits 1-4, max 6 characters
                  const sanitized = e.target.value.replace(/[^1-4]/g, '').slice(0, 6);
                  setRollInput(sanitized);
                }}
                placeholder="Enter roll (e.g., 42, 43, 4123...)"
                className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-500">
                {entriesCount} rolls
              </div>
            </div>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white text-sm font-medium shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
            >
              Add Roll
            </button>
          </form>

          {/* Right: Countdown Timer + Start/Stop/Restart Buttons */}
          <div className="flex items-center gap-3 min-w-[200px] justify-end">
            <div className="text-3xl font-bold font-mono bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
              {timeStr}
            </div>
            {!timerRunning ? (
              <button
                onClick={onStart}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-medium text-sm shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 whitespace-nowrap"
              >
                Start Session
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={onStop}
                  className="px-3 py-2 rounded-lg bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 text-white font-medium text-sm shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                >
                  Stop
                </button>
                <button
                  onClick={onRestart}
                  className="px-3 py-2 rounded-lg bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-medium text-sm shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                >
                  Restart
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Bottom: Full-width Progress Bar */}
        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full bg-gradient-to-r ${getColor()} transition-all duration-1000 ease-linear`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
}
