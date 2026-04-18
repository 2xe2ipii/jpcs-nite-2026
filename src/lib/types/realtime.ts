// ============================================================
// JPCS NITE 2026 — Realtime Channel Contracts
// ============================================================
//
// This file is the SINGLE SOURCE OF TRUTH for all Realtime
// channel event names and payload shapes. All three teams
// (Buzzer, Admin, Display) must import from this file.
//
// DO NOT modify this file without agreement from all teams.
// Changes here affect every module in the system.
//
// Owner: Drex (project coordinator)
// ============================================================

// ------------------------------------------------------------
// Channel Names
// ------------------------------------------------------------

export const CHANNELS = {
  /** All buzzer state changes. Subscribed by: phones, admin, display */
  BUZZER_ROOM: "buzzer-room",
  /** Score updates. Subscribed by: display, admin */
  SCORES: "scores",
} as const;

// ------------------------------------------------------------
// Buzzer Room Events
// ------------------------------------------------------------

export const BUZZER_EVENTS = {
  /** Admin opened a new buzzer round */
  ROUND_OPENED: "round:opened",
  /** A table buzzed first in the current phase */
  BUZZ_FIRST: "buzz:first",
  /** Admin marked the answer incorrect — steal round opening */
  ROUND_STEAL: "round:steal",
  /** Round is complete (correct answer or admin ended it) */
  ROUND_RESOLVED: "round:resolved",
  /** Round was aborted — clean reset to idle */
  ROUND_ABORTED: "round:aborted",
} as const;

/** Payload for round:opened */
export interface RoundOpenedPayload {
  round_id: string;
  round_number: number;
}

/** Payload for buzz:first */
export interface BuzzFirstPayload {
  round_id: string;
  table_id: string;
  table_name: string;
  table_number: number;
  phase: string; // "initial" | "steal_1" | "steal_2" | ...
}

/** Payload for round:steal */
export interface RoundStealPayload {
  round_id: string;
  eliminated_table_ids: string[];
  /** Human-readable names of eliminated tables for display */
  eliminated_table_names: string[];
  steal_number: number; // 1, 2, 3, ...
}

/** Payload for round:resolved */
export interface RoundResolvedPayload {
  round_id: string;
  /** The table that answered correctly, or null if no winner */
  winning_table_id: string | null;
  winning_table_name: string | null;
}

/** Payload for round:aborted */
export interface RoundAbortedPayload {
  round_id: string;
}

// ------------------------------------------------------------
// Score Events
// ------------------------------------------------------------

export const SCORE_EVENTS = {
  /** A score was added, deducted, or removed (undo) */
  SCORE_UPDATED: "score:updated",
} as const;

/** Payload for score:updated */
export interface ScoreUpdatedPayload {
  table_id: string;
  table_name: string;
  /** The new total score for this table after the change */
  new_total: number;
  /** The delta that was just applied (positive or negative) */
  delta: number;
  /** Optional reason label */
  reason: string | null;
}

// ------------------------------------------------------------
// Buzzer API Types (HTTP POST /api/buzz)
// ------------------------------------------------------------

/** Request body for POST /api/buzz */
export interface BuzzRequest {
  table_id: string;
  session_token: string;
  round_id: string;
}

/** Success response from POST /api/buzz */
export interface BuzzResponse {
  position: number;
  is_first: boolean;
}

// ------------------------------------------------------------
// Score API Types
// ------------------------------------------------------------

/** Request body for POST /api/scores */
export interface ScoreCreateRequest {
  table_id: string;
  delta: number;
  reason?: string;
}

/** Response from GET /api/scores */
export interface TableScoreResponse {
  id: string;
  display_name: string;
  table_number: number;
  is_active: boolean;
  current_score: number;
}

// ------------------------------------------------------------
// Round API Types
// ------------------------------------------------------------

/** Request body for POST /api/rounds/[id]/incorrect */
export interface RoundIncorrectRequest {
  table_id: string;
}

// ------------------------------------------------------------
// Device API Types
// ------------------------------------------------------------

/** Request body for POST /api/devices/register */
export interface DeviceRegisterRequest {
  table_id: string;
  // qr_token: string;
}

/** Success response from POST /api/devices/register */
export interface DeviceRegisterResponse {
  session_token: string;
  table_id: string;
  table_name: string;
  table_number: number;
}

/** Request body for POST /api/devices/validate */
export interface DeviceValidateRequest {
  session_token: string;
}

/** Success response from POST /api/devices/validate */
export interface DeviceValidateResponse {
  valid: boolean;
  table_id: string;
  table_name: string;
  table_number: number;
}

// ------------------------------------------------------------
// Database Row Types (mirrors Supabase schema)
// ------------------------------------------------------------
// These will eventually be auto-generated by Supabase CLI:
//   pnpm supabase gen types typescript --local > src/lib/types/database.ts
//
// For now, these manual types match the migration exactly.
// Once you generate types, replace database.ts and update
// imports — but do NOT change the column names.
// ------------------------------------------------------------

export type RoundStatus =
  | "idle"
  | "buzzer_active"
  | "buzz_received"
  | "steal_active"
  | "resolved"
  | "aborted";

export type BuzzPhase =
  | "initial"
  | "steal_1"
  | "steal_2"
  | "steal_3"
  | "steal_4"
  | "steal_5"
  | "steal_6"
  | "steal_7"
  | "steal_8"
  | "steal_9"
  | "steal_10";

export interface TableRow {
  id: string;
  display_name: string;
  table_number: number;
  is_active: boolean;
  created_at: string;
}

export interface DeviceSessionRow {
  id: string;
  table_id: string;
  session_token: string;
  is_active: boolean;
  connected_at: string;
  last_seen_at: string;
}

export interface RoundRow {
  id: string;
  round_number: number;
  status: RoundStatus;
  first_buzz_table_id: string | null;
  eliminated_table_ids: string[];
  created_at: string;
  resolved_at: string | null;
}

export interface BuzzSignalRow {
  id: string;
  round_id: string;
  table_id: string;
  phase: BuzzPhase;
  server_received_at: string;
}

export interface ScoreLedgerRow {
  id: string;
  table_id: string;
  delta: number;
  reason: string | null;
  created_at: string;
}