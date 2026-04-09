import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { broadcast } from "@/lib/supabase/broadcast";
import {
  BUZZER_EVENTS,
  CHANNELS,
  type RoundIncorrectRequest,
  type RoundStealPayload,
} from "@/lib/types/realtime";

/**
 * POST /api/rounds/[id]/incorrect
 * Adds the given table to eliminated_table_ids and reopens for steal.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: roundId } = await params;
  const body = (await req.json()) as RoundIncorrectRequest;

  if (!body?.table_id) {
    return NextResponse.json(
      { error: "table_id is required" },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();

  const { data: round, error: roundErr } = await supabase
    .from("rounds")
    .select("id, eliminated_table_ids")
    .eq("id", roundId)
    .single();

  if (roundErr || !round) {
    return NextResponse.json({ error: "Round not found" }, { status: 404 });
  }

  const currentEliminated = round.eliminated_table_ids ?? [];
  if (currentEliminated.includes(body.table_id)) {
    return NextResponse.json(
      { error: "Table already eliminated" },
      { status: 409 },
    );
  }

  const nextEliminated = [...currentEliminated, body.table_id];

  const { error: updateErr } = await supabase
    .from("rounds")
    .update({
      status: "steal_active",
      eliminated_table_ids: nextEliminated,
      first_buzz_table_id: null,
    })
    .eq("id", roundId);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  const { data: eliminatedRows } = await supabase
    .from("tables")
    .select("id, display_name")
    .in("id", nextEliminated);

  const eliminatedNames = (eliminatedRows ?? [])
    .sort(
      (a, b) =>
        nextEliminated.indexOf(a.id) - nextEliminated.indexOf(b.id),
    )
    .map((t) => t.display_name);

  const payload: RoundStealPayload = {
    round_id: roundId,
    eliminated_table_ids: nextEliminated,
    eliminated_table_names: eliminatedNames,
    steal_number: nextEliminated.length,
  };

  await broadcast(CHANNELS.BUZZER_ROOM, BUZZER_EVENTS.ROUND_STEAL, payload);

  return NextResponse.json(payload);
}
