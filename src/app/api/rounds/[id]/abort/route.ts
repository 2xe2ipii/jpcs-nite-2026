import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { broadcast } from "@/lib/supabase/broadcast";
import {
  BUZZER_EVENTS,
  CHANNELS,
  type RoundAbortedPayload,
} from "@/lib/types/realtime";

/**
 * POST /api/rounds/[id]/abort
 * Aborts the round from any non-idle state. Clean reset to idle.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: roundId } = await params;
  const supabase = createServiceClient();

  const { error: updateErr } = await supabase
    .from("rounds")
    .update({
      status: "aborted",
      resolved_at: new Date().toISOString(),
    })
    .eq("id", roundId);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  const payload: RoundAbortedPayload = { round_id: roundId };

  await broadcast(CHANNELS.BUZZER_ROOM, BUZZER_EVENTS.ROUND_ABORTED, payload);

  return NextResponse.json(payload);
}
