import {
  extractDiscordDisplayName,
  handleApiError,
  requireAuthenticatedUser,
  setCorsHeaders,
  supabaseAdminRequest,
} from '../zone/shared.js';
import { syncProfileProgression } from '../profile/progression.js';

const env = globalThis.process?.env || {};

const PVP_ROOMS_TABLE = env.SUPABASE_PVP_ROOMS_TABLE || 'pvp_rooms';
const PVP_BOT_RESULTS_TABLE = env.SUPABASE_PVP_BOT_RESULTS_TABLE || 'pvp_bot_results';
const FETCH_PAGE_SIZE = 500;
const DEFAULT_LEADERBOARD_LIMIT = 12;
const MAX_LEADERBOARD_LIMIT = 50;
const BOT_ROOM_RETENTION_SECONDS = Math.max(60, Number(env.PVP_BOT_ROOM_RETENTION_SECONDS || 900) || 900);

function isBotUserId(value) {
  const normalized = String(value || '').trim();
  return normalized.startsWith('dev-bot:') || normalized.startsWith('dev-bot-fair:');
}

function normalizeNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function roundTo(value, decimals = 1) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  const factor = 10 ** decimals;
  return Math.round(numeric * factor) / factor;
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
      pointsRule: '3 for a win, 1 for a draw',
      source: 'configured',
    };
  }

  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const startAt = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
  const endAt = new Date(Date.UTC(year, month + 1, 1, 0, 0, 0, 0));

  return {
    label: `${year}.${String(month + 1).padStart(2, '0')}`,
    startAt: startAt.toISOString(),
    endAt: endAt.toISOString(),
    pointsRule: '3 for a win, 1 for a draw',
    source: 'monthly',
  };
}

function buildRoomsPath({ startAt, endAt, offset = 0, limit = FETCH_PAGE_SIZE }) {
  const params = [
    ['select', [
      'code',
      'status',
      'tier',
      'difficulty',
      'host_user_id',
      'host_name',
      'guest_user_id',
      'guest_name',
      'winner_user_id',
      'started_at',
      'finished_at',
      'host_state',
      'guest_state',
    ].join(',')],
    ['status', 'eq.finished'],
    ['finished_at', `gte.${startAt}`],
    ['finished_at', `lt.${endAt}`],
    ['order', 'finished_at.desc'],
    ['limit', String(limit)],
    ['offset', String(offset)],
  ];

  return `${PVP_ROOMS_TABLE}?${params
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&')}`;
}

function buildBotResultsPath({ startAt, endAt, offset = 0, limit = FETCH_PAGE_SIZE }) {
  const params = [
    ['select', [
      'room_code',
      'tier',
      'difficulty',
      'seed_label',
      'host_user_id',
      'host_name',
      'bot_user_id',
      'bot_name',
      'winner_user_id',
      'created_at',
      'started_at',
      'finished_at',
      'host_state',
      'bot_state',
      'archived_at',
    ].join(',')],
    ['finished_at', `gte.${startAt}`],
    ['finished_at', `lt.${endAt}`],
    ['order', 'finished_at.desc'],
    ['limit', String(limit)],
    ['offset', String(offset)],
  ];

  return `${PVP_BOT_RESULTS_TABLE}?${params
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&')}`;
}

function buildRoomDeletePath(code) {
  return `${PVP_ROOMS_TABLE}?code=${encodeURIComponent(`eq.${String(code || '').trim()}`)}`;
}

function isBotRoomRow(row) {
  return isBotUserId(row?.host_user_id) || isBotUserId(row?.guest_user_id);
}

function isArchivedBotRow(row) {
  return Boolean(String(row?.room_code || '').trim());
}

