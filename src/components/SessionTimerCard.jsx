import { useEffect, useState } from "react";

export default function SessionTimerCard({ secondsLeft, onStart }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");
  const ending = secondsLeft <= 30;

  return (
    <div className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 rounded-2xl p-6 border border-slate-700/50 shadow-2xl">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Session Timer
        </span>
      </div>
      <div
        className={`text-6xl font-bold font-mono mb-4 ${
          ending ? "text-red-300" : "text-slate-100"
        }`}
      >
        {mm}
        <span className="text-slate-600">:</span>
        {ss}
      </div>
      <p className="text-sm text-slate-400 mb-4 leading-relaxed">
        Pattern changes every 5 minutes. Start a fresh session right before you
        roll.
      </p>
      {/* realtime clock */}
      <p className="text-lg text-slate-300 mb-3 ">
        Local time: {now.toLocaleTimeString()}
      </p>
      <button
        onClick={onStart}
        className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-400 hover:to-purple-400 text-white font-semibold transition-all duration-200 cursor-pointer"
      >
        Start New Session
      </button>
    </div>
  );
}
