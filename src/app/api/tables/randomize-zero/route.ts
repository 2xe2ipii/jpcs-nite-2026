import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * POST /api/tables/randomize-zero
 * Assigns a random tiebreak_order to all active tables with a current score of 0.
 * Tables with scores > 0 are unaffected — they already sort by first_scored_at.
 */
export async function POST() {
  const supabase = createServiceClient();

  const { data: zeroTables, error: fetchErr } = await supabase
    .from("table_scores")
    .select("id")
    .eq("current_score", 0)
    .eq("is_active", true);

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  }

  if (!zeroTables || zeroTables.length === 0) {
    return NextResponse.json({ updated: 0 });
  }

  // Fisher-Yates shuffle of indices 1..N
  const orders = Array.from({ length: zeroTables.length }, (_, i) => i + 1);
  for (let i = orders.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [orders[i], orders[j]] = [orders[j], orders[i]];
  }

  const updates = zeroTables.map((t, i) =>
    supabase
      .from("tables")
      .update({ tiebreak_order: orders[i] })
      .eq("id", t.id ?? ""),
  );

  const results = await Promise.all(updates);
  const firstErr = results.find((r) => r.error)?.error;
  if (firstErr) {
    return NextResponse.json({ error: firstErr.message }, { status: 500 });
  }

  return NextResponse.json({ updated: zeroTables.length });
}
