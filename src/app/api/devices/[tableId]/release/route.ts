import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * POST /api/devices/[tableId]/release
 * Invalidates all active device sessions for this table so a new phone can
 * register. The table's score is unaffected (scores live on the table entity,
 * not the device session).
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ tableId: string }> },
) {
  const { tableId } = await params;
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("device_sessions")
    .update({ is_active: false })
    .eq("table_id", tableId)
    .eq("is_active", true)
    .select("id");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ released_count: data?.length ?? 0 });
}
