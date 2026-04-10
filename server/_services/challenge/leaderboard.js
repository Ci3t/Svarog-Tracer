import {
  handleApiError,
  setCorsHeaders,
  supabaseAdminRequest,
} from '../zone/shared.js';
import { fetchUserIdentityMap } from '../profile/account.js';

const env = globalThis.process?.env || {};
const CHALLENGE_RESULTS_TABLE = env.SUPABASE_CHALLENGE_RESULTS_TABLE || 'challenge_results';
const FETCH_PAGE_SIZE = 500;
const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

function normalizeNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function safeIso(value) {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  if (!normalized) return null;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function isReasonableSeasonIso(value) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const year = date.getUTCFullYear();
  const maxYear = new Date().getUTCFullYear() + 2;
  return year >= 2024 && year <= maxYear;
}

function resolveSeasonWindow() {
  const configuredStart = safeIso(env.PVP_SEASON_START);
  if (isReasonableSeasonIso(configuredStart)) {
    const startDate = new Date(configuredStart);
    const configuredEnd = safeIso(env.PVP_SEASON_END);
    const fallbackEnd = new Date(Date.UTC(
      startDate.getUTCFullYear(),
      startDate.getUTCMonth() + 1,
      startDate.getUTCDate() || 1,
      0,
      0,
      0,
      0,
    ));
    const endDate = isReasonableSeasonIso(configuredEnd) && new Date(configuredEnd) > startDate
      ? new Date(configuredEnd)
      : fallbackEnd;

    return {
      label: String(env.PVP_SEASON_LABEL || `Season ${startDate.getUTCFullYear()}`).trim(),
      startAt: startDate.toISOString(),
      endAt: endDate.toISOString(),
      source: 'configured',
    };
  }

  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  return {
    label: `${year}.${String(month + 1).padStart(2, '0')}`,
    startAt: new Date(Date.UTC(year, month, 1, 0, 0, 0, 0)).toISOString(),
    endAt: new Date(Date.UTC(year, month + 1, 1, 0, 0, 0, 0)).toISOString(),
    source: 'monthly',
  };
}

function buildResultsPath({ startAt, endAt, offset = 0, limit = FETCH_PAGE_SIZE }) {
  const params = [
    ['select', [
      'id',
      'user_id',
      'display_name',
      'contract_id',
      'contract_title',
      'difficulty',
      'seed_label',
      'region',
      'score',
      'grade',
      'helpful_hits',
      'mistakes',
      'clear_time_seconds',
      'tries_used',
      'generated',
      'created_at',
    ].join(',')],
    ['created_at', `gte.${startAt}`],
    ['created_at', `lt.${endAt}`],
    ['order', 'created_at.desc'],
    ['limit', String(limit)],
    ['offset', String(offset)],
  ];

  return `${CHALLENGE_RESULTS_TABLE}?${params
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&')}`;
}

function compareChallengeRows(left, right) {
  const scoreDiff = normalizeNumber(left?.score, 0) - normalizeNumber(right?.score, 0);
  if (scoreDiff !== 0) return scoreDiff;

  const leftTime = normalizeNumber(left?.clear_time_seconds, 0);
  const rightTime = normalizeNumber(right?.clear_time_seconds, 0);
  const leftHasTime = leftTime > 0;
  const rightHasTime = rightTime > 0;
  if (leftHasTime !== rightHasTime) return leftHasTime ? 1 : -1;
  if (leftHasTime && rightHasTime && leftTime !== rightTime) return rightTime - leftTime;

  const helpfulDiff = normalizeNumber(left?.helpful_hits, 0) - normalizeNumber(right?.helpful_hits, 0);
  if (helpfulDiff !== 0) return helpfulDiff;

  const mistakesDiff = normalizeNumber(right?.mistakes, 0) - normalizeNumber(left?.mistakes, 0);
  if (mistakesDiff !== 0) return mistakesDiff;

  return new Date(left?.created_at || 0).getTime() - new Date(right?.created_at || 0).getTime();
}

function formatName(row) {
  const value = String(row?.display_name || '').trim();
  if (value) return value;
  return `User-${String(row?.user_id || '').slice(0, 6)}`;
}