function normalizeArchivedBotRow(row) {
  return {
    code: String(row?.room_code || '').trim(),
    status: 'finished',
    tier: row?.tier,
    difficulty: row?.difficulty,
    seed_label: row?.seed_label,
    host_user_id: row?.host_user_id,
    host_name: row?.host_name,
    guest_user_id: row?.bot_user_id,
    guest_name: row?.bot_name,
    winner_user_id: row?.winner_user_id,
    created_at: row?.created_at,
    started_at: row?.started_at,
    finished_at: row?.finished_at,
    host_state: row?.host_state,
    guest_state: row?.bot_state,
    archived_at: row?.archived_at,
  };
}

function createBotArchivePayload(row) {
  const hostIsBot = isBotUserId(row?.host_user_id);
  const botUserId = hostIsBot ? row?.host_user_id : row?.guest_user_id;
  const botName = hostIsBot ? row?.host_name : row?.guest_name;
  const botState = hostIsBot ? row?.host_state : row?.guest_state;
  const hostUserId = hostIsBot ? row?.guest_user_id : row?.host_user_id;
  const hostName = hostIsBot ? row?.guest_name : row?.host_name;
  const hostState = hostIsBot ? row?.guest_state : row?.host_state;

  return {
    room_code: String(row?.code || '').trim(),
    tier: String(row?.tier || row?.difficulty || '').trim() || 'beginner',
    difficulty: String(row?.difficulty || row?.tier || '').trim() || 'Beginner',
    seed_label: String(row?.seed_label || '').trim() || null,
    host_user_id: String(hostUserId || '').trim(),
    host_name: String(hostName || '').trim() || 'Player',
    bot_user_id: String(botUserId || '').trim(),
    bot_name: String(botName || '').trim() || 'Bot',
    winner_user_id: String(row?.winner_user_id || '').trim() || null,
    created_at: safeIso(row?.created_at || row?.started_at || row?.finished_at || Date.now()),
    started_at: safeIso(row?.started_at || row?.created_at || row?.finished_at || Date.now()),
    finished_at: safeIso(row?.finished_at || row?.updated_at || Date.now()),
    host_state: row?.host_state && typeof row.host_state === 'object' ? hostState : {},
    bot_state: row?.guest_state && typeof row.guest_state === 'object' ? botState : {},
    archived_at: new Date().toISOString(),
  };
}

function isExpiredBotRoom(row) {
  if (!isBotRoomRow(row)) return false;
  const finishedAtMs = new Date(row?.finished_at || 0).getTime();
  if (!Number.isFinite(finishedAtMs) || finishedAtMs <= 0) return false;
  return Date.now() - finishedAtMs >= BOT_ROOM_RETENTION_SECONDS * 1000;
}

async function fetchSeasonRooms(season) {
  const rows = [];
  for (let offset = 0; offset < 10000; offset += FETCH_PAGE_SIZE) {
    const batch = await supabaseAdminRequest(buildRoomsPath({
      startAt: season.startAt,
      endAt: season.endAt,
      offset,
    }));
    if (!Array.isArray(batch) || batch.length === 0) break;
    rows.push(...batch);
    if (batch.length < FETCH_PAGE_SIZE) break;
  }
  return rows;
}

async function fetchSeasonBotResults(season) {
  const rows = [];
  try {
    for (let offset = 0; offset < 10000; offset += FETCH_PAGE_SIZE) {
      const batch = await supabaseAdminRequest(buildBotResultsPath({
        startAt: season.startAt,
        endAt: season.endAt,
        offset,
      }));
      if (!Array.isArray(batch) || batch.length === 0) break;
      rows.push(...batch);
      if (batch.length < FETCH_PAGE_SIZE) break;
    }
    return rows;
  } catch {
    return [];
  }
}

async function archiveAndDeleteBotRooms(rows) {
  const archivedRows = [];
  for (const row of Array.isArray(rows) ? rows : []) {
    const code = String(row?.code || '').trim();
    if (!code || !isExpiredBotRoom(row)) continue;

    try {
      const payload = createBotArchivePayload(row);
      const archived = await supabaseAdminRequest(PVP_BOT_RESULTS_TABLE, {
        method: 'POST',
        body: payload,
        prefer: 'resolution=merge-duplicates,return=representation',
      });
      await supabaseAdminRequest(buildRoomDeletePath(code), {
        method: 'DELETE',
        prefer: 'return=minimal',
      });
      const normalizedArchived = Array.isArray(archived) ? archived[0] || payload : archived || payload;
      archivedRows.push(normalizedArchived);
    } catch {
      // If the archive table is not ready yet, keep the live room row so we do not lose profile data.
    }
  }
  return archivedRows;
}

