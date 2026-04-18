import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/tables
 * Returns every table with its currently-active device session (if any),
 * so the Tables admin UI can show "phone connected" / "last seen at" inline.
 */
export async function GET() {
  const supabase = createServiceClient();

  const { data: tables, error: tablesErr } = await supabase
    .from("tables")
    .select("id, display_name, table_number, is_active, created_at")
    .order("table_number", { ascending: true });

  if (tablesErr) {
    return NextResponse.json({ error: tablesErr.message }, { status: 500 });
  }

  const { data: sessions, error: sessionsErr } = await supabase
    .from("device_sessions")
    .select("id, table_id, connected_at, last_seen_at")
    .eq("is_active", true);

  if (sessionsErr) {
    return NextResponse.json({ error: sessionsErr.message }, { status: 500 });
  }

  const sessionByTable = new Map(
    (sessions ?? []).map((s) => [s.table_id, s] as const),
  );

  const enriched = (tables ?? []).map((t) => {
    const session = sessionByTable.get(t.id);
    return {
      ...t,
      active_session: session
        ? {
            id: session.id,
            connected_at: session.connected_at,
            last_seen_at: session.last_seen_at,
          }
        : null,
    };
  });

  return NextResponse.json(enriched);
}

interface CreateTablesRequest {
  count: number;
}

/**
 * POST /api/tables
 * Bulk-creates N tables, numbered sequentially after the current max.
 * Display names are "Table N" per SRS §4.2.4 ("admin-set, unchangeable").
 */
export async function POST(req: NextRequest) {
  const body = (await req.json()) as CreateTablesRequest;

  if (!body?.count || body.count < 1 || body.count > 200) {
    return NextResponse.json(
      { error: "count must be a number between 1 and 200" },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();

  const { data: latest, error: latestErr } = await supabase
    .from("tables")
    .select("table_number")
    .order("table_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestErr) {
    return NextResponse.json({ error: latestErr.message }, { status: 500 });
  }

  const startAt = (latest?.table_number ?? 0) + 1;
  const rows = Array.from({ length: body.count }, (_, i) => ({
    display_name: `Table ${startAt + i}`,
    table_number: startAt + i,
    is_active: true,
  }));

  const { data, error: insertErr } = await supabase
    .from("tables")
    .insert(rows)
    .select("id, display_name, table_number, is_active, created_at");

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  return NextResponse.json({ created: data ?? [] });
}
