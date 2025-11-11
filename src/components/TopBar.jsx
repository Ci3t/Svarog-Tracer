// src/components/TopBar.jsx
import svarog from "/svarog.png"; // from public

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
  // --- helpers just for export ---

  // 1..4 only -> translate so it starts with 4
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

  // pad to 5
  function pad5(s = "") {
    return s.padEnd(5, "0").slice(0, 5);
  }

  // weekday
  function toWeekday(dateStr) {
    const d = dateStr ? new Date(dateStr) : new Date();
    return d.toLocaleDateString(undefined, { weekday: "long" });
  }

  // build flat rows like your screenshot
  function buildRows() {
    // prefer current session
    if (entries.length > 0) {
      return entries.map((e) => {
        const base = (e.s2 || e.translated || e.raw || "").toString();
        const translated = translateTo4(base.replace(/0+$/, "")) || base;
        return {
          day: toWeekday(e.time),
          string: pad5(translated),
          region,
          patch,
        };
      });
    }

    // else flatten history
    const rows = [];
    prevSessions.forEach((sess) => {
      (sess.entries || []).forEach((e) => {
        const base = (e.s2 || e.translated || e.raw || "").toString();
        const translated = translateTo4(base.replace(/0+$/, "")) || base;
        rows.push({
          day: toWeekday(e.time),
          string: pad5(translated),
          region: sess.region || region,
          patch: sess.patch || patch,
        });
      });
    });
    return rows;
  }

  function handleExportCSV() {
    const rows = buildRows();

    // even if empty, export headers
    const headers = ["Day", "String", "Region", "Patch"];

    const csv = [
      headers.join(","), // header line
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
    a.download = `HSR_RNG_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <header className="w-full flex items-center justify-between gap-4 py-4 px-6 bg-slate-900/30 border-b border-slate-800/40 backdrop-blur">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl  flex items-center justify-center">
          {/* <span className="text-white text-sm font-bold tracking-tight">
            HSR
          </span> */}
          <img src={svarog} alt="svarog" />
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

      <div className="flex items-center gap-3">
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
          className="px-3 py-2 rounded-md bg-gradient-to-r from-violet-500 to-purple-500 text-xs text-white font-semibold hover:from-violet-400 hover:to-purple-400 shadow-md shadow-violet-500/30 transition-all cursor-pointer"
        >
          Export CSV
        </button>
      </div>
    </header>
  );
}
