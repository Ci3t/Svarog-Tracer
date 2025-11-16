// src/components/CaesarCard.jsx
import React from "react";
import { translateTo4 } from "../utils/stringHelpers";

export default function CaesarCard({ caesarInput, setCaesarInput }) {
  const clean = (caesarInput || "").replace(/[^1-4]/g, "");
  const shifted = clean ? translateTo4(clean) : "";

  return (
    <div className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 rounded-2xl p-6 border border-slate-700/50">
      <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">
        Caesar shift
      </h3>
      <p className="text-xs text-slate-400 mb-3">
        Paste a 1–4 string, we rotate it so it starts with 4.
      </p>
      <div className="flex gap-2">
        <input
          value={clean}
          onChange={(e) =>
            setCaesarInput(e.target.value.replace(/[^1-4]/g, ""))
          }
          placeholder="e.g. 234"
          className="flex-1 bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-400"
        />
      </div>
      <div className="mt-3 text-xs">
        <span className="text-slate-500 mr-2 text-lg">Translated:</span>
        <span className="font-mono text-violet-200 text-lg">
          {shifted || "—"}
        </span>
      </div>
    </div>
  );
}
