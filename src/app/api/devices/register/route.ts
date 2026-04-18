import { createServiceClient } from "@/lib/supabase/server";
import type {
  DeviceRegisterRequest,
  DeviceRegisterResponse,
} from "@/lib/types/realtime";
import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";

// Temporary rollout toggle until qr_tokens is fully deployed.
// TODO(qr-hardening): switch to true and then remove fallback path entirely.
// ADJUSTMENT: drop qr_tokens in favor of table_id URLs and delete toggle and fallback path.


function parseBody(value: unknown): DeviceRegisterRequest | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const maybeBody = value as Partial<DeviceRegisterRequest>;
  if (typeof maybeBody.table_id !== "string") {
    return null;
  }

  const tableId = maybeBody.table_id.trim();
  if (tableId.length === 0) {
    return null;
  }

  return {
    table_id: tableId,
  };
}

function createSessionToken() {
  // Opaque session token stored on the device for reconnection.
  return randomBytes(32).toString("hex");
}

export async function POST(request: Request) {
  let parsedBody: DeviceRegisterRequest | null;

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

  const { data: table, error: tableError } = await supabase
    .from("tables")
    .select("id, display_name, table_number, is_active")
    .eq("id", parsedBody.table_id)
    .maybeSingle();

  if (tableError) {
    return NextResponse.json(
      { error: "Failed to fetch table" },
      { status: 500 }
    );
  }

  if (!table) {
    return NextResponse.json({ error: "Table not found" }, { status: 404 });
  }

  if (!table.is_active) {
    return NextResponse.json({ error: "Table is inactive" }, { status: 400 });
  }

  // TODO(qr-hardening): Once qr_tokens is fully rolled out, make strict mode the default
  // and perform atomic consume with session creation in the same transaction.
  // ADJUSTMENT: qr token validation is removed. Session creation now relies on table_id and existing device_sessions active check.

  // Fast pre-check for UX before insert; DB unique index remains final guard.
  const { data: activeSession, error: activeSessionError } = await supabase
    .from("device_sessions")
    .select("id")
    .eq("table_id", parsedBody.table_id)
    .eq("is_active", true)
    .maybeSingle();

  if (activeSessionError) {
    return NextResponse.json(
      { error: "Failed to check existing session" },
      { status: 500 }
    );
  }

  if (activeSession) {
    return NextResponse.json(
      { error: "This table already has an active representative" },
      { status: 409 }
    );
  }

  const sessionToken = createSessionToken();
  const { error: insertError } = await supabase.from("device_sessions").insert({
    table_id: parsedBody.table_id,
    session_token: sessionToken,
    is_active: true,
  });

  if (insertError) {
    // Unique index conflict means another device won the race to register.
    if (insertError.code === "23505") {
      return NextResponse.json(
        { error: "This table already has an active representative" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create device session" },
      { status: 500 }
    );
  }

  const response: DeviceRegisterResponse = {
    session_token: sessionToken,
    table_id: table.id,
    table_name: table.display_name,
    table_number: table.table_number,
  };

  return NextResponse.json(response);
}
