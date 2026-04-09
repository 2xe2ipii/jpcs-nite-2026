import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

interface UpdateTableRequest {
  is_active: boolean;
}

/**
 * PATCH /api/tables/[id]
 * Toggles a table active/inactive. Used to deactivate unused tables when
 * fewer attendees show up than expected (SRS §4.2.4).
 *
 * Display name and table number are intentionally NOT mutable per SRS.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await req.json()) as UpdateTableRequest;

  if (typeof body?.is_active !== "boolean") {
    return NextResponse.json(
      { error: "is_active (boolean) is required" },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("tables")
    .update({ is_active: body.is_active })
    .eq("id", id)
    .select("id, display_name, table_number, is_active, created_at")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Table not found" },
      { status: error ? 500 : 404 },
    );
  }

  return NextResponse.json(data);
}
