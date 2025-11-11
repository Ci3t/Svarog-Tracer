import SessionTimerCard from "./SessionTimerCard";
import PredictionCard from "./PredictionCard";
import CaesarCard from "./CaesarCard";
import ModesInfo from "./ModesInfo";
import NextPrediction from "./NextPrediction";

export default function LeftColumn({
  secondsLeft,
  onStart,
  prediction,
  suggestTab,
  setSuggestTab,
  caesarInput,
  setCaesarInput,
  entries,
}) {
  return (
    <div className="col-span-12 lg:col-span-3 space-y-6">
      <SessionTimerCard secondsLeft={secondsLeft} onStart={onStart} />
      <NextPrediction
        entries={entries}
        suggestTab={suggestTab}
        setSuggestTab={setSuggestTab}
      />
      <CaesarCard caesarInput={caesarInput} setCaesarInput={setCaesarInput} />

      <ModesInfo />
    </div>
  );
}
