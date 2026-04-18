import { createServiceClient } from "@/lib/supabase/server";
import type {
  DeviceValidateRequest,
  DeviceValidateResponse,
} from "@/lib/types/realtime";
import { NextResponse } from "next/server";

function parseBody(value: unknown): DeviceValidateRequest | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const maybeBody = value as Partial<DeviceValidateRequest>;
  if (
    typeof maybeBody.session_token !== "string" ||
    maybeBody.session_token.trim().length === 0
  ) {
    return null;
  }

  return { session_token: maybeBody.session_token.trim() };
}

export async function POST(request: Request) {
  let parsedBody: DeviceValidateRequest | null;

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
      { error: "Failed to validate session" },
      { status: 500 }
    );
  }

  if (!session || !session.is_active) {
    return NextResponse.json({ valid: false }, { status: 401 });
  }

  const { data: table, error: tableError } = await supabase
    .from("tables")
    .select("id, display_name, table_number, is_active")
    .eq("id", session.table_id)
    .maybeSingle();

  if (tableError) {
    return NextResponse.json(
      { error: "Failed to fetch table" },
      { status: 500 }
    );
  }

  if (!table) {
    return NextResponse.json({ valid: false }, { status: 404 });
  }

  if (!table.is_active) {
    return NextResponse.json(
      { valid: false, error: "Table is inactive" },
      { status: 400 }
    );
  }

  // Keep heartbeat metadata fresh for admin monitoring/recovery flows.
  const { error: updateError } = await supabase
    .from("device_sessions")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("session_token", parsedBody.session_token);

  if (updateError) {
    return NextResponse.json(
      { error: "Failed to update session activity" },
      { status: 500 }
    );
  }

  const response: DeviceValidateResponse = {
    valid: true,
    table_id: table.id,
    table_name: table.display_name,
    table_number: table.table_number,
  };

  return NextResponse.json(response);
}