function resolvePlayerSnapshot(state) {
  const bestScore = Math.max(
    normalizeNumber(state?.bestScore, 0),
    normalizeNumber(state?.finalScore, 0),
    normalizeNumber(state?.score, 0),
  );
  const bestHelpfulHits = Math.max(
    normalizeNumber(state?.bestHelpfulHits, 0),
    normalizeNumber(state?.finalHelpfulHits, 0),
    normalizeNumber(state?.helpfulHits, 0),
  );
  const bestMistakes = Math.max(
    normalizeNumber(state?.bestMistakes, 0),
    normalizeNumber(state?.finalMistakes, 0),
    normalizeNumber(state?.mistakes, 0),
  );
  const bestRollCount = Math.max(
    normalizeNumber(state?.bestRollCount, 0),
    normalizeNumber(state?.finalRollCount, 0),
    normalizeNumber(state?.rollCount, 0),
  );

  return {
    score: bestScore,
    helpfulHits: bestHelpfulHits,
    mistakes: bestMistakes,
    rollCount: bestRollCount,
    grade: String(state?.bestGrade || state?.finalGrade || state?.grade || 'F'),
    submitted: normalizeNumber(state?.submittedAttempts, 0) > 0,
    goalSatisfied: Boolean(
      state?.bestGoalSatisfied
      || state?.finalGoalSatisfied
      || state?.goalSatisfied,
    ),
    status: String(state?.status || '').trim().toLowerCase(),
  };
}

function createBucket() {
  return {
    matches: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    seasonPoints: 0,
    totalScore: 0,
    bestScore: 0,
    totalHelpfulHits: 0,
    totalMistakes: 0,
  };
}

function applyResultToBucket(bucket, result, score, helpfulHits, mistakes, isCompetitive) {
  bucket.matches += 1;
  bucket.totalScore += score;
  bucket.bestScore = Math.max(bucket.bestScore, score);
  bucket.totalHelpfulHits += helpfulHits;
  bucket.totalMistakes += mistakes;

  if (result === 'win') {
    bucket.wins += 1;
    if (isCompetitive) bucket.seasonPoints += 3;
    return;
  }
  if (result === 'loss') {
    bucket.losses += 1;
    return;
  }
  bucket.draws += 1;
  if (isCompetitive) bucket.seasonPoints += 1;
}

function createAggregate(userId, displayName) {
  return {
    userId,
    displayName: String(displayName || '').trim() || `User-${String(userId || '').slice(0, 6)}`,
    all: createBucket(),
    competitive: createBucket(),
    practice: createBucket(),
    practiceByBot: new Map(),
    recentMatches: [],
    competitiveMatches: [],
    practiceMatches: [],
    competitiveTimeline: [],
    lastPlayedAt: null,
  };
}

function normalizeBotDisplayName(value) {
  const normalized = String(value || '').trim();
  const lower = normalized.toLowerCase();
  if (!normalized) return 'Bot';
  if (lower.includes('clara') || lower.includes('fair')) return 'Clara Bot';
  if (lower.includes('svarog')) return 'Svarog Bot';
  return normalized;
}

