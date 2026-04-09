"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  CHANNELS,
  SCORE_EVENTS,
  type ScoreUpdatedPayload,
  type TableScoreResponse,
} from "@/lib/types/realtime";

/**
 * Live ranked list of all tables with their current scores. Hits
 * GET /api/scores once on mount, then updates incrementally via the
 * `scores` realtime channel.
 *
 * Used by the admin dashboard. Will also be used by the Scoring sub-page
 * built by Teammate A.
 */
export interface UseTableScoresResult {
  scores: TableScoreResponse[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useTableScores(): UseTableScoresResult {
  const [scores, setScores] = useState<TableScoreResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchScores = async () => {
    try {
      const res = await fetch("/api/scores", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as TableScoreResponse[];
      setScores(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScores();

    const supabase = createClient();
    const channel = supabase
      .channel(CHANNELS.SCORES)
      .on(
        "broadcast",
        { event: SCORE_EVENTS.SCORE_UPDATED },
        ({ payload }: { payload: ScoreUpdatedPayload }) => {
          setScores((prev) => {
            const next = prev.map((t) =>
              t.id === payload.table_id
                ? { ...t, current_score: payload.new_total }
                : t,
            );
            // Re-sort by score desc, table_number asc.
            next.sort(
              (a, b) =>
                b.current_score - a.current_score ||
                a.table_number - b.table_number,
            );
            return next;
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { scores, loading, error, refetch: fetchScores };
}
