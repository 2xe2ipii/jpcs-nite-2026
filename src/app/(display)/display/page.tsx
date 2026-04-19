"use client";

import { useEffect, useRef, useState } from "react";
import { useRoundState, type RoundState } from "@/lib/hooks/use-round-state";
import { useTableScores } from "@/lib/hooks/use-table-scores";
import type { TableScoreResponse } from "@/lib/types/realtime";

// ---------------------------------------------------------------------------
// Stars — deterministic positions to avoid hydration mismatches
// ---------------------------------------------------------------------------

const STARS = Array.from({ length: 90 }, (_, i) => ({
  id: i,
  left: `${((i * 137.508 + 23) % 100).toFixed(1)}%`,
  top: `${((i * 97.333 + 11) % 100).toFixed(1)}%`,
  size: i % 5 === 0 ? 2 : 1,
  opacity: +(0.1 + (i % 8) * 0.05).toFixed(2),
}));

// ---------------------------------------------------------------------------
// Preview / dev tool
// ---------------------------------------------------------------------------

type PreviewRound = Pick<
  RoundState,
  "status" | "first_buzz_table_name" | "eliminated_table_names"
>;

const PREVIEW_STEPS: Array<{ label: string; round: PreviewRound }> = [
  {
    label: "Scoreboard (IDLE)",
    round: { status: "idle", first_buzz_table_name: null, eliminated_table_names: [] },
  },
  {
    label: "Buzzer Opened",
    round: { status: "buzzer_active", first_buzz_table_name: null, eliminated_table_names: [] },
  },
  {
    label: "Buzz Received",
    round: { status: "buzz_received", first_buzz_table_name: "Table 3", eliminated_table_names: [] },
  },
  {
    label: "Steal Round",
    round: { status: "steal_active", first_buzz_table_name: null, eliminated_table_names: ["Table 3"] },
  },
  {
    label: "Steal Buzz",
    round: { status: "buzz_received", first_buzz_table_name: "Table 7", eliminated_table_names: ["Table 3"] },
  },
  {
    label: "Round Resolved",
    round: { status: "resolved", first_buzz_table_name: null, eliminated_table_names: [] },
  },
  {
    label: "Round Aborted",
    round: { status: "aborted", first_buzz_table_name: null, eliminated_table_names: [] },
  },
];

const MOCK_SCORES: TableScoreResponse[] = [
  { id: "p1", display_name: "Table 1", table_number: 1, is_active: true, current_score: 340 },
  { id: "p2", display_name: "Table 2", table_number: 2, is_active: true, current_score: 280 },
  { id: "p3", display_name: "Table 3", table_number: 3, is_active: true, current_score: 255 },
  { id: "p4", display_name: "Table 4", table_number: 4, is_active: true, current_score: 190 },
  { id: "p5", display_name: "Table 5", table_number: 5, is_active: true, current_score: 160 },
  { id: "p6", display_name: "Table 6", table_number: 6, is_active: true, current_score: 120 },
  { id: "p7", display_name: "Table 7", table_number: 7, is_active: true, current_score: 85 },
  { id: "p8", display_name: "Table 8", table_number: 8, is_active: true, current_score: 40 },
];