function applyPracticeBotSummary(bucketMap, botName, matchEntry) {
  const key = normalizeBotDisplayName(botName);
  const current = bucketMap.get(key) || {
    botName: key,
    matches: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    totalScore: 0,
    bestScore: 0,
    totalHelpfulHits: 0,
    totalMistakes: 0,
    lastPlayedAt: null,
    lastResult: '',
    submittedMatches: 0,
    tierCounts: {},
  };

  current.matches += 1;
  current.totalScore += normalizeNumber(matchEntry?.score, 0);
  current.bestScore = Math.max(current.bestScore, normalizeNumber(matchEntry?.score, 0));
  current.totalHelpfulHits += normalizeNumber(matchEntry?.helpfulHits, 0);
  current.totalMistakes += normalizeNumber(matchEntry?.mistakes, 0);
  current.submittedMatches += matchEntry?.submitted ? 1 : 0;

  const result = String(matchEntry?.result || 'draw').trim().toLowerCase();
  if (result === 'win') current.wins += 1;
  else if (result === 'loss') current.losses += 1;
  else current.draws += 1;

  const tierKey = String(matchEntry?.tier || 'unknown').trim() || 'unknown';
  current.tierCounts[tierKey] = normalizeNumber(current.tierCounts[tierKey], 0) + 1;

  const finishedAt = safeIso(matchEntry?.finishedAt);
  if (!current.lastPlayedAt || (finishedAt && new Date(finishedAt) > new Date(current.lastPlayedAt))) {
    current.lastPlayedAt = finishedAt || current.lastPlayedAt;
    current.lastResult = result;
  }

  bucketMap.set(key, current);
}

function summarizeBucket(bucket) {
  const matches = normalizeNumber(bucket?.matches, 0);
  const wins = normalizeNumber(bucket?.wins, 0);
  const losses = normalizeNumber(bucket?.losses, 0);
  const draws = normalizeNumber(bucket?.draws, 0);

  return {
    matches,
    wins,
    losses,
    draws,
    seasonPoints: normalizeNumber(bucket?.seasonPoints, 0),
    winRate: matches > 0 ? roundTo((wins / matches) * 100, 1) : 0,
    averageScore: matches > 0 ? roundTo(normalizeNumber(bucket?.totalScore, 0) / matches, 1) : 0,
    bestScore: normalizeNumber(bucket?.bestScore, 0),
    averageHelpfulHits: matches > 0 ? roundTo(normalizeNumber(bucket?.totalHelpfulHits, 0) / matches, 1) : 0,
    averageMistakes: matches > 0 ? roundTo(normalizeNumber(bucket?.totalMistakes, 0) / matches, 1) : 0,
  };
}

function computeStreaks(timeline) {
  const ordered = Array.isArray(timeline)
    ? timeline
        .filter((entry) => entry && entry.finishedAt)
        .slice()
        .sort((left, right) => new Date(left.finishedAt) - new Date(right.finishedAt))
    : [];

  let rollingWins = 0;
  let bestWinStreak = 0;
  for (const entry of ordered) {
    if (entry.result === 'win') {
      rollingWins += 1;
      bestWinStreak = Math.max(bestWinStreak, rollingWins);
    } else {
      rollingWins = 0;
    }
  }

  let currentWinStreak = 0;
  for (let index = ordered.length - 1; index >= 0; index -= 1) {
    if (ordered[index].result !== 'win') break;
    currentWinStreak += 1;
  }

  return {
    bestWinStreak,
    currentWinStreak,
  };
}

function buildUnlockedTitles(profile, rank) {
  const titles = [];
  const competitiveWins = normalizeNumber(profile?.competitive?.wins, 0);
  const bestScore = normalizeNumber(profile?.competitive?.bestScore, 0);
  const practiceWins = normalizeNumber(profile?.practice?.wins, 0);

  if (rank === 1) {
    titles.push({ key: 'astral-marshal', name: 'Astral Marshal', source: 'Finished first on the leaderboard' });
  } else if (rank > 0 && rank <= 3) {
    titles.push({ key: 'proxy-prime', name: 'Proxy Prime', source: 'Finished top 3 this season' });
  } else if (rank > 0 && rank <= 10) {
    titles.push({ key: 'leyline-tactician', name: 'Leyline Tactician', source: 'Finished top 10 this season' });
  }

  if (competitiveWins >= 5) {
    titles.push({ key: 'ranked-riftwalker', name: 'Ranked Riftwalker', source: 'Won 5 competitive duels' });
  }
  if (bestScore >= 90) {
    titles.push({ key: 'resonium-savant', name: 'Resonium Savant', source: 'Reached a 90+ duel score' });
  }
  if (practiceWins >= 8) {
    titles.push({ key: 'svarog-calibrated', name: 'Svarog-Calibrated', source: 'Won 8 bot practice duels' });
  }

  return titles.slice(0, 4);
}

