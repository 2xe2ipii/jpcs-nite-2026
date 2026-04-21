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

function sr(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

const STARS = Array.from({ length: 120 }, (_, i) => ({
  id: i,
  left: `${(sr(i * 3 + 1) * 100).toFixed(2)}%`,
  top: `${(sr(i * 3 + 2) * 100).toFixed(2)}%`,
  size: sr(i * 3 + 3) > 0.9 ? 3 : sr(i * 3 + 3) > 0.6 ? 2 : 1,
  opacity: +(0.1 + sr(i * 3 + 4) * 0.6).toFixed(2),
  duration: +(2.5 + sr(i * 3 + 5) * 4).toFixed(2),
  delay: +(sr(i * 3 + 6) * 4).toFixed(2),
}));

type DisplayRound = Pick<
  RoundState,
  "status" | "first_buzz_table_name" | "eliminated_table_names"
>;

const OVERLAY_STATUSES = new Set(["buzzer_active", "buzz_received", "steal_active", "resolved"]);
// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DisplayPage() {
  const round = useRoundState();
  const { scores } = useTableScores();
  const [overlayVisible, setOverlayVisible] = useState(false);
  const hydratedRef = useRef(false);

  useEffect(() => {
    if (round.loading) return;

    if (!hydratedRef.current) {
      hydratedRef.current = true;
      if (OVERLAY_STATUSES.has(round.status) && round.status !== "resolved") {
        // eslint-disable-next-line react-hooks/set-state-in-effect
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

  const activeScores = scores.filter((t) => t.is_active);

  const effectiveRound: DisplayRound = {
    status: round.status,
    first_buzz_table_name: round.first_buzz_table_name,
    eliminated_table_names: round.eliminated_table_names,
  };

  const showOverlay = overlayVisible;

  return (
    <div className="relative h-full w-full bg-night overflow-hidden select-none">
      {/* Star field */}
      <div className={`absolute inset-0 z-0 pointer-events-none transition-opacity duration-700 ${showOverlay ? "opacity-0" : "opacity-100"}`} aria-hidden>
        {STARS.map((s) => (
          <span
            key={s.id}
            className="absolute rounded-full bg-white"
            style={{
              left: s.left,
              top: s.top,
              width: s.size,
              height: s.size,
              opacity: s.opacity,
              "--star-opacity": s.opacity,
              animation: `twinkle ${s.duration}s ease-in-out ${s.delay}s infinite`,
            } as React.CSSProperties}
          />
        ))}
      </div>


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


    </div>
  );
}

// ---------------------------------------------------------------------------
// Scoreboard
// ---------------------------------------------------------------------------

function ScoreboardHeader() {
  return (
    <header className="flex-shrink-0 pt-10 pb-4 text-center">
      <p className="text-gold/50 text-[0.7rem] tracking-[0.4em] uppercase" style={{ fontFamily: 'var(--font-cinzel), Cinzel, serif' }}>
        JPCS NITE 2026 · NIGHTSKY OF GOLDEN DREAMS
      </p>
      <h1 className="font-script text-white text-6xl font-medium tracking-wider mt-2">
        LEADERBOARD
      </h1>
      <div className="mt-4 mx-10 h-px" style={{ background: 'linear-gradient(90deg, transparent, #C9A84C, transparent)' }} />
    </header>
  );
}

function ScoreList({ scores }: { scores: TableScoreResponse[] }) {
  if (scores.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="font-sans text-white/15 text-xl tracking-[0.6em] uppercase">STANDBY</p>
      </div>
    );
  }

  const left = scores.slice(0, 10);
  const right = scores.slice(10, 20);

  return (
    <div className="flex-1 overflow-hidden px-10 pb-8">
      <div className="flex gap-6 h-full">
        <div className="flex-1 flex flex-col justify-evenly">
          {left.map((table, i) => (
            <ScoreRow key={table.id} table={table} rank={i + 1} />
          ))}
        </div>
        <div className="flex-1 flex flex-col justify-evenly">
          {right.map((table, i) => (
            <ScoreRow key={table.id} table={table} rank={i + 11} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ScoreRow({ table, rank }: { table: TableScoreResponse; rank: number }) {
  const isTop3 = rank <= 3;
  const starCount = Math.max(0, table.current_score);

  return (
    <div
      className={`flex items-center gap-3 px-4 py-2 rounded-xl border transition-all duration-500 ${
        isTop3 ? "bg-gold/[0.06] border-gold/20" : "bg-white/[0.02] border-white/[0.04]"
      }`}
    >
      {/* Rank */}
      <div className="w-7 flex-shrink-0 flex items-center justify-center">
        <span
          className={`font-bold tabular-nums leading-none ${isTop3 ? "text-gold text-lg" : "text-white/35 text-base"}`}
          style={{ fontFamily: 'var(--font-cinzel), Cinzel, serif' }}
        >
          {rank}
        </span>
      </div>

      {/* Table name */}
      <span
        className={`font-bold text-lg flex-shrink-0 w-24 ${isTop3 ? "text-gold" : "text-white/70"}`}
        style={{ fontFamily: 'var(--font-cinzel), Cinzel, serif' }}
      >
        {table.display_name}
      </span>

      {/* Stars */}
      <div className="flex flex-wrap gap-0.5 flex-1">
        {Array.from({ length: starCount }).map((_, i) => (
          <span key={i} className={`text-sm leading-none ${isTop3 ? "text-gold" : "text-gold/50"}`}>★</span>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Buzzer circle overlay
// ---------------------------------------------------------------------------

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

      {/* Static ring */}
      <div className={`absolute inset-0 rounded-full border ${ringColor}`} />

      {/* Orbiting gold bead — replaces pulse when buzzer is open */}
      {ringPulse && (
        <div
          className="absolute inset-0 rounded-full"
          style={{ animation: "orbit-spin 3s linear infinite" }}
        >
          <div
            className="absolute w-3 h-3 rounded-full bg-gold"
            style={{
              top: -6,
              left: "50%",
              transform: "translateX(-50%)",
              boxShadow: "0 0 10px 4px rgba(201,168,76,0.8), 0 0 24px 8px rgba(201,168,76,0.3)",
            }}
          />
        </div>
      )}

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
          <p className="text-white/60 text-xl mt-4" style={{ fontFamily: 'var(--font-cinzel), Cinzel, serif' }}>
            TABLES — GET READY!
          </p>
        </>
      );

    case "buzz_received":
      return (
        <>
          <h2
            className="font-script text-gold font-medium leading-none uppercase whitespace-nowrap"
            style={{ fontSize: "clamp(3rem, 7vw, 5.5rem)" }}
          >
            {round.first_buzz_table_name ?? "—"}
          </h2>
          <p className="text-white/60 text-xl mt-4" style={{ fontFamily: 'var(--font-cinzel), Cinzel, serif' }}>
            BUZZED FIRST!
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
          <p className="text-white/60 text-xl mt-4" style={{ fontFamily: 'var(--font-cinzel), Cinzel, serif' }}>
            {lastEliminated
              ? `${lastEliminated.toUpperCase()} ELIMINATED — WHO'S NEXT?`
              : "WHO'S NEXT?"}
          </p>
          {round.eliminated_table_names.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              {round.eliminated_table_names.map((name) => (
                <span
                  key={name}
                  className="flex items-center gap-1.5 px-3.5 py-1 rounded-full border border-red-500/40 text-red-400/80 text-sm"
                  style={{ fontFamily: 'var(--font-cinzel), Cinzel, serif' }}
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
          <p className="text-white/55 text-xl mt-4 uppercase" style={{ fontFamily: 'var(--font-cinzel), Cinzel, serif' }}>
            Back to scoreboard shortly...
          </p>
        </>
      );

    default:
      return null;
  }
}

