// Long String Lab Page - For analyzing long strings
import React from 'react';
import LongStringLabCard from '../components/LongStringLabCard';
import Footer from '../components/Footer';

export default function LongStringPage({
  // State
  region,
  setRegion,
  patch,
  setPatch,
  isCustomPatch,
  setIsCustomPatch,
  entries,
  prevSessions,
  
  // Handlers
  handleLongStringToDebug,
}) {
  return (
    <div className="min-h-screen text-slate-100">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
            🧪 Long String Lab
          </h1>
          <p className="text-slate-400">
            Analyze long strings of rolls to identify patterns and predictions
          </p>
        </div>

        <div className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 rounded-2xl p-6 border border-slate-700/50 shadow-2xl">
          <LongStringLabCard onSendToDebug={handleLongStringToDebug} />
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 pb-6">
        <Footer />
      </div>
    </div>
  );
}
