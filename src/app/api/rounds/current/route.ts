import { createServiceClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createServiceClient();

  const { data: round, error } = await supabase
    .from("rounds")
    .select("id, round_number, status, eliminated_table_ids")
    .in("status", ["buzzer_active", "buzz_received", "steal_active"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(round ?? { status: "idle" });
}
