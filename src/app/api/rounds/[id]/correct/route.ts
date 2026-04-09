import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { broadcast } from "@/lib/supabase/broadcast";
import {
  BUZZER_EVENTS,
  CHANNELS,
  type RoundResolvedPayload,
} from "@/lib/types/realtime";

/**
 * POST /api/rounds/[id]/correct
 * Marks the first-buzzing table as correct and resolves the round.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: roundId } = await params;
  const supabase = createServiceClient();

  const { data: round, error: roundErr } = await supabase
    .from("rounds")
    .select("id, first_buzz_table_id")
    .eq("id", roundId)
    .single();

  if (roundErr || !round) {
    return NextResponse.json({ error: "Round not found" }, { status: 404 });
  }

  let winningTableName: string | null = null;
  if (round.first_buzz_table_id) {
    const { data: table } = await supabase
      .from("tables")
      .select("display_name")
      .eq("id", round.first_buzz_table_id)
      .single();
    winningTableName = table?.display_name ?? null;
  }

  const { error: updateErr } = await supabase
    .from("rounds")
    .update({
      status: "resolved",
      resolved_at: new Date().toISOString(),
    })
    .eq("id", roundId);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  const payload: RoundResolvedPayload = {
    round_id: roundId,
    winning_table_id: round.first_buzz_table_id,
    winning_table_name: winningTableName,
  };

  await broadcast(CHANNELS.BUZZER_ROOM, BUZZER_EVENTS.ROUND_RESOLVED, payload);

  return NextResponse.json(payload);
}
