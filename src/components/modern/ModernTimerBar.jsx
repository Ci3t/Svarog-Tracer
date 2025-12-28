// Compact Horizontal Timer Bar Component
import React, { useState, useEffect } from 'react';

export default function ModernTimerBar({ secondsLeft, onStart, timerRunning }) {
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update clock every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
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

  return (
    <div className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-sm rounded-2xl p-4 border border-slate-700/50 shadow-xl">
      <div className="flex items-center justify-between gap-4">
        {/* Session Timer */}
        <div>
          <h2 className="text-sm font-semibold text-slate-300 mb-1">Session Timer</h2>
          <div className="text-sm font-medium text-purple-300">
            🕐 {clockStr}
          </div>
        </div>

        {/* Timer Display */}
        <div className="flex items-center gap-4">
          <div className="text-4xl font-bold font-mono bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
            {timeStr}
          </div>
          
          {!timerRunning && (
            <button
              onClick={onStart}
              className="px-6 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-medium text-sm shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
            >
              Start Session
            </button>
          )}
        </div>

        {/* Progress Indicator */}
        <div className="flex-1 max-w-xs">
          <div className="text-xs text-slate-500 mb-1 text-right">
            {Math.round(progressPercent)}% Complete
          </div>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full bg-gradient-to-r ${getColor()} transition-all duration-1000 ease-linear`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
