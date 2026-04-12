import { createServiceClient } from "@/lib/supabase/server";
import {
  BUZZER_EVENTS,
  CHANNELS,
  type BuzzFirstPayload,
  type BuzzRequest,
  type BuzzResponse,
  type BuzzPhase,
} from "@/lib/types/realtime";
import { NextResponse } from "next/server";

type RoundStatus = "buzzer_active" | "steal_active";

function parseBody(value: unknown): BuzzRequest | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const maybeBody = value as Partial<BuzzRequest>;
  if (
    typeof maybeBody.table_id !== "string" ||
    typeof maybeBody.session_token !== "string" ||
    typeof maybeBody.round_id !== "string"
  ) {
    return null;
  }

  const tableId = maybeBody.table_id.trim();
  const sessionToken = maybeBody.session_token.trim();
  const roundId = maybeBody.round_id.trim();
  if (tableId.length === 0 || sessionToken.length === 0 || roundId.length === 0) {
    return null;
  }

  return {
    table_id: tableId,
    session_token: sessionToken,
    round_id: roundId,
  };
}

function toPhase(status: RoundStatus, eliminatedCount: number): BuzzPhase {
  if (status === "buzzer_active") {
    return "initial";
  }

  // Steal phase number tracks how many tables were eliminated so far.
  const stealNumber = Math.max(1, Math.min(eliminatedCount, 10));
  return `steal_${stealNumber}` as BuzzPhase;
}

export async function POST(request: Request) {
  let parsedBody: BuzzRequest | null;

  try {
    const body = (await request.json()) as unknown;
    parsedBody = parseBody(body);
  } catch {
    parsedBody = null;
  }

  if (!parsedBody) {
    return NextResponse.json(
      { error: "Invalid request payload" },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();

  const { data: session, error: sessionError } = await supabase
    .from("device_sessions")
    .select("table_id, is_active")
    .eq("session_token", parsedBody.session_token)
    .maybeSingle();

  if (sessionError) {
    return NextResponse.json(
      { error: "Failed to validate device session" },
      { status: 500 }
    );
  }

  if (!session || !session.is_active || session.table_id !== parsedBody.table_id) {
    return NextResponse.json({ error: "Invalid session" }, { status: 403 });
  }

  const { data: round, error: roundError } = await supabase
    .from("rounds")
    .select("id, status, eliminated_table_ids, first_buzz_table_id")
    .eq("id", parsedBody.round_id)
    .maybeSingle();

  if (roundError) {
    return NextResponse.json(
      { error: "Failed to fetch round" },
      { status: 500 }
    );
  }

  if (!round) {
    return NextResponse.json({ error: "Round not found" }, { status: 404 });
  }

  if (round.status !== "buzzer_active" && round.status !== "steal_active") {
    return NextResponse.json(
      { error: "Round is not in a buzzable state" },
      { status: 400 }
    );
  }

  if (round.eliminated_table_ids.includes(parsedBody.table_id)) {
    return NextResponse.json(
      { error: "Table is eliminated for this round" },
      { status: 409 }
    );
  }

  const phase = toPhase(round.status, round.eliminated_table_ids.length);

  const { data: insertedBuzz, error: insertError } = await supabase
    .from("buzz_signals")
    .insert({
      round_id: parsedBody.round_id,
      table_id: parsedBody.table_id,
      phase,
    })
    .select("id")
    .single();

  if (insertError || !insertedBuzz) {
    return NextResponse.json(
      { error: "Failed to submit buzz" },
      { status: 500 }
    );
  }

  // Resolve rank from server_received_at ordering in the same round phase.
  const { data: orderedBuzzes, error: orderedBuzzesError } = await supabase
    .from("buzz_signals")
    .select("id")
    .eq("round_id", parsedBody.round_id)
    .eq("phase", phase)
    .order("server_received_at", { ascending: true })
    .order("id", { ascending: true });

  if (orderedBuzzesError || !orderedBuzzes) {
    return NextResponse.json(
      { error: "Failed to resolve buzz ordering" },
      { status: 500 }
    );
  }

  const index = orderedBuzzes.findIndex((buzz) => buzz.id === insertedBuzz.id);
  if (index === -1) {
    return NextResponse.json(
      { error: "Failed to resolve buzz position" },
      { status: 500 }
    );
  }

  const response: BuzzResponse = {
    position: index + 1,
    is_first: index === 0,
  };

  if (!response.is_first) {
    return NextResponse.json(response);
  }

  // Conditional update guards against double-winner races on near-simultaneous buzzes.
  const { data: updatedRound, error: updateRoundError } = await supabase
    .from("rounds")
    .update({
      first_buzz_table_id: parsedBody.table_id,
      status: "buzz_received",
    })
    .eq("id", parsedBody.round_id)
    .is("first_buzz_table_id", null)
    .in("status", ["buzzer_active", "steal_active"])
    .select("id")
    .maybeSingle();

  if (updateRoundError) {
    return NextResponse.json(
      { error: "Failed to finalize first buzz" },
      { status: 500 }
    );
  }

  if (!updatedRound) {
    return NextResponse.json({ ...response, is_first: false });
  }

  const { data: table, error: tableError } = await supabase
    .from("tables")
    .select("id, display_name, table_number")
    .eq("id", parsedBody.table_id)
    .maybeSingle();

  if (tableError || !table) {
    return NextResponse.json(
      { error: "Failed to fetch first buzz table" },
      { status: 500 }
    );
  }

  const payload: BuzzFirstPayload = {
    round_id: parsedBody.round_id,
    table_id: table.id,
    table_name: table.display_name,
    table_number: table.table_number,
    phase,
  };

  const channel = supabase.channel(CHANNELS.BUZZER_ROOM);
  const broadcastResult = await channel.send({
    type: "broadcast",
    event: BUZZER_EVENTS.BUZZ_FIRST,
    payload,
  });

  if (broadcastResult !== "ok") {
    return NextResponse.json(
      { error: "Buzz received, but broadcast failed" },
      { status: 500 }
    );
  }

  return NextResponse.json(response);
}
