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
  winning_table_name?: string | null;
  points_awarded?: number | null;
  reason?: string | null;
};

export default function BuzzerControlPage() {
  const round = useRoundState();
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryRound[]>([]);

  // Confirmation states
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  // Score entry
  const [scoringPending, setScoringPending] = useState(false);
  const [scoredTableId, setScoredTableId] = useState<string | null>(null);
  const [scoredTableName, setScoredTableName] = useState<string | null>(null);
  const [scoreDelta, setScoreDelta] = useState(1);
  const [scoreReason, setScoreReason] = useState("");
  const [scoreError, setScoreError] = useState<string | null>(null);
  const [scoreSubmitting, setScoreSubmitting] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, [round.status, round.round_id, scoringPending]);

  const fetchHistory = async () => {
    const supabase = createClient();
    
    // Fetch rounds
    const { data: roundsData } = await supabase
      .from("rounds")
      .select(`
        id, 
        round_number, 
        status, 
        created_at,
        first_buzz_table:tables!rounds_first_buzz_table_id_fkey(display_name)
      `)
      .order("round_number", { ascending: false });
    
    if (!roundsData) return;

    // Fetch scores to link them (heuristic based on proximity of table_id and time)
    // Since there's no direct round_id in score_ledger, we'll try to match by table_id and created_at
    const { data: scoresData } = await supabase
      .from("score_ledger")
      .select("table_id, delta, reason, created_at")
      .order("created_at", { ascending: false })
      .limit(roundsData.length * 2);

    const historyWithScores: HistoryRound[] = roundsData.map(r => {
      const winnerName = (r.first_buzz_table as any)?.display_name;
      
      // Try to find a score ledger entry that matches this table and was created shortly after the round
      const matchingScore = r.status === 'resolved' && winnerName 
        ? scoresData?.find(s => 
            s.table_id === (r as any).first_buzz_table_id || // if we had the ID
            new Date(s.created_at) >= new Date(r.created_at) && 
            new Date(s.created_at).getTime() - new Date(r.created_at).getTime() < 300000 // within 5 mins
          )
        : null;

      return {
        id: r.id,
        round_number: r.round_number,
        status: r.status,
        created_at: r.created_at,
        winning_table_name: r.status === 'resolved' ? winnerName : null,
        points_awarded: matchingScore?.delta,
        reason: matchingScore?.reason
      };
    });

    setHistory(historyWithScores);
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
    setScoreDelta(1);
    setScoreReason("");
    setScoreError(null);
  };

  // ── Render Helpers ───────────────────────────────────────────────────────────

  const renderActionButtons = (action: string, label: string, colorClass = "bg-gold text-night hover:bg-gold-soft") => {
    if (pendingAction === action) {
      return (
        <div className="flex items-center gap-2">
          <Button
            onClick={() => handleAction(action)}
            size="sm"
            className={cn("px-4 font-medium", action === "abort" ? "bg-red-600 text-white hover:bg-red-700" : colorClass)}
          >
            Confirm
          </Button>
          <Button
            onClick={() => setPendingAction(null)}
            size="sm"
            className="border-surface-3 bg-surface-3 px-4 font-medium text-white hover:bg-surface-4"
          >
            Cancel
          </Button>
        </div>
      );
    }

    return (
      <Button
        onClick={() => setPendingAction(action)}
        size="sm"
        className={cn("px-4 font-medium", action === "abort" ? "border-red-500/50 text-red-500 hover:bg-red-500/10" : colorClass)}
        variant={action === "abort" ? "outline" : "default"}
      >
        {label}
      </Button>
    );
  };

  if (round.loading) {
    return (
      <div className="p-8">
        <h2 className="text-2xl font-semibold text-white">Buzzer Control</h2>
        <p className="mt-4 text-sm text-text-muted">Loading…</p>
      </div>
    );
  }

  const isTerminal = round.status === "resolved" || round.status === "aborted";
  const showOpen = !round.round_id || isTerminal;
  const openLabel = !round.round_id || (isTerminal && round.round_number === 0) ? "Open Round" : "Open Next Round";

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] overflow-hidden">
      <div className="flex-none p-6 space-y-4">
        <h2 className="text-2xl font-semibold text-white">Buzzer Control</h2>

        {error && <p className="text-sm text-white/45">{error}</p>}

        {/* ── Action Row (Single Line) ── */}
        <div className="h-16 px-6 rounded border border-surface-3 bg-surface-1 flex items-center justify-between">
          
          {/* IDLE / TERMINAL */}
          {showOpen && (
            <>
              {renderActionButtons("open", openLabel)}
              <p className="text-sm text-text-muted">
                {isTerminal ? `Round ${round.round_number} ended.` : "Ready"}
              </p>
            </>
          )}

          {/* BUZZER ACTIVE / STEAL */}
          {(round.status === "buzzer_active" || round.status === "steal_active") && (
            <>
              {renderActionButtons("abort", "Abort")}
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-gold animate-pulse" />
                <p className="text-sm font-medium text-white">
                  {round.status === "steal_active" ? "Steal Active" : "Listening..."}
                </p>
              </div>
            </>
          )}

          {/* BUZZ RECEIVED */}
          {round.status === "buzz_received" && !scoringPending && (
            <>
              <div className="flex gap-2">
                {renderActionButtons("correct", "Correct", "bg-emerald-600 text-white hover:bg-emerald-700")}
                {renderActionButtons("incorrect", "Incorrect", "bg-orange-600 text-white hover:bg-orange-700")}
                {renderActionButtons("abort", "Abort")}
              </div>
              <p className="text-lg font-bold text-white uppercase tracking-tight">
                {round.first_buzz_table_name}
              </p>
            </>
          )}

          {/* SCORE ENTRY (Compact) */}
          {scoringPending && (
            <div className="flex items-center justify-between w-full gap-4">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <button onClick={() => setScoreDelta(d => Math.max(0, d - 1))} className="w-6 h-6 flex items-center justify-center rounded border border-surface-3 text-white/50 hover:text-white">-</button>
                  <input type="number" value={scoreDelta} onChange={e => setScoreDelta(Number(e.target.value))} className="w-12 bg-surface-2 border border-surface-3 text-center text-sm text-white rounded" />
                  <button onClick={() => setScoreDelta(d => d + 1)} className="w-6 h-6 flex items-center justify-center rounded border border-surface-3 text-white/50 hover:text-white">+</button>
                </div>
                <input 
                  type="text" 
                  placeholder="Reason..." 
                  value={scoreReason} 
                  onChange={e => setScoreReason(e.target.value)} 
                  className="w-48 bg-surface-2 border border-surface-3 px-3 py-1 text-sm text-white rounded placeholder:text-white/20 focus:outline-none focus:border-white/30"
                />
                <Button onClick={submitScore} disabled={scoreSubmitting} size="sm" className="bg-gold text-night px-4 h-8">
                  {scoreSubmitting ? "..." : "Save"}
                </Button>
                <button onClick={clearScore} className="text-xs text-white/40 hover:text-white/60 px-2">Skip</button>
              </div>
              <p className="text-sm font-semibold text-white">{scoredTableName}</p>
            </div>
          )}
        </div>
      </div>

      {/* ── History Table (Scrollable) ── */}
      <div className="flex-1 overflow-hidden px-6 pb-6">
        <div className="h-full border border-surface-3 bg-surface-1 rounded flex flex-col">
          <div className="flex-none bg-surface-2/50 border-b border-surface-3">
            <table className="w-full text-left text-[10px] uppercase tracking-widest text-text-muted">
              <thead>
                <tr>
                  <th className="px-6 py-3 font-medium w-24">Round</th>
                  <th className="px-6 py-3 font-medium w-32">Status</th>
                  <th className="px-6 py-3 font-medium w-40">Winner</th>
                  <th className="px-6 py-3 font-medium w-24">Points</th>
                  <th className="px-6 py-3 font-medium">Reason</th>
                  <th className="px-6 py-3 font-medium w-24 text-right">Time</th>
                </tr>
              </thead>
            </table>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-surface-3">
            <table className="w-full text-left text-sm">
              <tbody className="divide-y divide-surface-3">
                {history.map((h) => (
                  <tr key={h.id} className={cn("transition-colors hover:bg-white/5", h.id === round.round_id && "bg-white/5")}>
                    <td className="px-6 py-4 text-white font-medium w-24">#{h.round_number}</td>
                    <td className="px-6 py-4 w-32">
                      <StateBadge status={h.status as any} />
                    </td>
                    <td className="px-6 py-4 text-white w-40">{h.winning_table_name || "—"}</td>
                    <td className="px-6 py-4 text-gold font-mono w-24">
                      {h.points_awarded ? `+${h.points_awarded}` : "—"}
                    </td>
                    <td className="px-6 py-4 text-text-muted italic truncate max-w-xs">{h.reason || "—"}</td>
                    <td className="px-6 py-4 text-text-muted text-right w-24">
                      {new Date(h.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
                {history.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-text-muted">
                      No history found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
