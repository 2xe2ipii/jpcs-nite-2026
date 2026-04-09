"use client";

import Link from "next/link";
import { useRoundState } from "@/lib/hooks/use-round-state";
import { useTableScores } from "@/lib/hooks/use-table-scores";
import { StateBadge } from "@/components/admin/state-badge";

export default function AdminDashboardPage() {
  const round = useRoundState();
  const { scores, loading: scoresLoading } = useTableScores();

  const top3 = scores.slice(0, 3);
  const activeTables = scores.filter((s) => s.is_active).length;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-widest text-gold">Overview</p>
        <h2 className="mt-1 text-2xl font-semibold text-white">
          Dashboard
        </h2>
        <p className="mt-1 text-sm text-white/60">
          Live snapshot of buzzer state and scoreboard.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card title="Current Round">
          {round.loading ? (
            <p className="text-sm text-white/50">Loading…</p>
          ) : round.round_id ? (
            <div className="space-y-2">
              <StateBadge status={round.status} />
              <p className="text-2xl font-semibold text-white">
                Round {round.round_number}
              </p>
              {round.first_buzz_table_name && (
                <p className="text-sm text-white/70">
                  First: {round.first_buzz_table_name}
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-white/50">No rounds yet</p>
          )}
        </Card>

        <Card title="Top 3 Tables">
          {scoresLoading ? (
            <p className="text-sm text-white/50">Loading…</p>
          ) : top3.length === 0 ? (
            <p className="text-sm text-white/50">No scores yet</p>
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

        <Card title="Active Tables">
          <p className="text-3xl font-semibold text-white">{activeTables}</p>
          <p className="mt-1 text-sm text-white/50">in play</p>
        </Card>

        <Card title="Quick Actions">
          <div className="flex flex-col gap-2 text-sm">
            <Link className="text-gold hover:underline" href="/admin/buzzer-control">
              → Buzzer Control
            </Link>
            <Link className="text-gold hover:underline" href="/admin/scoring">
              → Scoring
            </Link>
            <Link className="text-gold hover:underline" href="/admin/tables">
              → Tables
            </Link>
          </div>
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
    <div className="rounded-lg border border-night-line bg-night-soft p-4">
      <p className="mb-2 text-[10px] uppercase tracking-widest text-white/50">
        {title}
      </p>
      {children}
    </div>
  );
}
