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

interface RpcResponse {
  position: number;
  is_first: boolean;
  table_id: string;
  display_name: string;
  table_number: number;
  phase: BuzzPhase;
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

  // Consolidate all validation and insertion logic into a single RPC call.
  // This reduces DB round-trips from ~6 to 1.
  const { data, error } = await supabase.rpc("submit_buzz", {
    p_table_id: parsedBody.table_id,
    p_round_id: parsedBody.round_id,
  });

  if (error) {
    // Map database exceptions to appropriate HTTP status codes.
    if (error.code === "P0002") {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error.code === "P0003") {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error.code === "P0004") {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    
    console.error("RPC Error:", error);
    return NextResponse.json(
      { error: "Internal server error during buzz submission" },
      { status: 500 }
    );
  }

  const result = data as RpcResponse;
  const response: BuzzResponse = {
    position: result.position,
    is_first: result.is_first,
  };

  // If this buzz was the first to successfully lock the round, broadcast it.
  if (result.is_first) {
    const payload: BuzzFirstPayload = {
      round_id: parsedBody.round_id,
      table_id: result.table_id,
      table_name: result.display_name,
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
  }

  return NextResponse.json(response);
}
