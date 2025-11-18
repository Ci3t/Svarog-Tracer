// src/components/TopBar.jsx - REPLACE YOUR EXISTING FILE
import svarog from "/svarog.png";

const PATCH_PRESETS = ["3.6", "3.7", "3.8", "3.9", "4.0", "custom"];

export default function TopBar({
  region,
  setRegion,
  patch,
  setPatch,
  isCustomPatch,
  setIsCustomPatch,
  entries = [],
  prevSessions = [],
}) {
  // --- helpers for export ---

  function translateTo4(str = "") {
    if (!str) return "";
    const digits = str.split("").map((d) => Number(d));
    if (digits.some((d) => isNaN(d) || d < 1 || d > 4)) return "";
    const shift = (4 - digits[0] + 4) % 4;
    return digits
      .map((d) => {
        const z = d - 1;
        const s = (z + shift) % 4;
        return (s + 1).toString();
      })
      .join("");
  }

  function pad5(s = "") {
    return s.padEnd(5, "0").slice(0, 5);
  }

  function toWeekday(dateStr) {
    const d = dateStr ? new Date(dateStr) : new Date();
    return d.toLocaleDateString(undefined, { weekday: "long" });
  }

  // 🔥 UPDATED: Build rows from ALL tab (current + history)
  function buildRows() {
    const allEntries = [];

    // Add current session entries
    entries.forEach((e) => {
      const base = (e.s2 || e.translated || e.raw || "").toString();
      const translated = translateTo4(base.replace(/0+$/, "")) || base;
      allEntries.push({
        day: toWeekday(e.time),
        string: pad5(translated),
        region: e.region || region,
        patch: e.patch || patch,
        time: e.time,
      });
    });

    // Add all previous sessions entries
    prevSessions.forEach((sess) => {
      (sess.entries || []).forEach((e) => {
        const base = (e.s2 || e.translated || e.raw || "").toString();
        const translated = translateTo4(base.replace(/0+$/, "")) || base;
        allEntries.push({
          day: toWeekday(e.time),
          string: pad5(translated),
          region: sess.region || region,
          patch: sess.patch || patch,
          time: e.time,
        });
      });
    });

    // Sort by time (newest first)
    allEntries.sort((a, b) => new Date(b.time) - new Date(a.time));

    return allEntries;
  }

  function handleExportCSV() {
    const rows = buildRows();

    const headers = ["Day", "String", "Region", "Patch"];

    const csv = [
      headers.join(","),
      ...rows.map((r) =>
        [r.day, r.string, r.region, r.patch]
          .map((v) => `"${v ?? ""}"`)
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `HSR_RNG_All_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <header className="w-full flex flex-col md:flex-row md:items-center md:justify-between gap-4 py-3 sm:py-4 px-4 sm:px-6 bg-slate-900/30 border-b border-slate-800/40 backdrop-blur">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center overflow-hidden">
          <img
            src={svarog}
            alt="svarog"
            className="w-full h-full object-contain"
          />
        </div>
        <div>
          <h1 className="text-sm sm:text-base font-semibold text-slate-100">
            Svarog Tracer
          </h1>
          <p className="text-[12px] text-slate-500">
            Relic RNG Observation Engine
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 md:justify-end">
        {/* region */}
        <div className="flex items-center gap-2 bg-slate-900/50 border border-slate-700/40 rounded-lg px-3 py-2">
          <span className="text-[11px] text-slate-400">Region</span>
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="bg-transparent text-sm text-slate-100 outline-none border-none cursor-pointer"
          >
            <option className="bg-slate-900">America</option>
            <option className="bg-slate-900">EU</option>
            <option className="bg-slate-900">ASIA</option>
          </select>
        </div>

        {/* patch */}
        <div className="flex items-center gap-2 bg-slate-900/50 border border-slate-700/40 rounded-lg px-3 py-2">
          <span className="text-[11px] text-slate-400">Patch</span>
          <select
            value={isCustomPatch ? "custom" : patch}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "custom") {
                setIsCustomPatch(true);
              } else {
                setIsCustomPatch(false);
                setPatch(v);
              }
            }}
            className="bg-transparent text-sm text-slate-100 outline-none border-none cursor-pointer"
          >
            {PATCH_PRESETS.map((p) => (
              <option key={p} className="bg-slate-900" value={p}>
                {p}
              </option>
            ))}
          </select>
          {isCustomPatch && (
            <input
              value={patch}
              onChange={(e) => setPatch(e.target.value)}
              className="w-16 bg-slate-950/40 border border-slate-700/50 rounded-md px-2 py-1 text-xs text-slate-100 focus:outline-none"
              placeholder="3.7"
            />
          )}
        </div>

        {/* export csv */}
        <button
          onClick={handleExportCSV}
          className="w-full xs:w-auto md:w-auto px-3 py-2 rounded-md bg-gradient-to-r from-violet-500 to-purple-500 text-xs text-white font-semibold hover:from-violet-400 hover:to-purple-400 shadow-md shadow-violet-500/30 transition-all cursor-pointer"
        >
          Export CSV
        </button>
      </div>
    </header>
  );
}