function buildRewardTrack(profile, rank) {
  const competitiveWins = normalizeNumber(profile?.competitive?.wins, 0);
  const seasonPoints = normalizeNumber(profile?.competitive?.seasonPoints, 0);

  return [
    {
      key: 'reward-track-1',
      name: 'Bronze Duelist Tag',
      requirement: '3 competitive wins',
      unlocked: competitiveWins >= 3,
    },
    {
      key: 'reward-track-2',
      name: 'Signal Frame',
      requirement: '10 season points',
      unlocked: seasonPoints >= 10,
    },
    {
      key: 'reward-track-3',
      name: 'Clara Chips Cache',
      requirement: '7 competitive wins',
      unlocked: competitiveWins >= 7,
    },
    {
      key: 'reward-track-4',
      name: 'Season Crown Title',
      requirement: 'Finish top 3',
      unlocked: rank > 0 && rank <= 3,
    },
  ];
}

function finalizeAggregate(aggregate) {
  const recentMatches = aggregate.recentMatches
    .slice()
    .sort((left, right) => new Date(right.finishedAt || 0) - new Date(left.finishedAt || 0))
    .slice(0, 8);
  const competitiveMatches = aggregate.competitiveMatches
    .slice()
    .sort((left, right) => new Date(right.finishedAt || 0) - new Date(left.finishedAt || 0))
    .slice(0, 8);
  const practiceMatches = aggregate.practiceMatches
    .slice()
    .sort((left, right) => new Date(right.finishedAt || 0) - new Date(left.finishedAt || 0))
    .slice(0, 24);
  const competitiveSummary = summarizeBucket(aggregate.competitive);
  const practiceSummary = summarizeBucket(aggregate.practice);
  const allSummary = summarizeBucket(aggregate.all);
  const streaks = computeStreaks(aggregate.competitiveTimeline);
  const practiceByBot = Array.from(aggregate.practiceByBot.values())
    .map((entry) => ({
      ...entry,
      winRate: entry.matches > 0 ? roundTo((entry.wins / entry.matches) * 100, 1) : 0,
      averageScore: entry.matches > 0 ? roundTo(entry.totalScore / entry.matches, 1) : 0,
      averageHelpfulHits: entry.matches > 0 ? roundTo(entry.totalHelpfulHits / entry.matches, 1) : 0,
      averageMistakes: entry.matches > 0 ? roundTo(entry.totalMistakes / entry.matches, 1) : 0,
      tiers: Object.entries(entry.tierCounts || {})
        .sort((left, right) => left[0].localeCompare(right[0]))
        .map(([tier, count]) => ({ tier, count: normalizeNumber(count, 0) })),
    }))
    .sort((left, right) => {
      if (left.botName === right.botName) return 0;
      if (left.botName === 'Svarog Bot') return -1;
      if (right.botName === 'Svarog Bot') return 1;
      if (left.botName === 'Clara Bot') return -1;
      if (right.botName === 'Clara Bot') return 1;
      return left.botName.localeCompare(right.botName);
    });

  return {
    userId: aggregate.userId,
    displayName: aggregate.displayName,
    lastPlayedAt: aggregate.lastPlayedAt,
    all: allSummary,
    competitive: competitiveSummary,
    practice: practiceSummary,
    recentMatches,
    competitiveMatches,
    practiceMatches,
    practiceByBot,
    bestWinStreak: streaks.bestWinStreak,
    currentWinStreak: streaks.currentWinStreak,
  };
}

