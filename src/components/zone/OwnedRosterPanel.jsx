import React, { useRef } from 'react';
import { Download, RefreshCw, Save, Search, Upload } from 'lucide-react';

function CharacterAvatar({ character, selected, onClick }) {
  const [imageFailed, setImageFailed] = React.useState(false);
  const name = String(character?.name || '?');
  const initial = name.slice(0, 1).toUpperCase();

  return (
    <button
      type="button"
      onClick={onClick}
      title={name}
      className={`group relative flex flex-col items-center gap-1 rounded-2xl border px-2 py-2 transition-all ${
        selected
          ? 'border-cyan-400/60 bg-cyan-500/10 shadow-[0_0_0_1px_rgba(34,211,238,0.18)]'
          : 'border-slate-800 bg-slate-900/50 hover:border-slate-600'
      }`}
    >
      <div className={`h-12 w-12 overflow-hidden rounded-full ring-1 ${selected ? 'ring-cyan-300/60' : 'ring-slate-700/70'}`}>
        {!character?.image || imageFailed ? (
          <div className="flex h-full w-full items-center justify-center bg-slate-800 text-sm font-black uppercase text-slate-200">
            {initial}
          </div>
        ) : (
          <img
            src={character.image}
            alt={name}
            className="h-full w-full object-cover"
            onError={() => setImageFailed(true)}
          />
        )}
      </div>
      <span className="max-w-[72px] truncate text-center text-[9px] font-bold text-slate-300">{name}</span>
      {selected ? <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.55)]" /> : null}
    </button>
  );
}

export default function OwnedRosterPanel({
  user,
  compact = false,
  ownedOptions,
  ownedSet,
  ownedSearchTerm,
  setOwnedSearchTerm,
  toggleOwnedCharacter,
  saveOwnedRoster,
  loadOwnedRoster,
  importOwnedRosterFile,
  ownedLoading,
  ownedSaving,
  ownedImporting,
}) {
  const fileInputRef = useRef(null);
  const ownedCount = ownedSet?.size || 0;

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    await importOwnedRosterFile?.(file);
  };

  return (
    <div className={`rounded-2xl border border-slate-800/70 bg-slate-950/35 ${compact ? 'p-4 space-y-4' : 'p-5 space-y-5'}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-300">Owned Characters</p>
          <p className="mt-1 text-[11px] text-slate-400">
            Saved per user and reused for zone filters.
            {user?.id ? ` ${ownedCount} selected.` : ' Sign in to save your roster.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={!user?.id || ownedImporting}
            className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-500/35 bg-indigo-500/10 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-indigo-100 transition hover:bg-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Upload className="h-3.5 w-3.5" />
            {ownedImporting ? 'Importing...' : 'Import Reliquary'}
          </button>
          <button
            type="button"
            onClick={saveOwnedRoster}
            disabled={!user?.id || ownedSaving}
            className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/35 bg-cyan-500/10 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-cyan-100 transition hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" />
            {ownedSaving ? 'Saving...' : 'Save Roster'}
          </button>
          <button
            type="button"
            onClick={loadOwnedRoster}
            disabled={!user?.id || ownedLoading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-200 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${ownedLoading ? 'animate-spin' : ''}`} />
            Reload
          </button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-900/55 px-3 py-2">
        <div className="flex items-center gap-2 text-[10px] text-slate-400">
          <Download className="h-3.5 w-3.5 text-cyan-300" />
          <span>Manual pick or import a Reliquary archive JSON.</span>
        </div>
        <span className="rounded-full border border-slate-700 bg-slate-950 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-slate-300">
          {ownedCount} Owned
        </span>
      </div>

      <label className="relative block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          value={ownedSearchTerm}
          onChange={(event) => setOwnedSearchTerm(event.target.value)}
          placeholder="Search owned roster..."
          className="w-full rounded-xl border border-slate-800 bg-slate-900 px-10 py-3 text-sm text-white outline-none transition focus:border-cyan-500/50"
        />
      </label>

      <div className={`grid ${compact ? 'max-h-[240px]' : 'max-h-[320px]'} grid-cols-4 gap-2 overflow-y-auto pr-1 sm:grid-cols-5 md:grid-cols-6 xl:grid-cols-7`}>
        {ownedOptions.map((character) => {
          const numId = Number(character?.numId);
          return (
            <CharacterAvatar
              key={character.id || numId}
              character={character}
              selected={ownedSet?.has(numId)}
              onClick={() => toggleOwnedCharacter(numId)}
            />
          );
        })}
      </div>

      <p className="text-[10px] leading-relaxed text-slate-500">
        Zone filters can use this saved roster with min 3 owned for friend support or min 4 owned for fully owned teams.
      </p>
    </div>
  );
}
