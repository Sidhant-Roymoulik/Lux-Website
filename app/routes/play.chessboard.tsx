import { useState, useEffect, useContext } from "react";
import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";
import { MetaFunction, useOutletContext } from "@remix-run/react";

export const meta: MetaFunction = () => {
  return [
    { title: "Play Chess" },
  ];
};

export default function ChessBoard() {
  const [game, setGame] = useState(new Chess());
  const [gameOver, setGameOver] = useState(false);
  const [result, setResult] = useState("");
  const { onEvaluationChange } = useOutletContext<{ onEvaluationChange: (evaluation: number) => void }>();

  const handlePieceDrop = async (sourceSquare: string, targetSquare: string) => {
    if (gameOver) return;

    const move = game.move({
      from: sourceSquare,
      to: targetSquare,
      promotion: "q", // always promote to a queen for simplicity
    });

    if (move === null) return; // Invalid move

    if (game.isGameOver()) {
      handleGameOver();
      return;
    }

    setGame(new Chess(game.fen()));

    // Send the move to the backend
    const response = await fetch("/chess-engine", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        position: game.fen(),
      }),
    });

    const data = await response.json();

    if (data.error) {
      console.error("Error from UCI engine:", data.error);
      return;
    }

    game.move({
      from: data.engineMove.slice(0, 2),
      to: data.engineMove.slice(2, 4),
      promotion: data.engineMove.slice(4, 5),
    });

    if (game.isGameOver()) {
      handleGameOver();
    }

    setGame(new Chess(game.fen()));
    onEvaluationChange(data.score); // Notify the parent component of the new evaluation score
  };

  const handleGameOver = () => {
    setGameOver(true);

    if (game.isCheckmate()) {
      setResult(game.turn() === "w" ? "You Lost!" : "You Won!");
    } else if (game.isDraw()) {
      setResult("It's a Draw!");
    } else if (game.isStalemate()) {
      setResult("Stalemate!");
    } else if (game.isThreefoldRepetition()) {
      setResult("Threefold Repetition - Draw!");
    } else if (game.isInsufficientMaterial()) {
      setResult("Insufficient Material - Draw!");
    }
  };

  const handlePlayAgain = () => {
    setGame(new Chess());
    setGameOver(false);
    setResult("");
    onEvaluationChange(0); // Reset evaluation score
  };

  const getResultColor = () => {
    if (result.includes("Won")) return "green";
    if (result.includes("Lost")) return "red";
    return "yellow";
  };

  return (
    <div className="chessboard-wrapper">
      <div className={`chessboard ${gameOver ? "faded" : ""}`}>
        <Chessboard
          position={game.fen()}
          onPieceDrop={handlePieceDrop}
        />
      </div>
      {gameOver && (
        <div className="game-over-overlay" style={{ color: getResultColor() }}>
          <div className="game-over-message">{result}</div>
          <button onClick={handlePlayAgain} className="play-again-button">
            Play Again
          </button>
        </div>
      )}
    </div>
  );
}
