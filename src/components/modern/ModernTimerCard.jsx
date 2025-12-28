import React from 'react';

export default function ModernTimerCard({ secondsLeft, onStart, timerRunning }) {
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const totalSeconds = 5 * 60; // 5 minutes
  const progress = ((totalSeconds - secondsLeft) / totalSeconds) * 100;

  // Determine color based on time remaining
  const getTimerColor = () => {
    if (secondsLeft > 180) return 'from-emerald-500 to-teal-500'; // > 3 min
    if (secondsLeft > 60) return 'from-amber-500 to-orange-500'; // > 1 min
    return 'from-rose-500 to-red-500'; // < 1 min
  };

  const getGlowColor = () => {
    if (secondsLeft > 180) return 'rgba(16, 185, 129, 0.3)';
    if (secondsLeft > 60) return 'rgba(245, 158, 11, 0.3)';
    return 'rgba(244, 63, 94, 0.3)';
  };

  return (
    <div className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6 shadow-xl hover:shadow-2xl transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
          Session Timer
        </h3>
        {timerRunning && (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs text-emerald-400 font-medium">Active</span>
          </div>
        )}
      </div>

      {/* Circular Timer */}
      <div className="relative flex items-center justify-center mb-6">
        <svg className="w-48 h-48 transform -rotate-90">
          {/* Background circle */}
          <circle
            cx="96"
            cy="96"
            r="88"
            fill="none"
            stroke="rgba(148, 163, 184, 0.1)"
            strokeWidth="8"
          />
          {/* Progress circle */}
          <circle
            cx="96"
            cy="96"
            r="88"
            fill="none"
            stroke="url(#timerGradient)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 88}`}
            strokeDashoffset={`${2 * Math.PI * 88 * (1 - progress / 100)}`}
            className="transition-all duration-1000 ease-linear"
            style={{
              filter: `drop-shadow(0 0 8px ${getGlowColor()})`
            }}
          />
          <defs>
            <linearGradient id="timerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" className={`text-gradient-start`} stopColor="currentColor" />
              <stop offset="100%" className={`text-gradient-end`} stopColor="currentColor" />
            </linearGradient>
          </defs>
        </svg>

        {/* Time display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className={`text-6xl font-bold bg-gradient-to-r ${getTimerColor()} bg-clip-text text-transparent mb-2`}>
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </div>
          <div className="text-sm text-slate-400 font-medium">
            {timerRunning ? 'Remaining' : 'Ready'}
          </div>
        </div>
      </div>

      {/* Start Button */}
      {!timerRunning && (
        <button
          onClick={onStart}
          className="w-full py-3 px-4 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]"
        >
          <div className="flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
            </svg>
            <span>Start Session</span>
          </div>
        </button>
      )}

      {/* Progress indicator */}
      {timerRunning && (
        <div className="mt-4">
          <div className="flex justify-between text-xs text-slate-400 mb-2">
            <span>Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full bg-gradient-to-r ${getTimerColor()} transition-all duration-1000 ease-linear`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
