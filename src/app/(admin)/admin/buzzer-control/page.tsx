"use client";

import { useState, useEffect } from "react";
import { useRoundState } from "@/lib/hooks/use-round-state";
import { StateBadge } from "@/components/admin/state-badge";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type HistoryRound = {
  id: string;
  round_number: number;
  status: string;
  created_at: string;
};

export default function BuzzerControlPage() {
  const round = useRoundState();
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryRound[]>([]);

  // Confirmation states
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  // Score entry — shown inline after marking correct
  const [scoringPending, setScoringPending] = useState(false);
  const [scoredTableId, setScoredTableId] = useState<string | null>(null);
  const [scoredTableName, setScoredTableName] = useState<string | null>(null);
  const [scoreDelta, setScoreDelta] = useState(1);
  const [scoreError, setScoreError] = useState<string | null>(null);
  const [scoreSubmitting, setScoreSubmitting] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, [round.status, round.round_id]);

  const fetchHistory = async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("rounds")
      .select("id, round_number, status, created_at")
      .order("round_number", { ascending: false });
    if (data) setHistory(data);
  };

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

  const handleAction = async (action: string) => {
    setPendingAction(null);
    try {
      if (action === "open") {
        await post("/api/rounds/open");
      } else if (action === "correct") {
        const tableId = round.first_buzz_table_id;
        const tableName = round.first_buzz_table_name;
        await post(`/api/rounds/${round.round_id}/correct`);
        setScoredTableId(tableId);
        setScoredTableName(tableName);
        setScoringPending(true);
      } else if (action === "incorrect") {
        await post(`/api/rounds/${round.round_id}/incorrect`, {
          table_id: round.first_buzz_table_id,
        });
      } else if (action === "abort") {
        await post(`/api/rounds/${round.round_id}/abort`);
      }
    } catch (e) {
      // Error handled by post
    }
  };

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
    setScoreDelta(1);
    setScoreError(null);
  };

  // ── Render Helpers ───────────────────────────────────────────────────────────

  const renderActionButtons = (action: string, label: string, colorClass = "bg-gold text-night hover:bg-gold-soft") => {
    if (pendingAction === action) {
      return (
        <div className="flex items-center gap-2">
          <Button
            onClick={() => handleAction(action)}
            className={cn("px-5 text-sm font-medium", action === "abort" ? "bg-red-600 text-white hover:bg-red-700" : colorClass)}
          >
            Confirm
          </Button>
          <Button
            onClick={() => setPendingAction(null)}
            className="border-surface-3 bg-surface-3 px-5 text-sm font-medium text-white hover:bg-surface-4"
          >
            Cancel
          </Button>
        </div>
      );
    }

    return (
      <Button
        onClick={() => setPendingAction(action)}
        className={cn("px-5 text-sm font-medium", action === "abort" ? "border-red-500/50 text-red-500 hover:bg-red-500/10" : colorClass)}
        variant={action === "abort" ? "outline" : "default"}
      >
        {label}
      </Button>
    );
  };

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
  const openLabel = !round.round_id || (isTerminal && round.round_number === 0) ? "Open Round" : "Open Next Round";

  return (
    <div className="space-y-10">
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold text-white">Buzzer Control</h2>

        {error && <p className="text-sm text-white/45">{error}</p>}

        {/* ── Main Action Container (Static Size) ── */}
        <div className="h-48 rounded border border-surface-3 bg-surface-1 p-8 flex flex-col justify-center">
          
          {/* IDLE / TERMINAL ────────────────────────────── */}
          {showOpen && (
            <div className="flex items-center justify-between">
              <div className="w-1/2">
                {renderActionButtons("open", openLabel)}
              </div>
              <p className="text-sm text-text-muted">
                {isTerminal
                  ? `Round ${round.round_number} ended.`
                  : "No active round."}
              </p>
            </div>
          )}

          {/* BUZZER ACTIVE ──────────────────────────────── */}
          {round.status === "buzzer_active" && (
            <div className="flex items-center justify-between">
              <div className="w-1/2">
                {renderActionButtons("abort", "Abort")}
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-widest text-text-muted">
                  Listening
                </p>
                <p className="mt-1 text-lg font-medium text-white">
                  Waiting for first buzz…
                </p>
              </div>
            </div>
          )}

          {/* BUZZ RECEIVED ──────────────────────────────── */}
          {round.status === "buzz_received" && !scoringPending && (
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                {renderActionButtons("correct", "Correct", "bg-emerald-600 text-white hover:bg-emerald-700")}
                {renderActionButtons("incorrect", "Incorrect", "bg-orange-600 text-white hover:bg-orange-700")}
                {renderActionButtons("abort", "Abort")}
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-widest text-text-muted">
                  First Buzz
                </p>
                <p className="mt-1 text-2xl font-semibold tracking-tight text-white">
                  {round.first_buzz_table_name ?? "—"}
                </p>
              </div>
            </div>
          )}

          {/* STEAL ACTIVE ───────────────────────────────── */}
          {round.status === "steal_active" && (
            <div className="flex items-center justify-between">
              <div className="w-1/2">
                {renderActionButtons("abort", "Abort")}
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-widest text-text-muted">
                  Steal Round
                </p>
                <p className="mt-1 text-lg font-medium text-white">
                  Waiting for first buzz…
                </p>
              </div>
            </div>
          )}

          {/* SCORE ENTRY ────────────────────────────────── */}
          {scoringPending && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setScoreDelta((d) => Math.max(0, d - 1))}
                    className="flex h-8 w-8 items-center justify-center rounded border border-surface-3 text-sm text-white/50 transition-colors hover:border-white/20 hover:bg-surface-2 hover:text-white"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    value={scoreDelta}
                    onChange={(e) => setScoreDelta(Number(e.target.value))}
                    className="w-16 rounded border border-surface-3 bg-surface-2 px-2 py-1 text-center font-mono text-white focus:border-white/30 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setScoreDelta((d) => d + 1)}
                    className="flex h-8 w-8 items-center justify-center rounded border border-surface-3 text-sm text-white/50 transition-colors hover:border-white/20 hover:bg-surface-2 hover:text-white"
                  >
                    +
                  </button>
                </div>
                <Button
                  onClick={submitScore}
                  disabled={scoreSubmitting}
                  className="bg-gold px-5 text-sm font-medium text-night hover:bg-gold-soft"
                >
                  {scoreSubmitting ? "Saving…" : `Confirm +${scoreDelta} pts`}
                </Button>
                <button
                  type="button"
                  onClick={clearScore}
                  className="text-sm text-white/35 transition-colors hover:text-white/60"
                >
                  Skip
                </button>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-widest text-text-muted">
                  Add Score
                </p>
                <p className="mt-1 text-xl font-semibold text-white">
                  {scoredTableName}
                </p>
                {scoreError && <p className="text-xs text-red-400 mt-1">{scoreError}</p>}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── History Table ── */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-white/70">Round History</h3>
        <div className="rounded border border-surface-3 bg-surface-1 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-surface-3 bg-surface-2/50 text-[10px] uppercase tracking-widest text-text-muted">
                <th className="px-6 py-3 font-medium">Round</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-3">
              {history.map((h) => (
                <tr key={h.id} className={cn("transition-colors hover:bg-white/5", h.id === round.round_id && "bg-white/5")}>
                  <td className="px-6 py-4 text-white">Round {h.round_number}</td>
                  <td className="px-6 py-4">
                    <StateBadge status={h.status as any} />
                  </td>
                  <td className="px-6 py-4 text-text-muted">
                    {new Date(h.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                </tr>
              ))}
              {history.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-text-muted">
                    No rounds recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
