import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { broadcast } from "@/lib/supabase/broadcast";
import {
  CHANNELS,
  SCORE_EVENTS,
  type ScoreCreateRequest,
  type ScoreUpdatedPayload,
  type TableScoreResponse,
} from "@/lib/types/realtime";

/**
 * GET /api/scores
 * Returns every table with its current score (sum of ledger), ranked desc.
 */
export async function GET() {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("table_scores")
    .select("id, display_name, table_number, is_active, current_score")
    .order("current_score", { ascending: false })
    .order("table_number", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const scores: TableScoreResponse[] = (data ?? []).map((row) => ({
    id: row.id ?? "",
    display_name: row.display_name ?? "",
    table_number: row.table_number ?? 0,
    is_active: row.is_active ?? false,
    current_score: row.current_score ?? 0,
  }));

  return NextResponse.json(scores);
}

/**
 * POST /api/scores
 * Inserts a new ledger entry and broadcasts the new total for that table.
 */
export async function POST(req: NextRequest) {
  const body = (await req.json()) as ScoreCreateRequest;

  if (!body?.table_id || typeof body.delta !== "number") {
    return NextResponse.json(
      { error: "table_id and delta are required" },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();

  const { error: insertErr } = await supabase.from("score_ledger").insert({
    table_id: body.table_id,
    delta: body.delta,
    reason: body.reason ?? null,
  });

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  const { data: tableScore, error: scoreErr } = await supabase
    .from("table_scores")
    .select("display_name, current_score")
    .eq("id", body.table_id)
    .single();

  if (scoreErr || !tableScore) {
    return NextResponse.json(
      { error: scoreErr?.message ?? "Failed to fetch new total" },
      { status: 500 },
    );
  }

  const payload: ScoreUpdatedPayload = {
    table_id: body.table_id,
    table_name: tableScore.display_name ?? "",
    new_total: tableScore.current_score ?? 0,
    delta: body.delta,
    reason: body.reason ?? null,
  };

  await broadcast(CHANNELS.SCORES, SCORE_EVENTS.SCORE_UPDATED, payload);

  return NextResponse.json(payload);
}
