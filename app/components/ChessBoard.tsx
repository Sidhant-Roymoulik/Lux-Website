import { useState } from "react";
import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";

interface ChessBoardProps {
  onEvaluationChange: (evaluation: number, depth?: number) => void;
}

// Normalize a raw UCI score (from engine's perspective) to white's perspective.
// mateValue = rawScore - 300000; positive → engine has mate, negative → engine is mated.
// engineIsWhite: true when the engine is playing the white pieces.
function normalizeScore(rawScore: number, engineIsWhite: boolean): number {
  if (Math.abs(rawScore) > 100000) {
    const mateValue = rawScore - 300000;
    const engineHasMate = mateValue >= 0;
    const mateDistance = Math.abs(mateValue);
    // white has mate when: engine is white and has mate, OR engine is black and is being mated
    const whiteHasMate = engineHasMate === engineIsWhite;
    return whiteHasMate ? 300000 + mateDistance : -(300000 + mateDistance);
  }
  // Centipawn: UCI score is from engine's perspective. Negate for black engine to get white's POV.
  return engineIsWhite ? rawScore : -rawScore;
}

export default function ChessBoard({ onEvaluationChange }: ChessBoardProps) {
  const [game, setGame] = useState(new Chess());
  const [gameOver, setGameOver] = useState(false);
  const [result, setResult] = useState("");
  const [boardOrientation, setBoardOrientation] = useState<"white" | "black">("white");
  const [engineThinking, setEngineThinking] = useState(false);

  // Player controls the color matching their orientation.
  const playerTurnLetter = boardOrientation === "white" ? "w" : "b";

  const handlePieceDrop = (sourceSquare: string, targetSquare: string, piece: string) => {
    if (gameOver || engineThinking) return false;
    if (game.turn() !== playerTurnLetter) return false;

    const move = game.move({ from: sourceSquare, to: targetSquare, promotion: piece });
    if (move === null) return false;

    setGame(new Chess(game.fen()));
    // playerTurnLetter is stable here (orientation hasn't changed)
    triggerEngineMove(game, playerTurnLetter);
    return true;
  };

  // currentPlayerLetter must be passed explicitly because setBoardOrientation is async —
  // when called from handleFlip, boardOrientation state hasn't updated yet.
  const triggerEngineMove = async (currentGame: Chess, currentPlayerLetter: string) => {
    if (currentGame.isGameOver()) {
      resolveGameOver(currentGame, currentPlayerLetter);
      return;
    }

    setEngineThinking(true);
    try {
      const response = await fetch("/chess-engine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ position: currentGame.fen() }),
        signal: AbortSignal.timeout(10000),
      });
      const data = await response.json();

      if (data.error) {
        console.error("Engine error:", data.error);
        return;
      }

      currentGame.move({
        from: data.engineMove.slice(0, 2),
        to: data.engineMove.slice(2, 4),
        promotion: data.engineMove.slice(4, 5) || undefined,
      });

      if (currentGame.isGameOver()) resolveGameOver(currentGame, currentPlayerLetter);

      setGame(new Chess(currentGame.fen()));

      const engineIsWhite = currentPlayerLetter === "b";
      onEvaluationChange(normalizeScore(data.score, engineIsWhite), data.depth);
    } catch (err) {
      console.error("Failed to reach engine:", err);
    } finally {
      setEngineThinking(false);
    }
  };

  const resolveGameOver = (currentGame: Chess, currentPlayerLetter: string) => {
    setGameOver(true);
    // After checkmate, game.turn() is the side that was mated.
    if (currentGame.isCheckmate()) {
      setResult(currentGame.turn() === currentPlayerLetter ? "You Lost!" : "You Won!");
    } else if (currentGame.isStalemate()) {
      setResult("Stalemate — Draw");
    } else if (currentGame.isThreefoldRepetition()) {
      setResult("Threefold Repetition — Draw");
    } else if (currentGame.isInsufficientMaterial()) {
      setResult("Insufficient Material — Draw");
    } else if (currentGame.isDraw()) {
      setResult("Draw");
    }
  };

  const handleNewGame = (orientation = boardOrientation) => {
    const fresh = new Chess();
    setGame(fresh);
    setGameOver(false);
    setResult("");
    onEvaluationChange(0, 0);
    if (orientation === "black") {
      triggerEngineMove(fresh, "b");
    }
  };

  const handleFlip = () => {
    if (engineThinking) return;
    const next = boardOrientation === "white" ? "black" : "white";
    setBoardOrientation(next);
    const nextPlayerLetter = next === "white" ? "w" : "b";
    if (!gameOver && game.turn() !== nextPlayerLetter) {
      triggerEngineMove(game, nextPlayerLetter);
    }
  };

  const isDraggablePiece = ({ piece }: { piece: string }) => {
    if (gameOver || engineThinking) return false;
    return piece[0] === playerTurnLetter;
  };

  const getResultColor = () => {
    if (result.includes("Won")) return "#16a34a";
    if (result.includes("Lost")) return "#dc2626";
    return "#d97706";
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="chessboard-wrapper">
        <div className={`chessboard ${gameOver ? "faded" : ""}`}>
          <Chessboard
            position={game.fen()}
            onPieceDrop={handlePieceDrop}
            boardOrientation={boardOrientation}
            isDraggablePiece={isDraggablePiece}
          />
        </div>

        {gameOver && (
          <div className="game-over-overlay" style={{ color: getResultColor() }}>
            <div className="game-over-message">{result}</div>
            <button onClick={() => handleNewGame()} className="play-again-button">
              Play Again
            </button>
          </div>
        )}
      </div>

      <div className="flex gap-2 items-center">
        <button
          onClick={() => handleNewGame()}
          disabled={engineThinking}
          className="flex-1 py-2 px-4 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          New Game
        </button>
        <button
          onClick={handleFlip}
          disabled={engineThinking}
          className="flex-1 py-2 px-4 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Flip Board
        </button>
        {engineThinking && (
          <span className="text-xs text-gray-400 shrink-0">thinking…</span>
        )}
      </div>
    </div>
  );
}
