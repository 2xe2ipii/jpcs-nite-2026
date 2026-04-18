import { createServiceClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("tables")
    .select("id, display_name, table_number, is_active")
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Table not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}
