import { json } from "@remix-run/node";
import { spawn, ChildProcess } from "child_process";

let engineProcess: ChildProcess | null = null;
let engineReadyPromise: Promise<void> | null = null;
let engineMutex: Promise<unknown> = Promise.resolve();

function getEnginePath(): string {
  return process.env.NODE_ENV !== "production"
    ? "app/engine/Lux-bmi2.exe"
    : "engine/Lux-bmi2";
}

function startEngine(): void {
  engineProcess = spawn(getEnginePath());
  engineProcess.on("exit", () => {
    engineProcess = null;
    engineReadyPromise = null;
  });

  engineReadyPromise = new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("Engine UCI init timeout")),
      5000,
    );

    const onData = (data: Buffer) => {
      if (data.toString().includes("uciok")) {
        clearTimeout(timeout);
        engineProcess?.stdout?.off("data", onData);
        resolve();
      }
    };

    engineProcess!.on("error", (err) => {
      clearTimeout(timeout);
      engineProcess = null;
      engineReadyPromise = null;
      reject(new Error(`Engine spawn failed: ${err.message}`));
    });

    engineProcess!.stdout!.on("data", onData);
    engineProcess!.stdin!.write("uci\n");
  });
}

function stopEngine(): void {
  if (engineProcess) {
    engineProcess.kill();
    engineProcess = null;
    engineReadyPromise = null;
  }
}

async function runSearch(
  position: string,
): Promise<{ engineMove: string; score: number; depth: number }> {
  await engineReadyPromise;

  return new Promise((resolve, reject) => {
    let output = "";

    const timeout = setTimeout(() => {
      engineProcess?.stdout?.off("data", onData);
      reject(new Error("Engine search timeout"));
    }, 5000);

    const onData = (data: Buffer) => {
      output += data.toString();
      if (output.includes("bestmove")) {
        clearTimeout(timeout);
        engineProcess?.stdout?.off("data", onData);
        resolve(parseEngineOutput(output));
      }
    };

    if (!engineProcess?.stdout) {
      reject(new Error("Engine process not available"));
      return;
    }

    engineProcess.stdout.on("data", onData);
    engineProcess.stdin!.write(`position fen ${position}\n`);
    engineProcess.stdin!.write("go movetime 200\n");
  });
}

export const action = async ({ request }: { request: Request }) => {
  const { position } = await request.json();

  try {
    if (!engineProcess) startEngine();

    const result = await (engineMutex = engineMutex.then(
      () => runSearch(position),
      () => runSearch(position),
    ));

    return json(result);
  } catch (error) {
    return json({ error: (error as Error).message }, { status: 500 });
  }
};

function parseEngineOutput(output: string): {
  engineMove: string;
  score: number;
  depth: number;
} {
  const scoreRegex = /score\s(cp|mate)\s(-?\d+)/g;
  const depthRegex = /depth\s(\d+)/g;

  const moveMatch = output.match(/bestmove\s(\w+)/);
  const scoreMatches = [...output.matchAll(scoreRegex)];
  const depthMatches = [...output.matchAll(depthRegex)];

  let score = 0;
  let depth = 0;

  const scoreMatch = scoreMatches[scoreMatches.length - 1];
  if (scoreMatch) {
    const [, type, value] = scoreMatch;
    if (type === "cp") {
      score = Number(value);
    } else if (type === "mate") {
      score = 300000 + Number(value);
    }
  }

  if (depthMatches.length > 0) {
    depth = Number(depthMatches[depthMatches.length - 1][1]);
  }

  return {
    engineMove: moveMatch ? moveMatch[1] : "",
    score,
    depth,
  };
}

process.on("exit", stopEngine);
process.on("SIGTERM", stopEngine);
process.on("SIGINT", stopEngine);
