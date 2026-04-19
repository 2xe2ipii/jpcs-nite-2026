"use client";

import { useEffect, useRef, useState } from "react";
import { useRoundState, type RoundState } from "@/lib/hooks/use-round-state";
import { useTableScores } from "@/lib/hooks/use-table-scores";
import type { TableScoreResponse } from "@/lib/types/realtime";

// ---------------------------------------------------------------------------
// Stars — deterministic positions to avoid hydration mismatches
// ---------------------------------------------------------------------------

// Gold particles that burst outward on buzz_received (centered at 250,250 of 500px container)
const BURST_PARTICLES = Array.from({ length: 28 }, (_, i) => {
  const angle = (i / 28) * 360 + (i % 3) * 6;
  const dist = 190 + (i % 5) * 35; // 190–330px radius — bursts well outside 250px circle
  return {
    id: i,
    x: +(Math.cos((angle * Math.PI) / 180) * dist).toFixed(1),
    y: +(Math.sin((angle * Math.PI) / 180) * dist).toFixed(1),
    size: i % 4 === 0 ? 6 : i % 2 === 0 ? 4 : 2,
    delay: i * 16,
    duration: 900 + (i % 6) * 90,
  };
});

const STARS = Array.from({ length: 90 }, (_, i) => ({
  id: i,
  left: `${((i * 137.508 + 23) % 100).toFixed(1)}%`,
  top: `${((i * 97.333 + 11) % 100).toFixed(1)}%`,
  size: i % 5 === 0 ? 2 : 1,
  opacity: +(0.1 + (i % 8) * 0.05).toFixed(2),
}));

type DisplayRound = Pick<
  RoundState,
  "status" | "first_buzz_table_name" | "eliminated_table_names"
>;

