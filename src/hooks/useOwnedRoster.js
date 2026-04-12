import { useCallback, useEffect, useMemo, useState } from 'react';
import charactersData from '../data/characters.json';
import { useAuth } from './useAuth';
import { buildApiUrl } from '../utils/apiBase';

function extractOwnedCharacterIdsFromImport(payload) {
  const sources = [];
  if (Array.isArray(payload?.characters)) sources.push(payload.characters);
  if (Array.isArray(payload?.avatars)) sources.push(payload.avatars);
  if (Array.isArray(payload?.roster)) sources.push(payload.roster);

  const ids = [];
  for (const source of sources) {
    for (const entry of source) {
      const candidate = Number(
        entry?.id ??
        entry?.character_id ??
        entry?.characterId ??
        entry?.avatar_id ??
        entry?.avatarId ??
        entry?.numId
      );
      if (Number.isInteger(candidate) && candidate > 0) {
        ids.push(candidate);
      }
    }
  }

  return Array.from(new Set(ids)).sort((a, b) => a - b);
}

function normalizeErrorMessage(error) {
  return String(error?.message || error || 'Failed to update owned roster.');
}

export function useOwnedRoster() {
  const { user, getAuthHeader } = useAuth();
  const [ownedCharIds, setOwnedCharIds] = useState([]);
  const [ownedLoading, setOwnedLoading] = useState(false);
  const [ownedSaving, setOwnedSaving] = useState(false);
  const [ownedImporting, setOwnedImporting] = useState(false);
  const [ownedSearchTerm, setOwnedSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const charactersByNumId = useMemo(() => {
    const map = new Map();
    for (const character of charactersData) {
      map.set(Number(character?.numId), character);
    }
    return map;
  }, []);

  const ownedSet = useMemo(() => new Set(ownedCharIds), [ownedCharIds]);

  const ownedOptions = useMemo(() => {
    const term = ownedSearchTerm.trim().toLowerCase();
    return charactersData.filter((character) => {
      if (!term) return true;
      return String(character?.name || '').toLowerCase().includes(term);
    });
  }, [ownedSearchTerm]);

  const loadOwnedRoster = useCallback(async () => {
    if (!user?.id) {
      setOwnedCharIds([]);
      setOwnedLoading(false);
      return;
    }
    setOwnedLoading(true);
    setError('');
    try {
      const response = await fetch(buildApiUrl('/api/zone/owned'), {
        method: 'GET',
        headers: { ...getAuthHeader() },
      });
      if (response.status === 404) {
        setOwnedCharIds([]);
        return;
      }
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || `HTTP ${response.status}`);
      }
      setOwnedCharIds(Array.isArray(payload.owned_char_ids) ? payload.owned_char_ids.map(Number) : []);
    } catch (ownedError) {
      setError(normalizeErrorMessage(ownedError));
    } finally {
      setOwnedLoading(false);
    }
  }, [getAuthHeader, user?.id]);

  const persistOwnedRoster = useCallback(async (nextOwnedCharIds, successMessage = 'Owned roster saved.') => {
    if (!user?.id) {
      throw new Error('Sign in to save your owned roster.');
    }

    const normalizedOwned = Array.from(
      new Set(
        (Array.isArray(nextOwnedCharIds) ? nextOwnedCharIds : [])
          .map((value) => Number(value))
          .filter((value) => Number.isInteger(value) && charactersByNumId.has(value))
      )
    ).sort((a, b) => a - b);

    const response = await fetch(buildApiUrl('/api/zone/owned'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({ owned_char_ids: normalizedOwned }),
    });
    if (response.status === 404) {
      throw new Error('Owned roster API is not available. Run backend API.');
    }
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || `HTTP ${response.status}`);
    }
    const persisted = Array.isArray(payload.owned_char_ids) ? payload.owned_char_ids.map(Number) : normalizedOwned;
    setOwnedCharIds(persisted);
    setSuccess(successMessage);
    return persisted;
  }, [charactersByNumId, getAuthHeader, user?.id]);

  const saveOwnedRoster = useCallback(async () => {
    setOwnedSaving(true);
    setError('');
    setSuccess('');
    try {
      await persistOwnedRoster(ownedCharIds, 'Owned roster saved. Zones will use this same list.');
    } catch (ownedError) {
      setError(normalizeErrorMessage(ownedError));
    } finally {
      setOwnedSaving(false);
    }
  }, [ownedCharIds, persistOwnedRoster]);

  const importOwnedRosterFile = useCallback(async (file) => {
    if (!file) return;
    setOwnedImporting(true);
    setError('');
    setSuccess('');
    try {
      const rawText = await file.text();
      const payload = JSON.parse(rawText);
      const importedIds = extractOwnedCharacterIdsFromImport(payload).filter((value) => charactersByNumId.has(value));
      if (importedIds.length === 0) {
        throw new Error('No supported characters were found in that Reliquary export.');
      }
      await persistOwnedRoster(importedIds, `Imported ${importedIds.length} owned characters from ${file.name}.`);
    } catch (importError) {
      setError(normalizeErrorMessage(importError));
    } finally {
      setOwnedImporting(false);
    }
  }, [charactersByNumId, persistOwnedRoster]);

  const toggleOwnedCharacter = useCallback((charId) => {
    const normalized = Number(charId);
    setOwnedCharIds((prev) => {
      if (prev.includes(normalized)) {
        return prev.filter((value) => value !== normalized);
      }
      return [...prev, normalized].sort((a, b) => a - b);
    });
  }, []);

  useEffect(() => {
    loadOwnedRoster();
  }, [loadOwnedRoster]);

  return {
    user,
    ownedCharIds,
    ownedSet,
    ownedOptions,
    ownedSearchTerm,
    setOwnedSearchTerm,
    ownedLoading,
    ownedSaving,
    ownedImporting,
    error,
    success,
    loadOwnedRoster,
    saveOwnedRoster,
    importOwnedRosterFile,
    toggleOwnedCharacter,
  };
}
