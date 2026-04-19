"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  BUZZER_EVENTS,
  CHANNELS,
  type BuzzFirstPayload,
  type RoundOpenedPayload,
  type RoundResolvedPayload,
  type RoundStealPayload,
  type RoundStatus,
} from "@/lib/types/realtime";

/**
 * Reduced view of the current buzzer round, derived from the latest row in
 * the `rounds` table plus realtime broadcasts on the buzzer-room channel.
 *
 * Used by the admin dashboard and buzzer-control page. Teammates building
 * the Scoring/Tables sub-pages don't need this hook — they care about scores,
 * not buzzer state.
 */
export interface RoundState {
  loading: boolean;
  round_id: string | null;
  round_number: number | null;
  status: RoundStatus;
  first_buzz_table_id: string | null;
  first_buzz_table_name: string | null;
  eliminated_table_ids: string[];
  eliminated_table_names: string[];
}

const initialState: RoundState = {
  loading: true,
  round_id: null,
  round_number: null,
  status: "idle",
  first_buzz_table_id: null,
  first_buzz_table_name: null,
  eliminated_table_ids: [],
  eliminated_table_names: [],
};

export interface UseRoundStateResult extends RoundState {
  /** Re-hydrate from the database. Use after a write that may not have
   * round-tripped through Realtime to this same client (e.g. opening a
   * new round from the admin panel — the browser sometimes misses its
   * own broadcast). */
  refresh: () => Promise<void>;
}

export function useRoundState(): UseRoundStateResult {
  const [state, setState] = useState<RoundState>(initialState);
  const cancelledRef = useRef(false);

  const hydrate = useCallback(async () => {
    const supabase = createClient();

    const { data: round } = await supabase
      .from("rounds")
      .select(
        "id, round_number, status, first_buzz_table_id, eliminated_table_ids",
      )
      .order("round_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (cancelledRef.current) return;

    if (!round) {
      setState({ ...initialState, loading: false });
      return;
    }

    const ids = [
      ...(round.eliminated_table_ids ?? []),
      ...(round.first_buzz_table_id ? [round.first_buzz_table_id] : []),
    ];

    let nameById = new Map<string, string>();
    if (ids.length > 0) {
      const { data: tables } = await supabase
        .from("tables")
        .select("id, display_name")
        .in("id", ids);
      nameById = new Map((tables ?? []).map((t) => [t.id, t.display_name]));
    }

    if (cancelledRef.current) return;

    setState({
      loading: false,
      round_id: round.id,
      round_number: round.round_number,
      status: round.status as RoundStatus,
      first_buzz_table_id: round.first_buzz_table_id ?? null,
      first_buzz_table_name: round.first_buzz_table_id
        ? nameById.get(round.first_buzz_table_id) ?? null
        : null,
      eliminated_table_ids: round.eliminated_table_ids ?? [],
      eliminated_table_names: ((round.eliminated_table_ids ?? []) as string[]).map(
        (id: string) => nameById.get(id) ?? "",
      ),
    });
  }, []);

  useEffect(() => {
    cancelledRef.current = false;
    const supabase = createClient();

    // Defer to a microtask so React doesn't see a synchronous setState
    // inside the effect body (lint: react-hooks/set-state-in-effect).
    Promise.resolve().then(hydrate);

    // Subscribe to live updates from the buzzer-room channel.
    const channel = supabase
      .channel(CHANNELS.BUZZER_ROOM)
      .on(
        "broadcast",
        { event: BUZZER_EVENTS.ROUND_OPENED },
        ({ payload }: { payload: RoundOpenedPayload }) => {
          setState({
            loading: false,
            round_id: payload.round_id,
            round_number: payload.round_number,
            status: "buzzer_active",
            first_buzz_table_id: null,
            first_buzz_table_name: null,
            eliminated_table_ids: [],
            eliminated_table_names: [],
          });
        },
      )
      .on(
        "broadcast",
        { event: BUZZER_EVENTS.BUZZ_FIRST },
        ({ payload }: { payload: BuzzFirstPayload }) => {
          setState((prev) => ({
            ...prev,
            status: "buzz_received",
            first_buzz_table_id: payload.table_id,
            first_buzz_table_name: payload.table_name,
          }));
        },
      )
      .on(
        "broadcast",
        { event: BUZZER_EVENTS.ROUND_STEAL },
        ({ payload }: { payload: RoundStealPayload }) => {
          setState((prev) => ({
            ...prev,
            status: "steal_active",
            first_buzz_table_id: null,
            first_buzz_table_name: null,
            eliminated_table_ids: payload.eliminated_table_ids,
            eliminated_table_names: payload.eliminated_table_names,
          }));
        },
      )
      .on(
        "broadcast",
        { event: BUZZER_EVENTS.ROUND_RESOLVED },
        ({ payload }: { payload: RoundResolvedPayload }) => {
          setState((prev) => ({
            ...prev,
            status: "resolved",
            first_buzz_table_id: payload.winning_table_id,
            first_buzz_table_name: payload.winning_table_name,
          }));
        },
      )
      .on(
        "broadcast",
        { event: BUZZER_EVENTS.ROUND_ABORTED },
        (/* payload: RoundAbortedPayload */) => {
          setState((prev) => ({
            ...prev,
            status: "aborted",
            first_buzz_table_id: null,
            first_buzz_table_name: null,
          }));
        },
      )
      .subscribe();

    return () => {
      cancelledRef.current = true;
      supabase.removeChannel(channel);
    };
  }, [hydrate]);

  return { ...state, refresh: hydrate };
}
