import React from "react";

export default function RawInputHelper({ analyzeWavePatterns, testRolls }) {
  if (!analyzeWavePatterns?.focusColumn || testRolls.length === 0) return null;

  const lastRaw = testRolls[testRolls.length - 1];
  const currentLine = parseInt(lastRaw[lastRaw.length - 1]);
  const [_, focusCol] = analyzeWavePatterns.focusColumn;

  return (
    <div className="bg-violet-900/30 rounded-lg p-3 border border-violet-500/50">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">📍</span>
        <div>
          <div className="text-sm font-bold text-violet-300">
            Raw Input Helper
          </div>
          <div className="text-[10px] text-violet-400">
            What to type based on your last string
          </div>
        </div>
      </div>

      <div className="text-[13px] text-violet-200 bg-violet-950/40 rounded px-2 py-1 mb-2">
        Your last string: <span className="font-mono font-bold">{lastRaw}</span>{" "}
        (ends at Line {currentLine})
      </div>

      <div className="grid grid-cols-2 gap-2">
        {focusCol.flipTarget.map((digit) => {
          const targetDigit = parseInt(digit);
          let rawInput = (targetDigit - currentLine + 4) % 4;
          if (rawInput === 0) rawInput = 4;

          return (
            <div
              key={digit}
              className="bg-violet-950/60 rounded p-2 border border-violet-500/30"
            >
              <div className="flex items-center justify-between text-[12px] mb-1">
                <span className="text-violet-200">
                  Target{" "}
                  <span className="font-mono font-bold text-yellow-300 text-[14px]">
                    4{digit}
                  </span>
                </span>
                <span className="text-violet-300 font-bold">
                  → Line {targetDigit}
                </span>
              </div>
              <div className="bg-violet-500/20 rounded px-2 py-1.5 text-center">
                <div className="text-[9px] text-violet-400 mb-0.5">Type:</div>
                <div className="text-2xl font-mono font-black text-yellow-300">
                  {rawInput}
                </div>
              </div>
              <div className="mt-1 pt-1 border-t border-violet-500/20 text-[12px] text-orange-300">
                <div className="font-mono">
                  {currentLine}
                  {rawInput} = 4{targetDigit}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