function aggregateRooms(rows) {
  const players = new Map();
  let competitiveRooms = 0;
  let practiceRooms = 0;

  for (const row of Array.isArray(rows) ? rows : []) {
    const hostUserId = String(row?.host_user_id || '').trim();
    const guestUserId = String(row?.guest_user_id || '').trim();
    if (!hostUserId || !guestUserId) continue;

    const finishedAt = safeIso(row?.finished_at || row?.started_at || row?.updated_at || Date.now());
    if (!finishedAt) continue;

    const competitiveRoom = !isBotUserId(hostUserId) && !isBotUserId(guestUserId);
    if (competitiveRoom) competitiveRooms += 1;
    else practiceRooms += 1;

    const winnerUserId = String(row?.winner_user_id || '').trim();
    const hostSnapshot = resolvePlayerSnapshot(row?.host_state || {});
    const guestSnapshot = resolvePlayerSnapshot(row?.guest_state || {});
    const participants = [
      {
        userId: hostUserId,
        displayName: row?.host_name,
        snapshot: hostSnapshot,
        opponentId: guestUserId,
        opponentName: row?.guest_name || 'Opponent',
        opponentSnapshot: guestSnapshot,
      },
      {
        userId: guestUserId,
        displayName: row?.guest_name || 'Opponent',
        snapshot: guestSnapshot,
        opponentId: hostUserId,
        opponentName: row?.host_name || 'Host',
        opponentSnapshot: hostSnapshot,
      },
    ];

    for (const participant of participants) {
      const aggregate = players.get(participant.userId)
        || createAggregate(participant.userId, participant.displayName);
      aggregate.displayName = String(participant.displayName || aggregate.displayName || '').trim() || aggregate.displayName;

      const result = winnerUserId
        ? (winnerUserId === participant.userId ? 'win' : 'loss')
        : 'draw';
      const opponentIsBot = isBotUserId(participant.opponentId);
      const score = normalizeNumber(participant.snapshot.score, 0);
      const helpfulHits = normalizeNumber(participant.snapshot.helpfulHits, 0);
      const mistakes = normalizeNumber(participant.snapshot.mistakes, 0);
      const tier = String(row?.tier || row?.difficulty || '').trim() || 'beginner';

      const matchEntry = {
        roomCode: String(row?.code || '').trim(),
        finishedAt,
        tier,
        result,
        score,
        helpfulHits,
        mistakes,
        grade: participant.snapshot.grade,
        submitted: participant.snapshot.submitted,
        goalSatisfied: participant.snapshot.goalSatisfied,
        opponentId: participant.opponentId,
        opponentName: opponentIsBot
          ? normalizeBotDisplayName(participant.opponentName || 'Bot')
          : (String(participant.opponentName || 'Opponent').trim() || 'Opponent'),
        opponentIsBot,
        mode: competitiveRoom ? 'competitive' : 'practice',
      };

      applyResultToBucket(aggregate.all, result, score, helpfulHits, mistakes, false);
      if (competitiveRoom) {
        applyResultToBucket(aggregate.competitive, result, score, helpfulHits, mistakes, true);
        aggregate.competitiveMatches.push(matchEntry);
        aggregate.competitiveTimeline.push({
          finishedAt,
          result,
        });
      } else {
        applyResultToBucket(aggregate.practice, result, score, helpfulHits, mistakes, false);
        aggregate.practiceMatches.push(matchEntry);
        if (opponentIsBot) {
          applyPracticeBotSummary(aggregate.practiceByBot, matchEntry.opponentName, matchEntry);
        }
      }

      aggregate.recentMatches.push(matchEntry);
      if (!aggregate.lastPlayedAt || new Date(finishedAt) > new Date(aggregate.lastPlayedAt)) {
        aggregate.lastPlayedAt = finishedAt;
      }

      players.set(participant.userId, aggregate);
    }
  }

  return {
    competitiveRooms,
    practiceRooms,
    players,
  };
}

