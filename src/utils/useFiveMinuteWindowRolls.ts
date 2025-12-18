import { useEffect, useMemo, useState } from "react";

export type RollEvent = { roll: string; ts: number };

export function useFiveMinuteWindowRolls(
  rollEvents: RollEvent[] = [],
  warmupMinRolls = 3
) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  // ✅ this is what makes the countdown/progress move
  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 500);
    return () => window.clearInterval(id);
  }, []);

  const windowInfo = useMemo(() => {
    const d = new Date(nowMs);

    // ✅ wall-clock 5-min bucket (00/05/10/15/...)
    const start = new Date(d);
    start.setSeconds(0, 0);
    start.setMinutes(Math.floor(d.getMinutes() / 5) * 5);

    const end = new Date(start);
    end.setMinutes(end.getMinutes() + 5);

    const startMs = start.getTime();
    const endMs = end.getTime();

    const secondsRemaining = Math.max(0, Math.ceil((endMs - nowMs) / 1000));
    const progress = Math.min(1, Math.max(0, (nowMs - startMs) / (endMs - startMs)));

    // ✅ count ONLY rolls that have ts inside this window AND have 3+ digits
    const rollsInWindow = rollEvents.reduce((acc, e) => {
      const r = String(e?.roll ?? "").trim();
      const ts = Number(e?.ts ?? 0);
      if (r.length < 3) return acc;
      if (ts >= startMs && ts < endMs) return acc + 1;
      return acc;
    }, 0);

    const warmupRemaining = Math.max(0, warmupMinRolls - rollsInWindow);

    return { startMs, endMs, secondsRemaining, progress, rollsInWindow, warmupRemaining, warmupMinRolls };
  }, [nowMs, rollEvents, warmupMinRolls]);

  return { windowInfo };
}
