import { createServiceClient } from "@/lib/supabase/server";
import {
  BUZZER_EVENTS,
  CHANNELS,
  type BuzzFirstPayload,
  type BuzzRequest,
  type BuzzResponse,
} from "@/lib/types/realtime";
import { NextResponse } from "next/server";

function parseBody(value: unknown): BuzzRequest | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const maybeBody = value as Partial<BuzzRequest>;
  if (
    typeof maybeBody.table_id !== "string" ||
    typeof maybeBody.round_id !== "string"
  ) {
    return null;
  }

  const tableId = maybeBody.table_id.trim();
  const roundId = maybeBody.round_id.trim();
  if (tableId.length === 0 || roundId.length === 0) {
    return null;
  }

  return {
    table_id: tableId,
    round_id: roundId,
  };
}

type SubmitBuzzResult =
  | { error: string; status: number }
  | {
      position: number;
      is_first: false;
      phase: string;
    }
  | {
      position: number;
      is_first: true;
      phase: string;
      table_name: string;
      table_number: number;
    };

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

  const { data, error } = await supabase.rpc("submit_buzz", {
    p_table_id: parsedBody.table_id,
    p_round_id: parsedBody.round_id,
  });

  if (error) {
    return NextResponse.json(
      { error: "Failed to process buzz" },
      { status: 500 }
    );
  }

  const result = data as SubmitBuzzResult;

  if ("error" in result) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status }
    );
  }

  const response: BuzzResponse = {
    position: result.position,
    is_first: result.is_first,
  };

  if (!result.is_first) {
    return NextResponse.json(response);
  }

  const payload: BuzzFirstPayload = {
    round_id: parsedBody.round_id,
    table_id: parsedBody.table_id,
    table_name: result.table_name,
    table_number: result.table_number,
    phase: result.phase,
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