async function fetchSeasonChallengeRows(season) {
  const rows = [];
  for (let offset = 0; offset < 10000; offset += FETCH_PAGE_SIZE) {
    const batch = await supabaseAdminRequest(buildResultsPath({
      startAt: season.startAt,
      endAt: season.endAt,
      offset,
    }), {
      method: 'GET',
    });
    if (!Array.isArray(batch) || batch.length === 0) break;
    rows.push(...batch);
    if (batch.length < FETCH_PAGE_SIZE) break;
  }
  return rows;
}

function buildPlayerLeaderboard(rows, limit) {
  const handcraftedRows = Array.isArray(rows) ? rows.filter((row) => !row?.generated) : [];
  const playerMap = new Map();

  for (const row of handcraftedRows) {
    const userId = String(row?.user_id || '').trim();
    if (!userId) continue;
    const contractId = String(row?.contract_id || '').trim();
    if (!contractId) continue;

    const current = playerMap.get(userId) || {
      userId,
      displayName: formatName(row),
      bestByContract: new Map(),
      lastPlayedAt: null,
    };

    const existing = current.bestByContract.get(contractId);
    if (!existing || compareChallengeRows(row, existing) > 0) {
      current.bestByContract.set(contractId, row);
    }

    const createdAt = safeIso(row?.created_at);
    if (!current.lastPlayedAt || (createdAt && new Date(createdAt) > new Date(current.lastPlayedAt))) {
      current.lastPlayedAt = createdAt || current.lastPlayedAt;
    }

    playerMap.set(userId, current);
  }

  return Array.from(playerMap.values())
    .map((entry) => {
      const bestRows = Array.from(entry.bestByContract.values());
      const solvedCount = bestRows.length;
      const totalScore = bestRows.reduce((sum, row) => sum + normalizeNumber(row?.score, 0), 0);
      const bestScore = bestRows.reduce((winner, row) => Math.max(winner, normalizeNumber(row?.score, 0)), 0);
      const averageScore = solvedCount > 0 ? Math.round((totalScore / solvedCount) * 10) / 10 : 0;
      const fastestClearSeconds = bestRows.reduce((winner, row) => {
        const value = normalizeNumber(row?.clear_time_seconds, 0);
        if (value <= 0) return winner;
        if (!Number.isFinite(winner) || winner <= 0) return value;
        return Math.min(winner, value);
      }, 0);
      const totalHelpfulHits = bestRows.reduce((sum, row) => sum + normalizeNumber(row?.helpful_hits, 0), 0);
      const totalMistakes = bestRows.reduce((sum, row) => sum + normalizeNumber(row?.mistakes, 0), 0);

      return {
        userId: entry.userId,
        displayName: entry.displayName,
        solvedCount,
        totalScore: Math.round(totalScore * 10) / 10,
        averageScore,
        bestScore: Math.round(bestScore * 10) / 10,
        fastestClearSeconds: fastestClearSeconds > 0 ? fastestClearSeconds : null,
        helpfulHits: totalHelpfulHits,
        mistakes: totalMistakes,
        lastPlayedAt: entry.lastPlayedAt,
      };
    })
    .sort((left, right) => {
      const solvedDiff = normalizeNumber(right?.solvedCount, 0) - normalizeNumber(left?.solvedCount, 0);
      if (solvedDiff !== 0) return solvedDiff;

      const avgDiff = normalizeNumber(right?.averageScore, 0) - normalizeNumber(left?.averageScore, 0);
      if (avgDiff !== 0) return avgDiff;

      const bestDiff = normalizeNumber(right?.bestScore, 0) - normalizeNumber(left?.bestScore, 0);
      if (bestDiff !== 0) return bestDiff;

      const leftTime = normalizeNumber(left?.fastestClearSeconds, 0);
      const rightTime = normalizeNumber(right?.fastestClearSeconds, 0);
      const leftHasTime = leftTime > 0;
      const rightHasTime = rightTime > 0;
      if (leftHasTime !== rightHasTime) return leftHasTime ? -1 : 1;
      if (leftHasTime && rightHasTime && leftTime !== rightTime) return leftTime - rightTime;

      return new Date(right?.lastPlayedAt || 0).getTime() - new Date(left?.lastPlayedAt || 0).getTime();
    })
    .slice(0, limit)
    .map((entry, index) => ({
      rank: index + 1,
      ...entry,
    }));
}

