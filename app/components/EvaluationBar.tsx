import React from "react";

interface EvaluationBarProps {
  evaluation: number;
  depth?: number;
}

// evaluation is always from white's perspective:
//   positive  → white is winning
//   negative  → black is winning
//   > 300000  → white has mate in (evaluation - 300000)
//   < -300000 → black has mate in ((-evaluation) - 300000)

const EvaluationBar: React.FC<EvaluationBarProps> = ({ evaluation, depth }) => {
  const getIndicatorPosition = () => {
    const normalized = Math.min(Math.max(evaluation, -500), 500);
    return `${((normalized + 500) / 1000) * 100}%`;
  };

  const getEvalText = () => {
    if (evaluation > 100000) {
      const distance = evaluation - 300000;
      return `White mates in ${distance}`;
    }
    if (evaluation < -100000) {
      const distance = (-evaluation) - 300000;
      return `Black mates in ${distance}`;
    }
    const val = (evaluation / 100).toFixed(2);
    return Number(val) > 0 ? `+${val}` : val;
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-gray-700">{getEvalText()}</span>
        {typeof depth === "number" && depth > 0 && (
          <span className="text-xs text-gray-400">depth {depth}</span>
        )}
      </div>
      <div className="h-2.5 w-full rounded-full bg-gray-900 overflow-hidden relative border border-gray-200">
        <div
          className="absolute inset-y-0 left-0 bg-white transition-all duration-500 ease-out"
          style={{ width: getIndicatorPosition() }}
        />
      </div>
    </div>
  );
};

export default EvaluationBar;
