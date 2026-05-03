const NON_ACTIONABLE_STATES = new Set(['flat-no-edge', 'noise-burst']);

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function toPct(value) {
  return clamp(Math.round((Number(value) || 0) * 100), 0, 99);
}

function computePairAge(rolls, trustedPair) {
  if (!Array.isArray(rolls) || rolls.length === 0 || !Array.isArray(trustedPair) || trustedPair.length !== 2) {
    return 0;
  }

  let age = 0;
  for (let i = rolls.length - 1; i >= 0; i -= 1) {
    if (!trustedPair.includes(rolls[i])) break;
    age += 1;
  }
  return age;
}

function inferBoardState(raw, rolls, pairAge) {
  const totalRolls = rolls.length;
  const noiseRisk = Number(raw?.noiseRisk || 0);
  const pairSafety = raw?.pairSafety || 'warming';
  const flipConfidence = Number(raw?.flipConfidence || 0);
  const pairScoreGap = Number.isFinite(Number(raw?.pairScoreGap)) ? Number(raw.pairScoreGap) : 0;
  const hasFreshOutsider = Boolean(raw?.freshOutsider?.value);
  const analyzerSplit = Boolean(
    raw?.analyzerPrediction &&
      Array.isArray(raw?.trustedPair) &&
      raw.trustedPair.length === 2 &&
      !raw.trustedPair.includes(raw.analyzerPrediction)
  );

  if (raw?.isSessionReset || (raw?.isChaotic && raw?.isFlat)) return 'flat-no-edge';
  if (raw?.regime === 'noise-burst') return 'noise-burst';
  if (raw?.regime === 'transition' || (raw?.commonsFlipDetected && flipConfidence >= 85)) return 'transition';

  if (
    hasFreshOutsider &&
    (
      raw?.mixedWindow ||
      analyzerSplit ||
      pairSafety === 'danger' ||
      noiseRisk >= 45 ||
      pairScoreGap <= 8
    )
  ) {
    return 'transition-watch';
  }

  if (totalRolls < 8) return 'early-session';

  if (
    pairSafety === 'caution' ||
    pairAge < 5 ||
    raw?.mixedWindow ||
    noiseRisk >= 50
  ) {
    return 'degraded-stable';
  }

  return 'stable';
}

function deriveLeadingModel(raw, boardState) {
  const trustedPair = Array.isArray(raw?.trustedPair) ? raw.trustedPair : [];
  const analyzerPrediction = raw?.analyzerPrediction || null;
  const analyzerLeadsOutsider = raw?.freshOutsider?.value && analyzerPrediction === raw.freshOutsider.value;
  const analyzerSplitsFromLane = analyzerPrediction && trustedPair.length === 2 && !trustedPair.includes(analyzerPrediction);

  if (
    analyzerPrediction &&
    (
      boardState === 'transition' ||
      boardState === 'transition-watch' ||
      boardState === 'noise-burst' ||
      raw?.pairSafety === 'danger' ||
      analyzerLeadsOutsider ||
      analyzerSplitsFromLane
    )
  ) {
    return 'break-risk';
  }

  return 'lane-memory';
}

function deriveActionConfidence(raw, boardState, pairAge) {
  let score = toPct(raw?.confidence);
  const noiseRisk = Number(raw?.noiseRisk || 0);
  const pairSafety = raw?.pairSafety || 'warming';

  switch (boardState) {
    case 'flat-no-edge':
      score = Math.min(score - 28, 18);
      break;
    case 'noise-burst':
      score = Math.min(score - 22, 24);
      break;
    case 'transition':
      score = Math.min(score - 16, 36);
      break;
    case 'transition-watch':
      score = Math.min(score - 12, 46);
      break;
    case 'degraded-stable':
      score = Math.min(score - 8, 52);
      break;
    case 'early-session':
      score = Math.min(score - 10, 38);
      break;
    default:
      break;
  }

  if (pairSafety === 'danger') score = Math.min(score, 34);
  else if (pairSafety === 'caution') score = Math.min(score, 56);

  if (noiseRisk >= 65) score = Math.min(score, 34);
  if (pairAge > 0 && pairAge < 5) score = Math.min(score, 46);

  return clamp(score, 0, 95);
}

