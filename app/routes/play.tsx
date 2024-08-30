import { Link, Outlet } from "@remix-run/react";
import { useState } from "react";
import EvaluationBar from "./evaluation-bar"; // Import the EvaluationBar component

export default function Play() {
  const [evaluation, setEvaluation] = useState(0); // State for evaluation score

  const handleEvaluationChange = (newEvaluation: number) => {
    setEvaluation(newEvaluation);
  };

  return (
    <div className="play-container">
      <h1 className="title">Play Chess</h1>

      <div className="game-wrapper">
        <EvaluationBar evaluation={evaluation} /> {/* Add EvaluationBar component */}

        {/* Chessboard as a child route */}
        <section className="chessboard-container">
          <Outlet context={{ onEvaluationChange: handleEvaluationChange }} />
        </section>
      </div>

      <div className="back-link-container">
        <Link to="/" className="back-link">Back to Home</Link>
      </div>
    </div>
  );
}
