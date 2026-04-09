"use client";

import { useRoundState } from "@/lib/hooks/use-round-state";
import { StateBadge } from "@/components/admin/state-badge";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { useState } from "react";

export default function BuzzerControlPage() {
  const round = useRoundState();
  const [error, setError] = useState<string | null>(null);

  const api = async (url: string, body?: unknown) => {
    setError(null);
    const res = await fetch(url, {
      method: "POST",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const msg = await res.text().catch(() => `HTTP ${res.status}`);
      setError(msg);
      throw new Error(msg);
    }
    return res.json();
  };

  const openRound = () => api("/api/rounds/open");
  const markCorrect = () => api(`/api/rounds/${round.round_id}/correct`);
  const markIncorrect = () =>
    api(`/api/rounds/${round.round_id}/incorrect`, {
      table_id: round.first_buzz_table_id,
    });
  const abortRound = () => api(`/api/rounds/${round.round_id}/abort`);

  if (round.loading) {
    return (
      <div className="space-y-6">
        <Header />
        <p className="text-sm text-white/50">Loading round state…</p>
      </div>
    );
  }

  const isTerminal =
    round.status === "resolved" || round.status === "aborted";
  const showOpen = !round.round_id || isTerminal;

  return (
    <div className="space-y-6">
      <Header />

      {error && (
        <div className="rounded-md border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Current state indicator */}
      {round.round_id && (
        <div className="flex items-center gap-3">
          <StateBadge status={round.status} />
          <span className="text-sm text-white/60">
            Round {round.round_number}
          </span>
        </div>
      )}

      {/* === IDLE / TERMINAL — Open New Round === */}
      {showOpen && (
        <Panel>
          <p className="mb-4 text-sm text-white/60">
            {round.round_id
              ? `Round ${round.round_number} ${round.status === "resolved" ? "resolved" : "aborted"}.`
              : "No rounds yet."}
            {" "}Ready to open a new buzzer round.
          </p>
          <ConfirmButton
            onConfirm={openRound}
            variant="default"
            size="lg"
            className="bg-gold text-night hover:bg-gold-soft"
          >
            Open Buzzer Round
          </ConfirmButton>
        </Panel>
      )}

      {/* === BUZZER ACTIVE — Waiting for first buzz === */}
      {round.status === "buzzer_active" && (
        <Panel>
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-gold" />
            </span>
            <p className="text-lg font-medium text-white">
              Waiting for first buzz…
            </p>
          </div>
          <p className="mt-2 text-sm text-white/50">
            Buzzers are live. Tables can press now.
          </p>
          <div className="mt-6">
            <ConfirmButton
              onConfirm={abortRound}
              variant="destructive"
              confirmLabel="Click again to abort round"
            >
              Abort Round
            </ConfirmButton>
          </div>
        </Panel>
      )}

      {/* === BUZZ RECEIVED — Judge the answer === */}
      {round.status === "buzz_received" && (
        <Panel>
          <p className="text-sm uppercase tracking-widest text-emerald-400">
            First Buzz
          </p>
          <p className="mt-1 text-3xl font-bold text-white">
            {round.first_buzz_table_name ?? "Unknown table"}
          </p>

          {round.eliminated_table_names.length > 0 && (
            <p className="mt-2 text-sm text-white/50">
              Previously eliminated:{" "}
              {round.eliminated_table_names.join(", ")}
            </p>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <ConfirmButton
              onConfirm={markCorrect}
              variant="default"
              className="bg-emerald-600 text-white hover:bg-emerald-700"
              confirmLabel="Click again — Correct"
            >
              Correct
            </ConfirmButton>
            <ConfirmButton
              onConfirm={markIncorrect}
              variant="default"
              className="bg-amber-600 text-white hover:bg-amber-700"
              confirmLabel="Click again — Incorrect"
            >
              Incorrect
            </ConfirmButton>
            <ConfirmButton
              onConfirm={abortRound}
              variant="destructive"
              confirmLabel="Click again to abort round"
            >
              Abort Round
            </ConfirmButton>
          </div>
        </Panel>
      )}

      {/* === STEAL ACTIVE — Waiting for steal buzz === */}
      {round.status === "steal_active" && (
        <Panel>
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-amber-400" />
            </span>
            <p className="text-lg font-medium text-white">
              Steal round — waiting for buzz…
            </p>
          </div>

          <div className="mt-3">
            <p className="text-xs uppercase tracking-widest text-white/40">
              Eliminated tables
            </p>
            <ul className="mt-1 space-y-1">
              {round.eliminated_table_names.map((name, i) => (
                <li key={i} className="text-sm text-red-300">
                  {name}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-6">
            <ConfirmButton
              onConfirm={abortRound}
              variant="destructive"
              confirmLabel="Click again to abort round"
            >
              Abort Round
            </ConfirmButton>
          </div>
        </Panel>
      )}
    </div>
  );
}

function Header() {
  return (
    <div>
      <p className="text-xs uppercase tracking-widest text-gold">
        Round Lifecycle
      </p>
      <h2 className="mt-1 text-2xl font-semibold text-white">
        Buzzer Control
      </h2>
      <p className="mt-1 text-sm text-white/60">
        Open rounds, judge answers, manage steals.
      </p>
    </div>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-night-line bg-night-soft p-6">
      {children}
    </div>
  );
}
