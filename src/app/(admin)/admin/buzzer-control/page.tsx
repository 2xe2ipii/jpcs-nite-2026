"use client";

import { useState } from "react";
import { useRoundState } from "@/lib/hooks/use-round-state";
import { StateBadge } from "@/components/admin/state-badge";
import { ConfirmButton } from "@/components/admin/confirm-button";

export default function BuzzerControlPage() {
  const round = useRoundState();
  const [error, setError] = useState<string | null>(null);

  // Score entry — shown inline after marking correct
  const [scoringPending, setScoringPending] = useState(false);
  const [scoredTableId, setScoredTableId] = useState<string | null>(null);
  const [scoredTableName, setScoredTableName] = useState<string | null>(null);
  const [scoreDelta, setScoreDelta] = useState(10);
  const [scoreReason, setScoreReason] = useState("");
  const [scoreError, setScoreError] = useState<string | null>(null);
  const [scoreSubmitting, setScoreSubmitting] = useState(false);

  // ── API calls ────────────────────────────────────────────────────────────────

  const post = async (url: string, body?: unknown) => {
    setError(null);
    const res = await fetch(url, {
      method: "POST",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const msg = await res.text().catch(() => `HTTP ${res.status}`);
      setError(msg);
      throw new Error(msg);
    }
    return res.json();
  };

  const openRound = () => post("/api/rounds/open");

  const markCorrectAndScore = async () => {
    const tableId = round.first_buzz_table_id;
    const tableName = round.first_buzz_table_name;
    await post(`/api/rounds/${round.round_id}/correct`);
    setScoredTableId(tableId);
    setScoredTableName(tableName);
    setScoringPending(true);
  };

  const markIncorrect = () =>
    post(`/api/rounds/${round.round_id}/incorrect`, {
      table_id: round.first_buzz_table_id,
    });

  const abortRound = () => post(`/api/rounds/${round.round_id}/abort`);

  const submitScore = async () => {
    if (!scoredTableId) return;
    setScoreError(null);
    setScoreSubmitting(true);
    try {
      const res = await fetch("/api/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          table_id: scoredTableId,
          delta: scoreDelta,
          reason: scoreReason.trim() || undefined,
        }),
      });
      if (!res.ok)
        throw new Error(await res.text().catch(() => `HTTP ${res.status}`));
      clearScore();
    } catch (e) {
      setScoreError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setScoreSubmitting(false);
    }
  };

  const clearScore = () => {
    setScoringPending(false);
    setScoredTableId(null);
    setScoredTableName(null);
    setScoreDelta(10);
    setScoreReason("");
    setScoreError(null);
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  if (round.loading) {
    return (
      <div className="space-y-8">
        <h2 className="text-2xl font-semibold text-white">Buzzer Control</h2>
        <p className="text-sm text-text-muted">Loading…</p>
      </div>
    );
  }

  const isTerminal = round.status === "resolved" || round.status === "aborted";
  const showOpen = !round.round_id || isTerminal;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-white">Buzzer Control</h2>

      {/* Error — muted, no color */}
      {error && (
        <p className="text-sm text-white/45">{error}</p>
      )}

      {/* Round meta row — persistent once a round exists */}
      {round.round_id && (
        <div className="flex items-center justify-between border-b border-surface-3 pb-5">
          <span className="text-sm text-text-muted">
            Round {round.round_number}
          </span>
          <StateBadge status={round.status} />
        </div>
      )}

      {/* ── State panel ── */}
      <div className="rounded border border-surface-3 bg-surface-1 p-8">

        {/* IDLE / TERMINAL ────────────────────────────── */}
        {showOpen && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-text-muted">
              {isTerminal
                ? `Round ${round.round_number} ended.`
                : "No active round."}
            </p>
            <ConfirmButton
              onConfirm={openRound}
              confirmLabel="Click again to open"
              className="bg-gold px-5 text-sm font-medium text-night shadow-none hover:bg-gold-soft"
            >
              Open Round
            </ConfirmButton>
          </div>
        )}

        {/* BUZZER ACTIVE ──────────────────────────────── */}
        {round.status === "buzzer_active" && (
          <div>
            <p className="text-[10px] uppercase tracking-widest text-text-muted">
              Listening
            </p>
            <p className="mt-3 text-xl font-medium text-white">
              Waiting for first buzz…
            </p>
            <div className="mt-12 flex justify-end">
              <ConfirmButton
                onConfirm={abortRound}
                variant="ghost"
                confirmLabel="Click again to abort"
                className="h-auto bg-transparent px-0 text-sm font-normal text-white/35 shadow-none hover:bg-transparent hover:text-white/60"
              >
                Abort
              </ConfirmButton>
            </div>
          </div>
        )}

        {/* BUZZ RECEIVED ──────────────────────────────── */}
        {round.status === "buzz_received" && !scoringPending && (
          <div>
            <p className="text-[10px] uppercase tracking-widest text-text-muted">
              First Buzz
            </p>
            <p className="mt-3 text-4xl font-semibold tracking-tight text-white">
              {round.first_buzz_table_name ?? "—"}
            </p>
            {round.eliminated_table_names.length > 0 && (
              <p className="mt-2 text-xs text-text-muted">
                Eliminated: {round.eliminated_table_names.join(", ")}
              </p>
            )}
            <div className="mt-12 flex items-center gap-2">
              <ConfirmButton
                onConfirm={markCorrectAndScore}
                variant="outline"
                confirmLabel="Confirm correct"
                className="border-surface-3 bg-surface-2 px-5 text-sm font-medium text-white shadow-none hover:border-white/20 hover:bg-surface-3 hover:text-white"
              >
                Correct
              </ConfirmButton>
              <ConfirmButton
                onConfirm={markIncorrect}
                variant="outline"
                confirmLabel="Confirm incorrect"
                className="border-surface-3 bg-surface-2 px-5 text-sm font-medium text-white shadow-none hover:border-white/20 hover:bg-surface-3 hover:text-white"
              >
                Incorrect
              </ConfirmButton>
              <span className="flex-1" />
              <ConfirmButton
                onConfirm={abortRound}
                variant="ghost"
                confirmLabel="Click again to abort"
                className="h-auto bg-transparent px-0 text-sm font-normal text-white/35 shadow-none hover:bg-transparent hover:text-white/60"
              >
                Abort
              </ConfirmButton>
            </div>
          </div>
        )}

        {/* SCORE ENTRY ────────────────────────────────── */}
        {scoringPending && (
          <div>
            <p className="text-[10px] uppercase tracking-widest text-text-muted">
              Add Score
            </p>
            <p className="mt-3 text-2xl font-semibold text-white">
              {scoredTableName}
            </p>

            <div className="mt-8 space-y-5">
              {/* Points stepper */}
              <div>
                <label className="mb-2 block text-[10px] uppercase tracking-widest text-text-muted">
                  Points
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setScoreDelta((d) => d - 5)}
                    className="flex h-8 w-8 items-center justify-center rounded border border-surface-3 text-sm text-white/50 transition-colors hover:border-white/20 hover:bg-surface-2 hover:text-white"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    value={scoreDelta}
                    onChange={(e) => setScoreDelta(Number(e.target.value))}
                    className="w-20 rounded border border-surface-3 bg-surface-2 px-3 py-1.5 text-center font-mono text-lg text-white focus:border-white/30 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setScoreDelta((d) => d + 5)}
                    className="flex h-8 w-8 items-center justify-center rounded border border-surface-3 text-sm text-white/50 transition-colors hover:border-white/20 hover:bg-surface-2 hover:text-white"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Reason */}
              <div>
                <label className="mb-2 block text-[10px] uppercase tracking-widest text-text-muted">
                  Reason{" "}
                  <span className="normal-case text-white/25">(optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Correct answer"
                  value={scoreReason}
                  onChange={(e) => setScoreReason(e.target.value)}
                  className="w-full max-w-xs rounded border border-surface-3 bg-surface-2 px-3 py-1.5 text-sm text-white placeholder:text-white/20 focus:border-white/30 focus:outline-none"
                />
              </div>

              {scoreError && (
                <p className="text-sm text-white/45">{scoreError}</p>
              )}
            </div>

            <div className="mt-12 flex items-center justify-between">
              <button
                type="button"
                onClick={clearScore}
                className="text-sm text-white/35 transition-colors hover:text-white/60"
              >
                Skip
              </button>
              <ConfirmButton
                onConfirm={submitScore}
                disabled={scoreSubmitting}
                confirmLabel={`Confirm +${scoreDelta} pts`}
                className="bg-gold px-5 text-sm font-medium text-night shadow-none hover:bg-gold-soft"
              >
                {scoreSubmitting ? "Saving…" : `+${scoreDelta} pts`}
              </ConfirmButton>
            </div>
          </div>
        )}

        {/* STEAL ACTIVE ───────────────────────────────── */}
        {round.status === "steal_active" && (
          <div>
            <p className="text-[10px] uppercase tracking-widest text-text-muted">
              Steal Round
            </p>
            <p className="mt-3 text-xl font-medium text-white">
              Waiting for first buzz…
            </p>
            {round.eliminated_table_names.length > 0 && (
              <div className="mt-6">
                <p className="mb-2 text-[10px] uppercase tracking-widest text-text-muted">
                  Eliminated
                </p>
                <p className="text-sm text-white/55">
                  {round.eliminated_table_names.join("  ·  ")}
                </p>
              </div>
            )}
            <div className="mt-12 flex justify-end">
              <ConfirmButton
                onConfirm={abortRound}
                variant="ghost"
                confirmLabel="Click again to abort"
                className="h-auto bg-transparent px-0 text-sm font-normal text-white/35 shadow-none hover:bg-transparent hover:text-white/60"
              >
                Abort
              </ConfirmButton>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
