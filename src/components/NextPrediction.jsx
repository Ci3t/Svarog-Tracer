import React, { useMemo } from "react";
import PredictionCard from "./PredictionCard";
import { predictNext, predictNext3, predictNext4 } from "../utils/predictNext";

export default function NextPrediction({ entries, suggestTab, setSuggestTab }) {
  // sort oldest → newest
  const ordered = useMemo(
    () => [...entries].sort((a, b) => new Date(a.time) - new Date(b.time)),
    [entries]
  );

  // build each stream
  const rolls2 = ordered.map((e) => e.s2).filter((r) => r && r.length >= 2);
  const rolls3 = ordered.map((e) => e.s3).filter((r) => r && r.length >= 3);
  const rolls4 = ordered.map((e) => e.s4).filter((r) => r && r.length >= 4);

  // choose predictor based on tab
  const prediction = useMemo(() => {
    switch (suggestTab) {
      case "3":
        return predictNext3(rolls3);
      case "4":
        return predictNext4(rolls4);
      default:
        return predictNext(rolls2);
    }
  }, [suggestTab, rolls2, rolls3, rolls4]);

  return (
    <PredictionCard
      prediction={prediction}
      suggestTab={suggestTab}
      setSuggestTab={setSuggestTab}
    />
  );
}
