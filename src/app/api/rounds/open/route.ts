import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { broadcast } from "@/lib/supabase/broadcast";
import {
  BUZZER_EVENTS,
  CHANNELS,
  type RoundOpenedPayload,
} from "@/lib/types/realtime";

/**
 * POST /api/rounds/open
 * Creates a new round in `buzzer_active` state and broadcasts round:opened.
 */
export async function POST() {
  const supabase = createServiceClient();

  const { data: latest, error: latestErr } = await supabase
    .from("rounds")
    .select("round_number")
    .order("round_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestErr) {
    return NextResponse.json({ error: latestErr.message }, { status: 500 });
  }

  const nextRoundNumber = (latest?.round_number ?? 0) + 1;

  const { data: round, error: insertErr } = await supabase
    .from("rounds")
    .insert({
      round_number: nextRoundNumber,
      status: "buzzer_active",
    })
    .select("id, round_number")
    .single();

  if (insertErr || !round) {
    return NextResponse.json(
      { error: insertErr?.message ?? "Failed to create round" },
      { status: 500 },
    );
  }

  const payload: RoundOpenedPayload = {
    round_id: round.id,
    round_number: round.round_number,
  };

  await broadcast(CHANNELS.BUZZER_ROOM, BUZZER_EVENTS.ROUND_OPENED, payload);

  return NextResponse.json(payload);
}
