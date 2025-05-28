import React from "react";

interface EvaluationBarProps {
  evaluation: number;
  depth?: number; // Add depth prop
}

const EvaluationBar: React.FC<EvaluationBarProps> = ({ evaluation, depth }) => {

  // Get indicator position
  const getIndicatorPosition = () => {
    const normalized = Math.min(Math.max(evaluation, -500), 500);
    const position = 100 - ((normalized + 500) / 1000) * 100;
    return `${position}%`;
  };

  const getEvalText = () => {
    if (Math.abs(evaluation) > 100000) {
      const mate = 300000 - Math.abs(evaluation);
      return (mate < 0 ? "White" : "Black") + ` has Mate in ${Math.abs(mate)}`;
    }

    return -evaluation / 100;
  };

  return (
    <div className="evaluation-bar-container">
      <div className="evaluation-text">
        {getEvalText()}
        {typeof depth === "number" && depth > 0 && (
          <span style={{ marginLeft: 8, fontWeight: "normal", color: "#b0b0b0" }}>
            (Depth {depth})
          </span>
        )}
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
