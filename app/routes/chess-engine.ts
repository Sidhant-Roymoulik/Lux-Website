import { json } from "@remix-run/node";
import { spawn, ChildProcess } from "child_process";

let engineProcess: ChildProcess | null = null;

function startEngine() {
  let uciEnginePath: string = "engine/Lux-bmi2";

  if (process.env.NODE_ENV !== "production") {
    uciEnginePath = "app/engine/Lux-bmi2.exe";
  }

  engineProcess = spawn(uciEnginePath);

  engineProcess.stdin?.write("uci\n"); // Initialize UCI mode

  // Log the output for debugging
  // engineProcess.stdout?.on("data", (data) => {
  //   console.log(`${data.toString().trim()}`);
  // });

  // engineProcess.stderr?.on("data", (data) => {
  //   console.error(`${data.toString().trim()}`);
  // });

  // engineProcess.on("close", (code) => {
  //   console.log(`Engine process exited with code ${code}`);
  //   engineProcess = null;
  // });
}

function stopEngine() {
  if (engineProcess) {
    engineProcess.kill();
    engineProcess = null;
  }
}

export const action = async ({ request }: { request: Request }) => {
  const { position } = await request.json();

  try {
    if (!engineProcess) {
      startEngine();
    }

    let engineOutput = "";

    const onData = (data: Buffer) => {
      engineOutput += data.toString();
    };

    engineProcess?.stdout?.on("data", onData);

    engineProcess?.stdin?.write(`position fen ${position}\n`);
    engineProcess?.stdin?.write("go movetime 200\n");

    await new Promise<void>((resolve, reject) => {
      const checkForBestMove = () => {
        if (engineOutput.includes("bestmove")) {
          engineProcess?.stdout?.off("data", onData); // Remove listener after processing
          engineProcess?.stdout?.off("data", checkForBestMove); // Remove listener after processing

          resolve();
        }
      };

      if (engineProcess && engineProcess.stdout) {
        engineProcess.stdout.on("data", checkForBestMove);
      } else {
        reject(new Error("Engine process not available or no stdout."));
      }
    });

    const { engineMove, score } = parseEngineOutput(engineOutput);

    return json({ engineMove, score });

  } catch (error) {
    return json({ error: (error as Error).message }, { status: 500 });
  }
};

function parseEngineOutput(output: string): { engineMove: string, score: number } {
  const scoreRegex = /score\s(cp|mate)\s(-?\d+)/g;
  const moveMatch = output.match(/bestmove\s(\w+)/);
  const scoreMatches = [...output.matchAll(scoreRegex)];

  let score = 0;

  const scoreMatch = scoreMatches[scoreMatches.length - 1];

  if (scoreMatch) {
    const [_, type, value] = scoreMatch;
    if (type === "cp") {
      score = Number(value);
    } else if (type === "mate") {
      score = 300000 + Number(value);
    }
  }

  return {
    engineMove: moveMatch ? moveMatch[1] : "",
    score,
  };
}

// Ensure the engine is stopped when the process exits
process.on("exit", stopEngine);
