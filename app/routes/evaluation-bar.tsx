import React from "react";

interface EvaluationBarProps {
  evaluation: number; // The evaluation score from the engine
}

const EvaluationBar: React.FC<EvaluationBarProps> = ({ evaluation }) => {

  // Get indicator position
  const getIndicatorPosition = () => {
    const normalized = Math.min(Math.max(evaluation, -500), 500);
    const position = 100 - ((normalized + 500) / 1000) * 100;
    return `${position}%`;
  };

  const getEvalText = () => {
    if (evaluation > 100000) {
      const mate = evaluation - 300000;
      return mate < 0 ? "White" : "Black" + ` has Mate in ${Math.abs(mate)}`
    }

    return evaluation > 0 ? `${-evaluation / 100}` : `${-evaluation / 100}`
  };

  return (
    <div className="evaluation-bar-container">
      <div className="evaluation-text">
        {getEvalText()}
      </div>

      <div className="evaluation-bar">
        <div
          className="evaluation-bar-fill"
          style={{
            backgroundColor: "#ffffff",
            width: getIndicatorPosition(),
          }}
        />
        <div
          className="evaluation-bar-indicator"
          style={{ left: getIndicatorPosition() }}
        />
      </div>
    </div>
  );
};

export default EvaluationBar;
