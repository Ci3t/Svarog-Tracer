// Auto-test feature for TestRollsInput component
// Add this to TestRollsInput.jsx to enable loading rolls from file

import React, { useState, useRef } from 'react';

export default function TestRollsInput({ value, onChange, onSubmit }) {
  const fileInputRef = useRef(null);
  const [autoPlayRolls, setAutoPlayRolls] = useState([]);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Load rolls from file
  const handleFileLoad = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      // Parse rolls (one per line, or comma/space separated)
      const rolls = text
        .split(/[\n,\s]+/)
        .map(r => r.trim())
        .filter(r => /^[1-4]{3}$/.test(r));
      
      if (rolls.length === 0) {
        alert('No valid 3-digit rolls found in file!');
        return;
      }

      setAutoPlayRolls(rolls);
      setCurrentIndex(0);
      alert(`Loaded ${rolls.length} rolls. Click "Start Auto-Play" to begin.`);
    };

    reader.readAsText(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Auto-play rolls one by one
  const startAutoPlay = () => {
    if (autoPlayRolls.length === 0) {
      alert('Please load a file first!');
      return;
    }

    setIsAutoPlaying(true);
    setCurrentIndex(0);
    playNextRoll(0);
  };

  const playNextRoll = (index) => {
    if (index >= autoPlayRolls.length) {
      setIsAutoPlaying(false);
      alert('Auto-play complete!');
      return;
    }

    const roll = autoPlayRolls[index];
    onChange({ target: { value: roll } });
    
    // Auto-submit after 500ms
    setTimeout(() => {
      onSubmit?.();
      setCurrentIndex(index + 1);
      
      // Play next roll after 1 second
      setTimeout(() => {
        playNextRoll(index + 1);
      }, 1000);
    }, 500);
  };

  const stopAutoPlay = () => {
    setIsAutoPlaying(false);
  };

  return (
    <div className="space-y-2">
      {/* Existing input */}
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder="Enter 3-digit roll..."
        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200"
        disabled={isAutoPlaying}
      />

      {/* Auto-test controls */}
      <div className="flex gap-2 items-center">
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt"
          onChange={handleFileLoad}
          className="hidden"
        />
        
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isAutoPlaying}
          className="px-3 py-1 text-xs bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 rounded disabled:opacity-50"
        >
          📁 Load Test File
        </button>

        {autoPlayRolls.length > 0 && !isAutoPlaying && (
          <button
            onClick={startAutoPlay}
            className="px-3 py-1 text-xs bg-green-500/20 text-green-300 hover:bg-green-500/30 rounded"
          >
            ▶️ Start Auto-Play ({autoPlayRolls.length} rolls)
          </button>
        )}

        {isAutoPlaying && (
          <>
            <button
              onClick={stopAutoPlay}
              className="px-3 py-1 text-xs bg-red-500/20 text-red-300 hover:bg-red-500/30 rounded"
            >
              ⏸️ Stop
            </button>
            <span className="text-xs text-slate-400">
              {currentIndex + 1} / {autoPlayRolls.length}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
