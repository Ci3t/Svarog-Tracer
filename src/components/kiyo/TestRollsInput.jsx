import React, { useState, useRef } from "react";
import { translateTo4 } from "../../utils/stringHelpers";

// Auto-test controls component (debug mode only)
function AutoTestControls({ onRollsLoaded }) {
  const fileInputRef = useRef(null);
  const [fileName, setFileName] = useState("");

  const handleFileLoad = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const rolls = text
        .split(/[\n,\s]+/)
        .map(r => r.trim())
        .filter(r => /^[1-4]{3}$/.test(r));
      
      if (rolls.length === 0) {
        alert('❌ No valid 3-digit rolls found in file!');
        return;
      }

      setFileName(file.name);
      alert(`✅ Loaded ${rolls.length} rolls from ${file.name}. Auto-playing now...`);
      onRollsLoaded(rolls);
    };

    reader.readAsText(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="mt-2 flex gap-2 items-center">
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt"
        onChange={handleFileLoad}
        className="hidden"
      />
      
      <button
        onClick={() => fileInputRef.current?.click()}
        className="px-3 py-1.5 text-xs bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 rounded border border-blue-500/30 transition"
      >
        📁 Load Test File
      </button>
      
      {fileName && (
        <span className="text-xs text-slate-400">
          Last: {fileName}
        </span>
      )}
    </div>
  );
}


export default function TestRollsInput({
  testInput,
  setTestInput,
  handleTestRollSubmit,
  testRolls,
  setTestRolls,
  translatedTestRolls,
  handleDeleteTestRoll,
  setActivePrefix,
}) {
  const [isCollapsed, setIsCollapsed] = useState(true);

  // Function to download rolls starting with "4xx"
  const handleDownloadRolls = () => {
    if (!translatedTestRolls || translatedTestRolls.length === 0) return;

    const rollsStartingWith4 = translatedTestRolls.filter((roll) =>
      roll.startsWith("4")
    );

    if (rollsStartingWith4.length === 0) return;

    const now = new Date();

    const pad = (n) => String(n).padStart(2, "0");

    const normalizedTimestamp = `${now.getFullYear()}-${pad(
      now.getMonth() + 1
    )}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(
      now.getMinutes()
    )}:${pad(now.getSeconds())}`;

    const fileContent = rollsStartingWith4.join("\n");
    const blob = new Blob([fileContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `Kiyo 3str data [${normalizedTimestamp}].txt`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 p-3">
      {/* Input Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">⚗️</span>
          <div className="text-left">
            <div className="text-sm font-bold text-purple-300">Rolls Input</div>
          </div>
        </div>
        <input
          type="text"
          value={testInput}
          onChange={(e) => {
            const value = e.target.value.replace(/[^1-4]/g, "");
            setTestInput(value);
            
            // 🔥 Real-time prefix tracking for predictions
            // IMPORTANT: Translate to 4-space before setting prefix
            if (value.length >= 2) {
              const translated = translateTo4(value);
              setActivePrefix(translated.slice(0, 2)); // 2-digit prefix for 3-str
            } else if (value.length === 1) {
              const translated = translateTo4(value);
              setActivePrefix(translated[0]); // 1-digit prefix for 2-str
            } else {
              setActivePrefix(null); // Clear if empty
            }
          }}
          onKeyDown={handleTestRollSubmit}
          placeholder="Type 3-digit roll (e.g. 234)"
          maxLength={3}
          className="w-full bg-slate-900/50 border border-purple-500/40 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/40"
        />
        
        {/* 🔥 AUTO-TEST FEATURE (Debug mode only) */}
        {typeof window !== 'undefined' && window.location.search.includes('debug=true') && (
          <AutoTestControls onRollsLoaded={(rolls) => {
            // Auto-play rolls by directly adding them to testRolls
            console.log(`[Auto-Test] Starting auto-play with ${rolls.length} rolls`);
            
            let index = 0;
            const playNext = () => {
              if (index >= rolls.length) {
                setTimeout(() => {
                  alert(`🎉 Auto-play complete! Added ${rolls.length} rolls. Check the debug panel for results.`);
                }, 500);
                return;
              }
              
              const roll = rolls[index];
              console.log(`[Auto-Test] Adding roll ${index + 1}/${rolls.length}: ${roll}`);
              
              // Validate roll
              if (roll.length === 3 && /^[1-4]{3}$/.test(roll)) {
                // Directly add to testRolls array (bypass input field)
                setTestRolls((prev) => [...prev, roll]);
                console.log(`[Auto-Test] ✓ Roll ${index + 1} added successfully`);
              } else {
                console.log(`[Auto-Test] ✗ Invalid roll: ${roll}`);
              }
              
              // Move to next roll
              index++;
              setTimeout(playNext, 800); // 800ms between rolls
            };
            
            // Start playing after a short delay
            setTimeout(playNext, 500);
          }} />
        )}
      </div>

      {/* Added Test Rolls Section */}
      <div className="mt-3">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full flex items-center justify-between p-3 hover:bg-slate-700/50 transition cursor-pointer rounded-lg bg-slate-700"
        >
          <div className="flex items-center gap-2 ">
            <span className="text-lg">📋</span>
            <div className="text-left">
              <div className="text-sm font-bold text-purple-300">
                Added Test Rolls
              </div>
              <div className="text-xs text-slate-400 ">
                {testRolls.length} rolls • Click to{" "}
                {isCollapsed ? "expand" : "collapse"}
              </div>
            </div>
          </div>
          <span className="text-slate-400 cursor-pointer">
            {isCollapsed ? "▼" : "▲"}
          </span>
        </button>

        {/* Collapsible Content */}
        {!isCollapsed && (
          <div className="p-3 pt-0 border-t border-slate-700">
            <div className="space-y-3">
              {testRolls.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs text-slate-400">
                    Added test rolls:
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {testRolls.map((item, idx) => {
                      const roll = typeof item === 'string' ? item : item.roll;
                      return (
                      <div
                        key={idx}
                        className="flex items-center gap-2 bg-purple-900/30 border border-purple-500/40 rounded-lg px-3 py-1.5 relative"
                      >
                        {/* Order Number */}
                        <div className="absolute top-0 left-0 text-[10px] text-slate-400 bg-slate-700/80 rounded-full px-2 py-1 transform -translate-x-1/2 -translate-y-1/2">
                          #{idx + 1}
                        </div>
                        <div>
                          <div className="text-sm font-mono text-purple-200">
                            {roll}
                          </div>
                          <div className="text-xs text-purple-400">
                            → {translatedTestRolls[idx]}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteTestRoll(idx)}
                          className="text-purple-400 hover:text-red-400 text-xs cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    )})}
                  </div>

                  {/* Prefix Buttons */}
                  <div className="pt-2 border-t border-slate-700">
                    <div className="text-xs text-slate-400 mb-2">
                      Quick prefix selection:
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {Array.from(
                        new Set(translatedTestRolls.map((r) => r.slice(0, 2)))
                      ).map((prefix) => (
                        <button
                          key={prefix}
                          onClick={() => setActivePrefix(prefix)}
                          className="px-2 py-1 bg-cyan-900/30 border border-cyan-500/40 rounded text-xs text-cyan-300 hover:bg-cyan-900/50 cursor-pointer"
                        >
                          {prefix}x
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Download Button */}
              <div className="pt-3">
                <button
                  onClick={handleDownloadRolls}
                  className="px-3 py-1.5 bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 border border-blue-500/40 rounded-lg text-xs font-semibold transition cursor-pointer"
                >
                  📥 Download Rolls (4xx)
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
