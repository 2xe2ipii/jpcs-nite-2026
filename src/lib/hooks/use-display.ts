"use client";

import { useRoundState, type RoundState } from "./use-round-state";
import { useTableScores, type UseTableScoresResult } from "./use-table-scores";

export interface UseDisplayResult {
  round: RoundState;
  scoreboard: UseTableScoresResult;
}

export function useDisplay(): UseDisplayResult {
  return {
    round: useRoundState(),
    scoreboard: useTableScores(),
  };
}
