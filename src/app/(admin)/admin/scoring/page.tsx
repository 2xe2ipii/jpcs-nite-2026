"use client";

import { useTableScores } from "@/lib/hooks/use-table-scores";
// Teammate: you'll need these imports for the full implementation:
// import { ConfirmButton } from "@/components/admin/confirm-button";
// import type { ScoreCreateRequest, TableScoreResponse } from "@/lib/types/realtime";

/**
 * TASK ASSIGNED — Teammate A: Scoring CRUD UI
 * See docs/admin-handoff.md "Task A: Scoring CRUD UI" for full requirements.
 *
 * SRS §4.2.3 requirements to implement on this page:
 *
 * TODO: Display a ranked table of all tables with current scores
 *       → use the `scores` array from useTableScores() (already sorted)
 *
 * TODO: Add score form — select a table, enter delta (+/-), optional reason
 *       → POST /api/scores with ScoreCreateRequest body
 *       → wrap the submit in a <ConfirmButton> (two-stage confirm required)
 *
 * TODO: Show score history per table (most recent entries from score_ledger)
 *       → you may need a new GET endpoint or query param on GET /api/scores
 *
 * TODO: Undo (delete) the most recent ledger entry for a table
 *       → DELETE /api/scores/:id
 *       → wrap in <ConfirmButton> with destructive variant
 *
 * TODO: All changes must broadcast via Realtime (the API routes already do this)
 *       → useTableScores() will auto-update when broadcasts arrive
 *
 * Reference implementation: see /admin/buzzer-control/page.tsx for patterns
 * (API calls, error handling, ConfirmButton usage, layout conventions).
 */

export default function ScoringPage() {
  const { scores, loading, error } = useTableScores();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-widest text-gold">
          Score Management
        </p>
        <h2 className="mt-1 text-2xl font-semibold text-white">Scoring</h2>
        <p className="mt-1 text-sm text-white/60">
          Add, deduct, and undo scores for competing tables.
        </p>
      </div>

      <div className="rounded-lg border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
        <strong>Task assigned</strong> — See{" "}
        <code className="rounded bg-night px-1 text-xs">
          docs/admin-handoff.md
        </code>{" "}
        &quot;Task A: Scoring CRUD UI&quot; for full requirements and acceptance
        criteria.
      </div>

      {/* Placeholder — teammate replaces this with the full scoring UI */}
      <div className="rounded-lg border border-night-line bg-night-soft p-6">
        {loading ? (
          <p className="text-sm text-white/50">Loading scores…</p>
        ) : error ? (
          <p className="text-sm text-red-300">Error: {error}</p>
        ) : (
          <div>
            <p className="mb-3 text-xs uppercase tracking-widest text-white/40">
              Current Rankings (read-only preview)
            </p>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-night-line text-left text-white/50">
                  <th className="pb-2 pr-4">#</th>
                  <th className="pb-2 pr-4">Table</th>
                  <th className="pb-2 text-right">Score</th>
                </tr>
              </thead>
              <tbody>
                {scores.map((t, i) => (
                  <tr key={t.id} className="border-b border-night-line/50">
                    <td className="py-2 pr-4 text-gold">{i + 1}</td>
                    <td className="py-2 pr-4 text-white/80">
                      {t.display_name}
                    </td>
                    <td className="py-2 text-right font-mono font-semibold text-gold">
                      {t.current_score}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
