import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { broadcast } from "@/lib/supabase/broadcast";
import {
  CHANNELS,
  SCORE_EVENTS,
  type ScoreUpdatedPayload,
} from "@/lib/types/realtime";

/**
 * DELETE /api/scores/[id]
 * Removes a ledger entry (used by the "Undo last" admin action) and
 * broadcasts the table's recalculated total.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: ledgerId } = await params;
  const supabase = createServiceClient();

  const { data: entry, error: lookupErr } = await supabase
    .from("score_ledger")
    .select("id, table_id, delta, reason")
    .eq("id", ledgerId)
    .single();

  if (lookupErr || !entry) {
    return NextResponse.json(
      { error: "Ledger entry not found" },
      { status: 404 },
    );
  }

  const { error: deleteErr } = await supabase
    .from("score_ledger")
    .delete()
    .eq("id", ledgerId);

  if (deleteErr) {
    return NextResponse.json({ error: deleteErr.message }, { status: 500 });
  }

  const { data: tableScore } = await supabase
    .from("table_scores")
    .select("display_name, current_score")
    .eq("id", entry.table_id)
    .single();

  const payload: ScoreUpdatedPayload = {
    table_id: entry.table_id,
    table_name: tableScore?.display_name ?? "",
    new_total: tableScore?.current_score ?? 0,
    delta: -entry.delta,
    reason: entry.reason ?? null,
  };

  await broadcast(CHANNELS.SCORES, SCORE_EVENTS.SCORE_UPDATED, payload);

  return NextResponse.json(payload);
}