const OVERLAY_STATUSES = new Set(["buzzer_active", "buzz_received", "steal_active", "resolved"]);
const DEV_STATUSES = ["idle", "buzzer_active", "buzz_received", "steal_active", "resolved"] as const;

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DisplayPage() {
  const round = useRoundState();
  const { scores } = useTableScores();
  const [overlayVisible, setOverlayVisible] = useState(false);
  const hydratedRef = useRef(false);
  const [isDev, setIsDev] = useState(false);
  const [devStatus, setDevStatus] = useState<DisplayRound["status"] | null>(null);

  useEffect(() => {
    setIsDev(new URLSearchParams(window.location.search).get("dev") === "1");
  }, []);

  useEffect(() => {
    if (round.loading) return;

    if (!hydratedRef.current) {
      hydratedRef.current = true;
      if (OVERLAY_STATUSES.has(round.status) && round.status !== "resolved") {
        setOverlayVisible(true);
      }
      return;
    }

    if (round.status === "idle" || round.status === "aborted") {
      setOverlayVisible(false);
      return;
    }

    if (round.status === "resolved") {
      setOverlayVisible(true);
      const t = setTimeout(() => setOverlayVisible(false), 4500);
      return () => clearTimeout(t);
    }

    setOverlayVisible(true);
  }, [round.status, round.loading]);

  useEffect(() => {
    if (devStatus === null) return;
    if (devStatus === "idle") { setOverlayVisible(false); return; }
    if (devStatus === "resolved") {
      setOverlayVisible(true);
      const t = setTimeout(() => setOverlayVisible(false), 4500);
      return () => clearTimeout(t);
    }
    setOverlayVisible(true);
  }, [devStatus]);

  const activeScores = scores.filter((t) => t.is_active);

  const effectiveRound: DisplayRound = devStatus
    ? {
        status: devStatus,
        first_buzz_table_name: "Table 7",
        eliminated_table_names: devStatus === "steal_active" ? ["Table 3", "Table 5"] : [],
      }
    : {
        status: round.status,
        first_buzz_table_name: round.first_buzz_table_name,
        eliminated_table_names: round.eliminated_table_names,
      };

  const showOverlay = overlayVisible;

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
          showOverlay ? "opacity-[0.06] blur-[3px]" : "opacity-100"
        }`}
      >
        <ScoreboardHeader />
        <ScoreList scores={activeScores} />
      </div>

      {/* Buzzer overlay */}
      <div
        className={`absolute inset-0 z-20 flex items-center justify-center transition-opacity duration-500 ${
          showOverlay ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <BuzzerCircle round={effectiveRound} />
      </div>

      {/* Dev tools — only visible at /display?dev=1 */}
      {isDev && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2">
          <p className="font-sans text-white/40 text-[0.6rem] tracking-widest uppercase">Display Dev Tools</p>
          <div className="flex gap-2">
            {DEV_STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => setDevStatus(s === devStatus ? null : s)}
                className={`px-3 py-1.5 rounded text-xs font-sans tracking-wide border transition-colors ${
                  devStatus === s
                    ? "bg-gold text-night border-gold"
                    : "bg-white/5 text-white/60 border-white/15 hover:bg-white/10"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

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

const BUZZER_STATUSES = new Set(["buzzer_active", "buzz_received", "steal_active", "resolved"]);

function BuzzerCircle({ round }: { round: DisplayRound }) {
  const ringColor = "border-gold/25";

  const ringPulse = round.status === "buzzer_active" || round.status === "steal_active";

  return (
    // overflow-visible so particles and text can burst outside the 500px box
    <div className="relative w-[500px] h-[500px] overflow-visible">
      {/* Gold particle burst — re-keyed per table so it replays on each buzz */}
      {round.status === "buzz_received" && (
        <GoldParticleBurst key={round.first_buzz_table_name ?? "buzz"} />
      )}

      {/* Ring — pulses independently; does NOT wrap content so scale won't move text */}
      <div
        className={`absolute inset-0 rounded-full border transition-all duration-500 ${ringColor}`}
        style={ringPulse ? { animation: "ring-pulse 2.4s ease-in-out infinite" } : undefined}
      />

      {/* Content — centered inside the same 500px box, z above ring */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-14 z-10">
        <BuzzerCircleContent round={round} />
      </div>
    </div>
  );
}

// Particles that animate outward from the center of the 500×500 container
function GoldParticleBurst() {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {BURST_PARTICLES.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full bg-gold"
          style={
            {
              left: 250,
              top: 250,
              width: p.size,
              height: p.size,
              "--tx": `${p.x}px`,
              "--ty": `${p.y}px`,
              animationName: "particle-burst",
              animationDuration: `${p.duration}ms`,
              animationTimingFunction: "cubic-bezier(0.2, 0.8, 0.4, 1)",
              animationDelay: `${p.delay}ms`,
              animationFillMode: "both",
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

function BuzzerCircleContent({ round }: { round: DisplayRound }) {
  switch (round.status) {
    case "buzzer_active":
      return (
        <>
          <h2
            className="font-script text-gold font-medium leading-tight whitespace-nowrap"
            style={{ fontSize: "clamp(3rem, 7vw, 5.5rem)" }}
          >
            WHO WILL BUZZ FIRST?
          </h2>
          <p className="font-script text-white/60 text-2xl mt-4">
            TABLES — GET READY!
          </p>
        </>
      );

    case "buzz_received":
      return (
        <>
          <h2
            className="font-script text-gold font-medium leading-none uppercase"
            style={{ fontSize: "clamp(3rem, 7vw, 5.5rem)" }}
          >
            {round.first_buzz_table_name ?? "—"}
          </h2>
          <p className="font-sans text-white/80 text-sm tracking-[0.35em] uppercase mt-5">
            Buzzed First!
          </p>
        </>
      );

    case "steal_active": {
      const lastEliminated =
        round.eliminated_table_names[round.eliminated_table_names.length - 1];
      return (
        <>
          <h2 className="font-script text-red-400 font-medium leading-tight whitespace-nowrap" style={{ fontSize: "clamp(3rem, 7vw, 5.5rem)" }}>
            STEAL ROUND
          </h2>
          <p className="font-heading text-white/65 text-xl italic mt-3">
            {lastEliminated
              ? `${lastEliminated.toUpperCase()} ELIMINATED — WHO'S NEXT?`
              : "WHO'S NEXT?"}
          </p>
          {round.eliminated_table_names.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              {round.eliminated_table_names.map((name) => (
                <span
                  key={name}
                  className="flex items-center gap-1.5 px-3.5 py-1 rounded-full border border-red-500/40 text-red-400/80 font-sans text-sm"
                >
                  × {name.toUpperCase()}
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
          <h2 className="font-script text-emerald-400 font-medium leading-tight whitespace-nowrap" style={{ fontSize: "clamp(3rem, 7vw, 5.5rem)" }}>
            ROUND COMPLETE
          </h2>
          <p className="font-heading text-white/55 text-xl italic mt-3 uppercase">
            Back to scoreboard shortly...
          </p>
        </>
      );

    default:
      return null;
  }
}

