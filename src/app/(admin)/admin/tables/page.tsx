"use client";

import { useEffect, useState } from "react";
// Teammate: you'll need this import for the full implementation:
// import { ConfirmButton } from "@/components/admin/confirm-button";
import type { TableRow } from "@/lib/types/realtime";

/**
 * TASK ASSIGNED — Teammate B: Table Management UI
 * See docs/admin-handoff.md "Task B: Table Management UI" for full requirements.
 *
 * SRS §4.2.4 requirements to implement on this page:
 *
 * TODO: Display all tables in a list/grid with status (active/inactive, connected device)
 *       → GET /api/tables returns tables with device session info
 *
 * TODO: Bulk-create tables form — enter a count, submit
 *       → POST /api/tables with { count: N }
 *       → wrap in <ConfirmButton>
 *
 * TODO: Toggle table active/inactive
 *       → PATCH /api/tables/:id with { is_active: boolean }
 *
 * TODO: Release (disconnect) a device from a table
 *       → POST /api/devices/:tableId/release
 *       → wrap in <ConfirmButton> with destructive variant
 *
 * TODO: Show device connection status per table (connected_at, last_seen_at)
 *
 * Reference implementation: see /admin/buzzer-control/page.tsx for patterns
 * (API calls, error handling, ConfirmButton usage, layout conventions).
 */

interface TableWithDevice extends TableRow {
  device_session?: {
    id: string;
    is_active: boolean;
    connected_at: string;
    last_seen_at: string;
  } | null;
}

export default function TableManagementPage() {
  const [tables, setTables] = useState<TableWithDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/tables")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => setTables(data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-white">Tables</h2>
      </div>

      <div className="rounded-lg border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
        <strong>Task assigned</strong> — See{" "}
        <code className="rounded bg-night px-1 text-xs">
          docs/admin-handoff.md
        </code>{" "}
        &quot;Task B: Table Management UI&quot; for full requirements and
        acceptance criteria.
      </div>

      {/* Placeholder — teammate replaces this with the full tables UI */}
      <div className="rounded-lg border border-night-line bg-night-soft p-6">
        {loading ? (
          <p className="text-sm text-white/50">Loading tables…</p>
        ) : error ? (
          <p className="text-sm text-red-300">Error: {error}</p>
        ) : tables.length === 0 ? (
          <p className="text-sm text-white/50">
            No tables yet. Use POST /api/tables to create some.
          </p>
        ) : (
          <div>
            <p className="mb-3 text-xs uppercase tracking-widest text-white/40">
              Registered Tables (read-only preview)
            </p>
            <div className="space-y-2">
              {tables.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between rounded-md border border-night-line/50 px-4 py-2"
                >
                  <div>
                    <span className="text-sm font-medium text-white/80">
                      {t.display_name}
                    </span>
                    <span
                      className={`ml-3 text-xs ${t.is_active ? "text-emerald-400" : "text-red-400"}`}
                    >
                      {t.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <span className="text-xs text-white/40">
                    {t.device_session?.is_active ? "Device connected" : "No device"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
