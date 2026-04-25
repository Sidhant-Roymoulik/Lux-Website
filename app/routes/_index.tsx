import React, { useState } from "react";
import { MetaFunction, useLoaderData } from "@remix-run/react";
import ChessBoard from "../components/ChessBoard";
import EvaluationBar from "../components/EvaluationBar";

export const meta: MetaFunction = () => [
  { title: "Lux Chess Engine" },
  { name: "description", content: "Play Lux, an open-source UCI chess engine, directly in your browser." },
];

const LINKS = {
  githubProfile: "https://github.com/Sidhant-Roymoulik",
  github: "https://github.com/Sidhant-Roymoulik/Lux",
  openbench: "https://lux-openbench.fly.dev",
  ccrl40: "https://www.computerchess.org.uk/ccrl/4040/cgi/compare_engines.cgi?family=Lux&print=Rating+list&print=Results+table&print=LOS+table&print=Ponder+hit+table&print=Eval+difference+table&print=Comopp+gamenum+table&print=Overlap+table&print=Score+with+common+opponents",
  ccrlBlitz: "https://www.computerchess.org.uk/ccrl/404/cgi/compare_engines.cgi?family=Lux&print=Rating+list&print=Results+table&print=LOS+table&print=Ponder+hit+table&print=Eval+difference+table&print=Comopp+gamenum+table&print=Overlap+table&print=Score+with+common+opponents",
};

const RATINGS: { label: string; href: string; desc: string }[] = [
  { label: "CCRL 40/15", href: LINKS.ccrl40, desc: "Classical time control" },
  { label: "CCRL Blitz", href: LINKS.ccrlBlitz, desc: "Blitz (2+1)" },
];

const ABOUT =
  "Lux is a bitboard-based UCI chess engine written in C++ by Sidhant Roymoulik. " +
  "It uses a tapered handcrafted evaluation function and negamax alpha-beta search with " +
  "LMR, null move pruning, reverse futility pruning, and a transposition table. " +
  "Play directly in the browser, or download the binary for any UCI-compatible chess GUI.";

// --- Server-side data fetching ---

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
let cache: { version: string; ccrlRating: string; ccrlBlitzRating: string; fetchedAt: number } | null = null;

async function fetchLatestVersion(): Promise<string> {
  const res = await fetch("https://api.github.com/repos/Sidhant-Roymoulik/Lux/releases/latest", {
    headers: { "User-Agent": "lux-website/1.0" },
    signal: AbortSignal.timeout(4000),
  });
  if (!res.ok) throw new Error(`GitHub API ${res.status}`);
  const data = (await res.json()) as { tag_name: string };
  return data.tag_name.replace(/^v/, "");
}

async function fetchCCRLRating(path: "4040" | "404"): Promise<string> {
  const res = await fetch(
    `https://www.computerchess.org.uk/ccrl/${path}/cgi/compare_engines.cgi?family=Lux&print=Rating+list`,
    {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; LuxWebsite/1.0)" },
      signal: AbortSignal.timeout(5000),
    }
  );
  if (!res.ok) throw new Error(`CCRL ${res.status}`);
  const html = await res.text();
  // CCRL renders ratings as: class="rating"><b>NNNN</b>
  // Rows are sorted descending, so the first match is the top-rated Lux version.
  const match = html.match(/class="rating"><b>(\d+)<\/b>/);
  if (!match) throw new Error("Could not parse CCRL rating");
  return match[1];
}

export async function loader() {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache;
  }

  const [versionResult, ccrl40Result, ccrlBlitzResult] = await Promise.allSettled([
    fetchLatestVersion(),
    fetchCCRLRating("4040"),
    fetchCCRLRating("404"),
  ]);

  cache = {
    version: versionResult.status === "fulfilled" ? versionResult.value : "—",
    ccrlRating: ccrl40Result.status === "fulfilled" ? ccrl40Result.value : "—",
    ccrlBlitzRating: ccrlBlitzResult.status === "fulfilled" ? ccrlBlitzResult.value : "—",
    fetchedAt: Date.now(),
  };

  return cache;
}

// --- Page component ---

export default function Index() {
  const { version, ccrlRating, ccrlBlitzRating } = useLoaderData<typeof loader>();
  const [evaluation, setEvaluation] = useState(0);
  const [depth, setDepth] = useState(0);

  const handleEvaluationChange = (newEval: number, newDepth?: number) => {
    setEvaluation(newEval);
    if (typeof newDepth === "number") setDepth(newDepth);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-20">
        <span className="font-bold text-lg text-gray-900 tracking-tight">Lux</span>
        <nav className="flex items-center gap-5">
          <NavLink href={LINKS.githubProfile}>Sidhant</NavLink>
          <NavLink href={LINKS.github}>Lux</NavLink>
        </nav>
      </header>

      {/* Main */}
      <main className="flex-1 px-4 py-8 flex items-start justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] gap-6 w-full max-w-5xl">

          {/* Left: chessboard + eval bar */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex flex-col gap-4">
            <ChessBoard onEvaluationChange={handleEvaluationChange} />
            <EvaluationBar evaluation={evaluation} depth={depth} />
          </div>

          {/* Right: info panel */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col gap-6 lg:sticky lg:top-[73px]">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 tracking-tight">Lux</h1>
              <p className="text-gray-500 mt-1 text-sm">UCI Chess Engine · C++</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-violet-100 text-violet-700">
                v{version}
              </span>
              <a
                href={LINKS.ccrl40}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-100 text-sky-700 hover:bg-sky-200 transition-colors"
              >
                {ccrlRating} CCRL 40/15
              </a>
              <a
                href={LINKS.ccrlBlitz}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors"
              >
                {ccrlBlitzRating} CCRL Blitz
              </a>
            </div>

            <hr className="border-gray-100" />

            <div className="flex flex-col gap-2">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">About</h2>
              <p className="text-gray-600 text-sm leading-relaxed">{ABOUT}</p>
            </div>

            <hr className="border-gray-100" />

            <div className="flex flex-col gap-1">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Links</h2>
              <ExternalLink href={LINKS.github} label="Repository" desc="Source code & releases" />
              <ExternalLink href={LINKS.openbench} label="OpenBench" desc="SPRT testing server" />
            </div>

            <hr className="border-gray-100" />

            <div className="flex flex-col gap-1">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Ratings</h2>
              {RATINGS.map(({ label, href, desc }) => (
                <ExternalLink key={label} href={href} label={label} desc={desc} />
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 px-6 py-4 text-center text-xs text-gray-400">
        Built by{" "}
        <a
          href="https://github.com/Sidhant-Roymoulik"
          className="hover:text-gray-600 transition-colors underline-offset-2 hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          Sidhant Roymoulik
        </a>
      </footer>
    </div>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
    >
      {children}
    </a>
  );
}

function ExternalLink({ href, label, desc }: { href: string; label: string; desc: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors group"
    >
      <div className="flex flex-col">
        <span className="text-sm font-medium text-gray-800 group-hover:text-violet-600 transition-colors">
          {label}
        </span>
        <span className="text-xs text-gray-400">{desc}</span>
      </div>
      <svg
        className="w-4 h-4 text-gray-300 group-hover:text-violet-400 transition-colors flex-shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
        />
      </svg>
    </a>
  );
}
