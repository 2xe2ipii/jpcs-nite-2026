"use client";

import { useState } from "react";

interface BuzzerDevToolsProps {
  devBypassSession: boolean;
  setDevBypassSession: (value: boolean) => void;
  setDevStatus: (value: "idle" | "buzzer_active" | "buzz_received" | "steal_active") => void;
  setDevIsEliminated: (updater: (value: boolean) => boolean) => void;
  setDevIsFirstBuzz: (updater: (value: boolean) => boolean) => void;
  setDevBuzzPosition: (value: number | null) => void;
  devError: string;
  setDevError: (value: string) => void;
}

export function BuzzerDevTools({
  devBypassSession,
  setDevBypassSession,
  setDevStatus,
  setDevIsEliminated,
  setDevIsFirstBuzz,
  setDevBuzzPosition,
  devError,
  setDevError,
}: BuzzerDevToolsProps) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <aside className="fixed bottom-4 right-4 z-50 w-96 max-w-[calc(100vw-2rem)] rounded-xl border border-(--accent-royal)/60 bg-(--color-bg-midnight)/92 p-3 text-(--color-text-main) shadow-[0_16px_36px_rgba(0,0,0,0.55)] backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-(--color-gold-light)">Buzzer Dev Tools</p>
        <button
          type="button"
          onClick={() => setIsOpen((value) => !value)}
          className="rounded-md border border-(--color-gold-primary)/35 px-2 py-1 text-xs"
        >
          {isOpen ? "Hide" : "Show"}
        </button>
      </div>

      {isOpen ? (
        <div className="mt-3 space-y-3 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={devBypassSession}
              onChange={(event) => setDevBypassSession(event.target.checked)}
            />
            <span>Bypass session/token requirement</span>
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setDevStatus("idle")}
              className="rounded-md border border-(--color-gold-primary)/45 px-2 py-1"
            >
              Idle
            </button>
            <button
              type="button"
              onClick={() => setDevStatus("buzzer_active")}
              className="rounded-md border border-(--color-gold-primary)/45 px-2 py-1"
            >
              Buzzer Open
            </button>
            <button
              type="button"
              onClick={() => setDevStatus("buzz_received")}
              className="rounded-md border border-(--color-gold-primary)/45 px-2 py-1"
            >
              Buzz Received
            </button>
            <button
              type="button"
              onClick={() => setDevStatus("steal_active")}
              className="rounded-md border border-(--color-gold-primary)/45 px-2 py-1"
            >
              Steal Active
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setDevIsEliminated((value) => !value)}
              className="rounded-md border border-(--accent-crimson)/45 px-2 py-1"
            >
              Toggle Eliminated
            </button>
            <button
              type="button"
              onClick={() => setDevIsFirstBuzz((value) => !value)}
              className="rounded-md border border-(--color-gold-primary)/45 px-2 py-1"
            >
              Toggle First Buzz (You)
            </button>
            <button
              type="button"
              onClick={() => setDevBuzzPosition(1)}
              className="rounded-md border border-(--color-gold-primary)/45 px-2 py-1"
            >
              Position 1
            </button>
            <button
              type="button"
              onClick={() => setDevBuzzPosition(2)}
              className="rounded-md border border-(--color-gold-primary)/45 px-2 py-1"
            >
              Position 2
            </button>
            <button
              type="button"
              onClick={() => setDevBuzzPosition(null)}
              className="rounded-md border border-(--color-gold-primary)/45 px-2 py-1"
            >
              Clear Position
            </button>
          </div>

          <label className="block">
            <span className="text-xs text-(--color-text-muted)">Simulated error</span>
            <input
              type="text"
              value={devError}
              onChange={(event) => setDevError(event.target.value)}
              placeholder="e.g. Failed to send buzz"
              className="mt-1 w-full rounded-md border border-(--accent-crimson)/35 bg-black/25 px-2 py-1"
            />
          </label>
        </div>
      ) : null}
    </aside>
  );
}