function buildContractLeaderboard(rows, limit) {
  const handcraftedRows = Array.isArray(rows) ? rows.filter((row) => !row?.generated) : [];
  const contractMap = new Map();

  for (const row of handcraftedRows) {
    const contractId = String(row?.contract_id || '').trim();
    if (!contractId) continue;
    const current = contractMap.get(contractId);
    if (!current || compareChallengeRows(row, current) > 0) {
      contractMap.set(contractId, row);
    }
  }

  return Array.from(contractMap.values())
    .sort((left, right) => {
      const diff = compareChallengeRows(right, left);
      if (diff !== 0) return diff;
      return String(left?.contract_title || '').localeCompare(String(right?.contract_title || ''));
    })
    .slice(0, limit)
    .map((row, index) => ({
      rank: index + 1,
      contractId: String(row?.contract_id || '').trim(),
      contractTitle: String(row?.contract_title || row?.contract_id || '').trim() || 'Unknown contract',
      difficulty: String(row?.difficulty || '').trim() || 'unknown',
      displayName: formatName(row),
      userId: String(row?.user_id || '').trim(),
      score: Math.round(normalizeNumber(row?.score, 0) * 10) / 10,
      grade: String(row?.grade || 'F').trim() || 'F',
      helpfulHits: normalizeNumber(row?.helpful_hits, 0),
      mistakes: normalizeNumber(row?.mistakes, 0),
      clearTimeSeconds: normalizeNumber(row?.clear_time_seconds, 0) || null,
      triesUsed: normalizeNumber(row?.tries_used, 0) || null,
      region: String(row?.region || '').trim(),
      createdAt: safeIso(row?.created_at),
    }));
}

export async function getChallengeLeaderboardSnapshot({ limit = DEFAULT_LIMIT } = {}) {
  const season = resolveSeasonWindow();
  const safeLimit = Math.max(1, Math.min(MAX_LIMIT, Number(limit) || DEFAULT_LIMIT));
  const rows = await fetchSeasonChallengeRows(season);
  const handcraftedRows = rows.filter((row) => !row?.generated);
  const generatedRows = rows.filter((row) => row?.generated);

  const rawLeaderboard = buildPlayerLeaderboard(handcraftedRows, safeLimit);
  const identityMap = await fetchUserIdentityMap(rawLeaderboard.map((entry) => entry.userId)).catch(() => new Map());
  const leaderboard = rawLeaderboard.map((entry) => {
    const identity = identityMap.get(String(entry.userId || '').trim());
    if (!identity) return entry;
    return {
      ...entry,
      displayName: entry.displayName || identity.displayName || entry.displayName,
      displayAvatarUrl: identity.displayAvatarUrl || '',
      displayTitle: identity.displayTitle || '',
      displayTitleRarity: identity.displayTitleRarity || '',
      displayBadge: identity.displayBadge || '',
      displayBadgeRarity: identity.displayBadgeRarity || '',
      displayNameplate: identity.displayNameplate || '',
      displayNameplateKey: identity.displayNameplateKey || '',
      displayNameplateRarity: identity.displayNameplateRarity || '',
      displayFrame: identity.displayFrame || '',
      displayFrameKey: identity.displayFrameKey || '',
      displayFrameRarity: identity.displayFrameRarity || '',
    };
  });

  return {
    season,
    summary: {
      handcraftedClears: handcraftedRows.length,
      generatedClears: generatedRows.length,
      trackedPlayers: new Set(handcraftedRows.map((row) => String(row?.user_id || '').trim()).filter(Boolean)).size,
      trackedContracts: new Set(handcraftedRows.map((row) => String(row?.contract_id || '').trim()).filter(Boolean)).size,
    },
    leaderboard,
    contracts: buildContractLeaderboard(handcraftedRows, safeLimit),
  };
}

export async function handler(req, res) {
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed.' });
    }

    const limit = Math.max(1, Math.min(MAX_LIMIT, Number(req.query?.limit || DEFAULT_LIMIT) || DEFAULT_LIMIT));
    const snapshot = await getChallengeLeaderboardSnapshot({ limit });
    return res.status(200).json({ success: true, ...snapshot });
  } catch (error) {
    return handleApiError(res, error);
  }
}