const OVERLAY_STATUSES = new Set(["buzzer_active", "buzz_received", "steal_active", "resolved"]);
const LIVE_ACTIVE_STATUSES = new Set(["buzzer_active", "buzz_received", "steal_active", "resolved"]);

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DisplayPage() {
  const round = useRoundState();
  const { scores } = useTableScores();
  const [liveOverlayVisible, setLiveOverlayVisible] = useState(false);
  const hydratedRef = useRef(false);
  const [previewIdx, setPreviewIdx] = useState(0);

  // Drive live overlay visibility from realtime events
  useEffect(() => {
    if (round.loading) return;

    if (!hydratedRef.current) {
      hydratedRef.current = true;
      // On hydration, show overlay only if actively in progress (not already resolved)
      if (OVERLAY_STATUSES.has(round.status) && round.status !== "resolved") {
        setLiveOverlayVisible(true);
      }
      return;
    }

    if (round.status === "idle" || round.status === "aborted") {
      setLiveOverlayVisible(false);
      return;
    }

    if (round.status === "resolved") {
      setLiveOverlayVisible(true);
      const t = setTimeout(() => setLiveOverlayVisible(false), 4500);
      return () => clearTimeout(t);
    }

    setLiveOverlayVisible(true);
  }, [round.status, round.loading]);

  const activeScores = scores.filter((t) => t.is_active);
  const displayScores = activeScores.length > 0 ? activeScores : MOCK_SCORES;

  // Live round takes over the display when an actual round is in progress
  const isLiveActive = !round.loading && LIVE_ACTIVE_STATUSES.has(round.status);

  const effectiveRound: PreviewRound = isLiveActive
    ? {
        status: round.status,
        first_buzz_table_name: round.first_buzz_table_name,
        eliminated_table_names: round.eliminated_table_names,
      }
    : PREVIEW_STEPS[previewIdx].round;

  const showOverlay = isLiveActive
    ? liveOverlayVisible
    : OVERLAY_STATUSES.has(PREVIEW_STEPS[previewIdx].round.status);

  return (
    <div className="relative h-full w-full bg-night overflow-hidden select-none">
      {/* Star field */}
      <div className="absolute inset-0 z-0 pointer-events-none" aria-hidden>
        {STARS.map((s) => (
          <span
            key={s.id}
            className="absolute rounded-full bg-white"
            style={{ left: s.left, top: s.top, width: s.size, height: s.size, opacity: s.opacity }}
          />
        ))}
      </div>

      {/* Top-right watermark */}
      <p className="absolute top-4 right-5 z-10 font-sans text-white/20 text-[0.6rem] tracking-[0.35em] uppercase pointer-events-none">
        JPCS NITE 2026
      </p>

      {/* Scoreboard — always present, blurs behind overlay */}
      <div
        className={`relative z-10 flex flex-col h-full transition-all duration-700 ease-in-out ${
          showOverlay ? "opacity-15 blur-[1px]" : "opacity-100"
        }`}
      >
        <ScoreboardHeader />
        <ScoreList scores={displayScores} />
      </div>

      {/* Buzzer overlay */}
      <div
        className={`absolute inset-0 z-20 flex items-center justify-center transition-opacity duration-500 ${
          showOverlay ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <BuzzerCircle round={effectiveRound} />
      </div>

      {/* Dev preview nav */}
      <PreviewNav
        previewIdx={previewIdx}
        setPreviewIdx={setPreviewIdx}
        isLiveActive={isLiveActive}
        liveStatus={round.status}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Scoreboard
// ---------------------------------------------------------------------------

function ScoreboardHeader() {
  return (
    <header className="flex-shrink-0 pt-10 pb-4 text-center">
      <p className="font-sans text-gold/50 text-[0.7rem] tracking-[0.4em] uppercase">
        JPCS NITE 2026 · NIGHTSKY OF GOLDEN DREAMS
      </p>
      <h1 className="font-script text-white text-6xl font-bold tracking-wider mt-2">
        LEADERBOARD
      </h1>
      <div className="mt-4 mx-auto flex items-center gap-4 w-72">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent to-gold/25" />
        <div className="w-1 h-1 rounded-full bg-gold/40" />
        <div className="flex-1 h-px bg-gradient-to-l from-transparent to-gold/25" />
      </div>
    </header>
  );
}

function ScoreList({ scores }: { scores: TableScoreResponse[] }) {
  const maxScore = Math.max(...scores.map((s) => s.current_score), 1);

  if (scores.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="font-sans text-white/15 text-xl tracking-[0.6em] uppercase">STANDBY</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-10 pb-16 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex flex-col gap-2.5 min-h-full justify-center py-2">
        {scores.map((table, i) => (
          <ScoreRow key={table.id} table={table} rank={i + 1} maxScore={maxScore} />
        ))}
      </div>
    </div>
  );
}

const MEDALS = ["🥇", "🥈", "🥉"];

function ScoreRow({
  table,
  rank,
  maxScore,
}: {
  table: TableScoreResponse;
  rank: number;
  maxScore: number;
}) {
  const isTop3 = rank <= 3;
  const barWidth = maxScore > 0 ? (table.current_score / maxScore) * 100 : 0;
  const medal = MEDALS[rank - 1];

  return (
    <div
      className={`flex items-center gap-4 px-5 py-3.5 rounded-xl border transition-all duration-500 ${
        isTop3
          ? "bg-white/[0.04] border-white/10"
          : "bg-white/[0.02] border-white/[0.04]"
      }`}
    >
      {/* Medal / rank */}
      <div className="w-9 flex-shrink-0 flex items-center justify-center">
        {medal ? (
          <span className="text-2xl leading-none">{medal}</span>
        ) : (
          <span className="font-sans text-white/25 text-base font-medium tabular-nums">{rank}</span>
        )}
      </div>

      {/* Table name */}
      <span
        className={`font-heading font-semibold text-xl flex-shrink-0 w-28 ${
          isTop3 ? "text-white" : "text-white/55"
        }`}
        style={{ fontVariant: "small-caps" }}
      >
        {table.display_name}
      </span>

      {/* Progress bar */}
      <div className="flex-1 mx-1">
        <div className="h-2.5 rounded-full bg-white/[0.05] overflow-hidden">
          <div
            className="h-full rounded-full bg-gold transition-all duration-700 ease-out"
            style={{ width: `${barWidth}%` }}
          />
        </div>
      </div>

      {/* Score */}
      <span
        className={`font-script font-bold text-2xl tabular-nums flex-shrink-0 w-16 text-right ${
          isTop3 ? "text-gold" : "text-white/35"
        }`}
      >
        {table.current_score}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Buzzer circle overlay
// ---------------------------------------------------------------------------

function BuzzerCircle({ round }: { round: PreviewRound }) {
  const borderColor =
    round.status === "steal_active"
      ? "border-red-500/35"
      : round.status === "resolved"
      ? "border-emerald-500/35"
      : "border-gold/25";

  return (
    <div
      className={`w-[430px] h-[430px] rounded-full border flex flex-col items-center justify-center text-center px-12 transition-colors duration-500 ${borderColor}`}
    >
      <BuzzerCircleContent round={round} />
    </div>
  );
}

function BuzzerCircleContent({ round }: { round: PreviewRound }) {
  switch (round.status) {
    case "buzzer_active":
      return (
        <>
          <h2 className="font-heading text-gold font-bold italic leading-tight text-5xl">
            Who Will Buzz First?
          </h2>
          <p className="font-heading text-white/65 text-2xl italic mt-4">
            Tables — get ready!
          </p>
        </>
      );

    case "buzz_received":
      return (
        <>
          <h2
            className="font-script text-gold font-bold leading-none"
            style={{ fontSize: "clamp(2.5rem, 5.5vw, 4.5rem)" }}
          >
            {round.first_buzz_table_name ?? "—"}
          </h2>
          <p className="font-sans text-white/75 text-sm tracking-[0.3em] uppercase mt-5">
            Buzzed First!
          </p>
        </>
      );

    case "steal_active": {
      const lastEliminated =
        round.eliminated_table_names[round.eliminated_table_names.length - 1];
      return (
        <>
          <h2 className="font-script text-red-400 font-bold text-[2.8rem] leading-tight">
            Steal Round
          </h2>
          <p className="font-heading text-white/65 text-xl italic mt-3">
            {lastEliminated
              ? `${lastEliminated} eliminated — who's next?`
              : "Who's next?"}
          </p>
          {round.eliminated_table_names.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              {round.eliminated_table_names.map((name) => (
                <span
                  key={name}
                  className="flex items-center gap-1.5 px-3.5 py-1 rounded-full border border-red-500/40 text-red-400/80 font-sans text-sm"
                  style={{ fontVariant: "small-caps" }}
                >
                  × {name}
                </span>
              ))}
            </div>
          )}
        </>
      );
    }

    case "resolved":
      return (
        <>
          <h2 className="font-script text-emerald-400 font-bold text-[2.8rem] leading-tight">
            Round Complete
          </h2>
          <p className="font-heading text-white/60 text-xl italic mt-3">
            Back to scoreboard shortly...
          </p>
        </>
      );

    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Preview nav (dev tool)
