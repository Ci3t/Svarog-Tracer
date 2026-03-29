import { analyze2strWave } from "./kiyoPrefixWave";

export const TABLE_PAIRINGS = [
  {
    key: "41/44",
    name: "Outer/Inner",
    sideAName: "Outer",
    sideBName: "Inner",
    sideA: ["41", "44"],
    sideB: ["42", "43"],
  },
  {
    key: "42/44",
    name: "Odd/Even",
    sideAName: "Even",
    sideBName: "Odd",
    sideA: ["42", "44"],
    sideB: ["41", "43"],
  },
  {
    key: "43/44",
    name: "Low/High",
    sideAName: "High",
    sideBName: "Low",
    sideA: ["43", "44"],
    sideB: ["41", "42"],
  },
];

const Y_TO_KEY = { "12": "43/44", "13": "42/44", "14": "41/44" };
const TABLE_TO_WAVE = {
  "43/44": "Low/High",
  "42/44": "Odd/Even",
  "41/44": "Outer/Inner",
};

function toRecentTwoStrNewestFirst(sessionRolls) {
  return (sessionRolls || [])
    .slice(-12)
    .reverse()
    .map((roll) => String(roll).slice(0, 2))
    .filter((roll) => ["41", "42", "43", "44"].includes(roll));
}

function buildTableStats(recentRollsNewestFirst) {
  return TABLE_PAIRINGS.map((pairing) => {
    const aCount = recentRollsNewestFirst.filter((roll) => pairing.sideA.includes(roll)).length;
    const bCount = recentRollsNewestFirst.filter((roll) => pairing.sideB.includes(roll)).length;
    const total = aCount + bCount;
    const domPct = total > 0 ? Math.round((Math.max(aCount, bCount) / total) * 100) : 0;
    const dominantSide = aCount >= bCount ? "A" : "B";
    const domRolls = dominantSide === "A" ? pairing.sideA : pairing.sideB;
    const domLabel = domRolls.join("/");

    const sides = recentRollsNewestFirst.map((roll) =>
      pairing.sideA.includes(roll) ? "A" : pairing.sideB.includes(roll) ? "B" : null
    );
    const firstValid = sides.find((side) => side !== null);
    let streakLen = 0;
    if (firstValid) {
      for (const side of sides) {
        if (side === firstValid) streakLen++;
        else if (side !== null) break;
      }
    }

    const streakSide = firstValid;
    const streakRolls = streakSide === "A" ? pairing.sideA : streakSide === "B" ? pairing.sideB : null;
    const streakLabel = streakRolls ? streakRolls.join("/") : null;

    return {
      key: pairing.key,
      pairing,
      aCount,
      bCount,
      total,
      domPct,
      dominantSide,
      domRolls,
      domLabel,
      streakLen,
      streakSide,
      streakRolls,
      streakLabel,
    };
  });
}

export function getTablePreferredKey(sessionRolls) {
  const recentRollsNewestFirst = toRecentTwoStrNewestFirst(sessionRolls);
  if (recentRollsNewestFirst.length < 3) return null;

  const colStats = buildTableStats(recentRollsNewestFirst);
  const withStreak = colStats
    .filter((stat) => stat.streakLen >= 4)
    .sort((a, b) => b.streakLen - a.streakLen || b.domPct - a.domPct);
  const bestByDom = [...colStats].sort((a, b) => b.domPct - a.domPct)[0];
  return (withStreak[0] ?? bestByDom)?.key ?? null;
}

export function getWaveAndTableSignals(sessionRolls, prevPairingName = null) {
  const tablePreferredKey = getTablePreferredKey(sessionRolls);
  const waveSnapshot = analyze2strWave(
    sessionRolls,
    prevPairingName,
    tablePreferredKey ? TABLE_TO_WAVE[tablePreferredKey] : null
  );

  const recentRollsNewestFirst = toRecentTwoStrNewestFirst(sessionRolls);
  const colStats = buildTableStats(recentRollsNewestFirst);

  const waveKey = waveSnapshot?.pairing
    ? Y_TO_KEY[[...waveSnapshot.pairing.pairA].sort().join("")]
    : null;

  const withStreak = colStats
    .filter((stat) => stat.streakLen >= 4)
    .sort((a, b) => b.streakLen - a.streakLen || b.domPct - a.domPct);
  const bestByStreak = withStreak[0] ?? null;
  const bestByDom = [...colStats].sort((a, b) => b.domPct - a.domPct)[0] ?? null;
  const chosenStat = bestByStreak ?? bestByDom;
  const activeKey = chosenStat?.key ?? waveKey ?? null;
  const activePairing = TABLE_PAIRINGS.find((pairing) => pairing.key === activeKey) ?? null;
  const useStreakBet = Boolean(bestByStreak);
  const betRolls = chosenStat
    ? (useStreakBet ? chosenStat.streakRolls : chosenStat.domRolls)
    : null;
  const betLabel = chosenStat
    ? (useStreakBet ? chosenStat.streakLabel : chosenStat.domLabel)
    : null;

  return {
    waveSnapshot,
    table: {
      activeKey,
      activePairing,
      chosenStat,
      useStreakBet,
      betRolls,
      betLabel,
      recentRollsNewestFirst,
    },
  };
}