function buildLeaderboard(finalizedPlayers, limit) {
  return finalizedPlayers
    .filter((entry) => !isBotUserId(entry.userId))
    .filter((entry) => normalizeNumber(entry?.competitive?.matches, 0) > 0)
    .sort((left, right) => {
      const pointsDiff = normalizeNumber(right?.competitive?.seasonPoints, 0) - normalizeNumber(left?.competitive?.seasonPoints, 0);
      if (pointsDiff !== 0) return pointsDiff;

      const winRateDiff = normalizeNumber(right?.competitive?.winRate, 0) - normalizeNumber(left?.competitive?.winRate, 0);
      if (winRateDiff !== 0) return winRateDiff;

      const bestScoreDiff = normalizeNumber(right?.competitive?.bestScore, 0) - normalizeNumber(left?.competitive?.bestScore, 0);
      if (bestScoreDiff !== 0) return bestScoreDiff;

      return normalizeNumber(right?.competitive?.matches, 0) - normalizeNumber(left?.competitive?.matches, 0);
    })
    .slice(0, limit)
    .map((entry, index) => ({
      rank: index + 1,
      userId: entry.userId,
      displayName: entry.displayName,
      seasonPoints: entry.competitive.seasonPoints,
      matches: entry.competitive.matches,
      wins: entry.competitive.wins,
      losses: entry.competitive.losses,
      draws: entry.competitive.draws,
      winRate: entry.competitive.winRate,
      bestScore: entry.competitive.bestScore,
      averageScore: entry.competitive.averageScore,
      bestWinStreak: entry.bestWinStreak,
      lastPlayedAt: entry.lastPlayedAt,
    }));
}

function buildPracticeLeaderboard(finalizedPlayers, limit) {
  return finalizedPlayers
    .filter((entry) => !isBotUserId(entry.userId))
    .filter((entry) => normalizeNumber(entry?.practice?.matches, 0) > 0)
    .sort((left, right) => {
      const winsDiff = normalizeNumber(right?.practice?.wins, 0) - normalizeNumber(left?.practice?.wins, 0);
      if (winsDiff !== 0) return winsDiff;

      const winRateDiff = normalizeNumber(right?.practice?.winRate, 0) - normalizeNumber(left?.practice?.winRate, 0);
      if (winRateDiff !== 0) return winRateDiff;

      const avgScoreDiff = normalizeNumber(right?.practice?.averageScore, 0) - normalizeNumber(left?.practice?.averageScore, 0);
      if (avgScoreDiff !== 0) return avgScoreDiff;

      const bestScoreDiff = normalizeNumber(right?.practice?.bestScore, 0) - normalizeNumber(left?.practice?.bestScore, 0);
      if (bestScoreDiff !== 0) return bestScoreDiff;

      return normalizeNumber(right?.practice?.matches, 0) - normalizeNumber(left?.practice?.matches, 0);
    })
    .slice(0, limit)
    .map((entry, index) => ({
      rank: index + 1,
      userId: entry.userId,
      displayName: entry.displayName,
      matches: entry.practice.matches,
      wins: entry.practice.wins,
      losses: entry.practice.losses,
      draws: entry.practice.draws,
      winRate: entry.practice.winRate,
      bestScore: entry.practice.bestScore,
      averageScore: entry.practice.averageScore,
      lastPlayedAt: entry.lastPlayedAt,
    }));
}

async function tryResolveViewer(req) {
  try {
    const auth = await requireAuthenticatedUser(req);
    return auth.user || null;
  } catch {
    return null;
  }
}