function derivePermission(boardState, actionConfidence) {
  if (NON_ACTIONABLE_STATES.has(boardState)) return 'STAND BY';
  if (boardState === 'transition') return 'WAIT';
  if (boardState === 'degraded-stable') return 'WAIT';
  if (boardState === 'early-session') return 'WAIT';
  if (boardState === 'transition-watch') {
    return actionConfidence >= 58 ? 'CLICK' : 'WAIT';
  }
  return actionConfidence >= 55 ? 'CLICK' : 'WAIT';
}

function derivePrimaryReason(boardState, leadingModel, raw) {
  const outsider = raw?.freshOutsider?.value;
  switch (boardState) {
    case 'flat-no-edge':
      return 'Board is flat or reset. Skip this window.';
    case 'noise-burst':
      return outsider
        ? `${outsider} is overpowering the lane.`
        : 'Recent noise is overpowering the lane.';
    case 'transition':
      return 'Commons are already shifting. Treat old lane memory as stale.';
    case 'transition-watch':
      return leadingModel === 'break-risk'
        ? 'Short window is diverging and break pressure is leading.'
        : 'Short window is diverging. Lane memory is still alive, but weaker.';
    case 'degraded-stable':
      return 'Board is readable, but not clean enough for a free click.';
    case 'early-session':
      return 'Need more pair history before trusting the lane.';
    default:
      return leadingModel === 'break-risk'
        ? 'Break pressure and lane memory still overlap, but pressure leads.'
        : 'Trusted pair is still leading the board.';
  }
}

function deriveRecoveryCue(boardState, raw, pairAge) {
  switch (boardState) {
    case 'flat-no-edge':
      return 'Wait 5-8 rolls for structure to return.';
    case 'noise-burst':
      return 'Wait for noise pressure to cool and a dominant pair to reform.';
    case 'transition':
      return 'Wait 3 rolls to confirm the new pair before acting.';
    case 'transition-watch':
      return 'Wait for the short window to settle or the flip to confirm.';
    case 'degraded-stable':
      return 'Wait for 3 steadier rolls or noise risk below the caution band.';
    case 'early-session':
      if (pairAge > 0) return 'Wait until the pair holds for 5 rolls and the session reaches 8 rolls total.';
      return 'Feed a few more rolls until a pair starts holding.';
    default:
      return null;
  }
}

function formatBoardState(boardState) {
  return boardState
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function buildPermissionView(raw, rolls = []) {
  if (!raw || !Array.isArray(rolls)) {
    return {
      boardState: 'early-session',
      boardStateLabel: 'Early Session',
      pairAge: 0,
      leadingModel: 'lane-memory',
      leadingPrediction: null,
      altPrediction: null,
      altLabel: null,
      actionConfidence: 0,
      permission: 'WAIT',
      primaryReason: 'Need more pair history before trusting the lane.',
      recoveryCue: 'Feed a few more rolls until the board becomes readable.',
    };
  }

  const trustedPair = Array.isArray(raw.trustedPair) ? raw.trustedPair : [];
  const pairAge = computePairAge(rolls, trustedPair);
  const boardState = inferBoardState(raw, rolls, pairAge);
  const leadingModel = deriveLeadingModel(raw, boardState);
  const leadingPrediction =
    leadingModel === 'break-risk'
      ? raw.analyzerPrediction || raw.freshOutsider?.value || raw.prediction || null
      : raw.prediction || raw.analyzerPrediction || null;
  const altPrediction =
    leadingModel === 'break-risk'
      ? raw.prediction || null
      : raw.analyzerPrediction || null;
  const altLabel = altPrediction ? (leadingModel === 'break-risk' ? 'lane-memory' : 'break-risk') : null;
  const actionConfidence = deriveActionConfidence(raw, boardState, pairAge);
  const permission = derivePermission(boardState, actionConfidence);
  const primaryReason = derivePrimaryReason(boardState, leadingModel, raw);
  const recoveryCue = permission === 'CLICK' ? null : deriveRecoveryCue(boardState, raw, pairAge);

  return {
    boardState,
    boardStateLabel: formatBoardState(boardState),
    pairAge,
    leadingModel,
    leadingPrediction,
    altPrediction,
    altLabel,
    actionConfidence,
    permission,
    primaryReason,
    recoveryCue,
  };
}

