"use client";

import { useRoundState } from "@/lib/hooks/use-round-state";
import { useTableScores } from "@/lib/hooks/use-table-scores";
import { StateBadge } from "@/components/admin/state-badge";

export default function AdminDashboardPage() {
  const round = useRoundState();
  const { scores, loading: scoresLoading } = useTableScores();

  const top3 = scores.slice(0, 3);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-white">Dashboard</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Current Round">
          {round.loading ? (
            <p className="text-sm text-text-muted">Loading…</p>
          ) : round.round_id ? (
            <div className="space-y-2">
              <StateBadge status={round.status} />
              <p className="text-2xl font-semibold text-white">
                Round {round.round_number}
              </p>
              {round.first_buzz_table_name && (
                <p className="text-sm text-text-muted">
                  First buzz: {round.first_buzz_table_name}
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-text-muted">No rounds yet</p>
          )}
        </Card>

        <Card title="Top 3 Tables">
          {scoresLoading ? (
            <p className="text-sm text-text-muted">Loading…</p>
          ) : top3.length === 0 ? (
            <p className="text-sm text-text-muted">No scores yet</p>
          ) : (
            <ol className="space-y-2">
              {top3.map((t, i) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-white/80">
                    <span className="mr-2 inline-block w-4 text-gold">
                      {i + 1}
                    </span>
                    {t.display_name}
                  </span>
                  <span className="font-mono font-semibold text-gold">
                    {t.current_score}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>
    </div>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded border border-surface-3 bg-surface-1 p-4">
      <p className="mb-3 text-[10px] uppercase tracking-widest text-text-muted">
        {title}
      </p>
      {children}
    </div>
  );
}
