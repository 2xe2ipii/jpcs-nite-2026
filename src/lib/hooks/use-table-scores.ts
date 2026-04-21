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
    const supabase = createClient();
    const channel = supabase
      .channel(CHANNELS.SCORES, {
        config: {
          broadcast: { self: true },
        },
      })
      .on(
        "broadcast",
        { event: SCORE_EVENTS.SCORE_UPDATED },
        ({ payload }: { payload: ScoreUpdatedPayload }) => {
          console.log("[useTableScores] Realtime: SCORE_UPDATED", payload);
          // Refetch so server-side sort (score, first_scored_at, tiebreak_order) is authoritative.
          void fetchScores();
        },
      );

    // Fetch initial scores immediately so the UI renders even if Realtime
    // never connects (auth failure, network issue, etc.).
    void fetchScores();

    channel.subscribe((status) => {
      console.log(`[useTableScores] ${CHANNELS.SCORES} subscription status: ${status}`);
      if (status === "SUBSCRIBED") {
        // Re-fetch on subscribe to close the race between the initial
        // fetch above and the moment broadcasts start arriving.
        void fetchScores();
      }
    });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  return { scores, loading, error, refetch: fetchScores };
}