// ---------------------------------------------------------------------------

function PreviewNav({
  previewIdx,
  setPreviewIdx,
  isLiveActive,
  liveStatus,
}: {
  previewIdx: number;
  setPreviewIdx: React.Dispatch<React.SetStateAction<number>>;
  isLiveActive: boolean;
  liveStatus: string;
}) {
  const label = isLiveActive
    ? liveStatus.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : PREVIEW_STEPS[previewIdx].label;

  const stepStr = isLiveActive
    ? "LIVE"
    : `${previewIdx + 1}/${PREVIEW_STEPS.length}`;

  return (
    <div className="absolute bottom-5 left-0 right-0 z-30 flex justify-center">
      <div className="flex items-center gap-3 px-5 py-2.5 rounded-full bg-[#0d1525]/80 border border-white/10 backdrop-blur-sm">
        <button
          onClick={() =>
            setPreviewIdx((i) => (i - 1 + PREVIEW_STEPS.length) % PREVIEW_STEPS.length)
          }
          className="text-white/35 hover:text-white/70 text-sm w-4 text-center transition-colors"
        >
          ←
        </button>
        <span className="font-sans text-white/45 text-[0.6rem] tracking-[0.2em] uppercase whitespace-nowrap min-w-44 text-center">
          {label} ({stepStr})
        </span>
        <button
          onClick={() => setPreviewIdx((i) => (i + 1) % PREVIEW_STEPS.length)}
          className="text-white/35 hover:text-white/70 text-sm w-4 text-center transition-colors"
        >
          →
        </button>
      </div>
    </div>
  );
}