async function buildProfilePayload(viewer, finalizedPlayers, leaderboard, season) {
  if (!viewer?.id) return null;

  const baseDisplayName = extractDiscordDisplayName(viewer) || viewer?.email || viewer.id;
  const playerRecord = finalizedPlayers.find((entry) => String(entry.userId) === String(viewer.id))
    || {
      userId: viewer.id,
      displayName: baseDisplayName,
      all: summarizeBucket(createBucket()),
      competitive: summarizeBucket(createBucket()),
      practice: summarizeBucket(createBucket()),
    recentMatches: [],
    competitiveMatches: [],
    practiceMatches: [],
    practiceByBot: [],
    bestWinStreak: 0,
    currentWinStreak: 0,
    lastPlayedAt: null,
  };

  const leaderboardEntry = leaderboard.find((entry) => String(entry.userId) === String(viewer.id));
  const profile = {
    ...playerRecord,
    displayName: baseDisplayName,
    leaderboardRank: leaderboardEntry?.rank || null,
  };
  const progression = await syncProfileProgression({
    userId: viewer.id,
    profile,
    leaderboardRank: leaderboardEntry?.rank || null,
    season,
  });

  return {
    ...profile,
    titles: Array.isArray(progression?.titles)
      ? progression.titles.filter((entry) => entry.unlocked)
      : buildUnlockedTitles(profile, leaderboardEntry?.rank || null),
    achievements: Array.isArray(progression?.achievements) ? progression.achievements : [],
    progression,
    rankTier: progression?.rankTier || null,
    rewardTrack: Array.isArray(progression?.rewards) ? progression.rewards : buildRewardTrack(profile, leaderboardEntry?.rank || null),
  };
}

export async function getSeasonStatsSnapshot({ viewer = null, limit = DEFAULT_LEADERBOARD_LIMIT } = {}) {
  const season = resolveSeasonWindow();
  const liveRows = await fetchSeasonRooms(season);
  const archivedBotRows = await fetchSeasonBotResults(season);
  const archivedBotCodes = new Set(
    archivedBotRows
      .map((row) => String(row?.room_code || '').trim())
      .filter(Boolean),
  );
  const newlyArchivedBotRows = await archiveAndDeleteBotRooms(
    liveRows.filter((row) => isExpiredBotRoom(row) && !archivedBotCodes.has(String(row?.code || '').trim())),
  );
  newlyArchivedBotRows.forEach((row) => {
    const code = String(row?.room_code || '').trim();
    if (code) archivedBotCodes.add(code);
  });

  const mergedRows = [
    ...liveRows.filter((row) => !archivedBotCodes.has(String(row?.code || '').trim())),
    ...archivedBotRows.map(normalizeArchivedBotRow),
    ...newlyArchivedBotRows.map(normalizeArchivedBotRow),
  ];

  const aggregated = aggregateRooms(mergedRows);
  const finalizedPlayers = Array.from(aggregated.players.values()).map(finalizeAggregate);
  const safeLimit = Math.max(1, Math.min(MAX_LEADERBOARD_LIMIT, Number(limit) || DEFAULT_LEADERBOARD_LIMIT));
  const leaderboard = buildLeaderboard(finalizedPlayers, safeLimit);
  const practiceLeaderboard = buildPracticeLeaderboard(finalizedPlayers, safeLimit);
  const profile = await buildProfilePayload(viewer, finalizedPlayers, leaderboard, season);

  return {
    season,
    summary: {
      finishedRooms: mergedRows.length,
      competitiveRooms: aggregated.competitiveRooms,
      practiceRooms: aggregated.practiceRooms,
      archivedBotRooms: archivedBotCodes.size,
      trackedPlayers: finalizedPlayers.filter((entry) => !isBotUserId(entry.userId)).length,
    },
    leaderboard,
    practiceLeaderboard,
    profile,
  };
}

export async function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed.' });
    }

    const requestedLimit = Math.max(
      1,
      Math.min(
        MAX_LEADERBOARD_LIMIT,
        Number(req.query?.limit || DEFAULT_LEADERBOARD_LIMIT) || DEFAULT_LEADERBOARD_LIMIT,
      ),
    );
    const viewer = await tryResolveViewer(req);
    const snapshot = await getSeasonStatsSnapshot({
      viewer,
      limit: requestedLimit,
    });

    return res.status(200).json({
      success: true,
      ...snapshot,
    });
  } catch (error) {
    return handleApiError(res, error);
  }
}
