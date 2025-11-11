import SessionTimerCard from "./SessionTimerCard";
import PredictionCard from "./PredictionCard";
import CaesarCard from "./CaesarCard";
import ModesInfo from "./ModesInfo";

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
      <PredictionCard entries={entries} />
      <CaesarCard caesarInput={caesarInput} setCaesarInput={setCaesarInput} />
      <ModesInfo />
    </div>
  );
}
