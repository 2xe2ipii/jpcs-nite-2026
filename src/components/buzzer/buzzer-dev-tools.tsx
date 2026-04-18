"use client";

import { useState } from "react";

interface BuzzerDevToolsProps {
  devBypassSession: boolean;
  setDevBypassSession: (value: boolean) => void;
  currentStatus: "idle" | "buzzer_active" | "buzz_received" | "steal_active";
  setDevStatus: (value: "idle" | "buzzer_active" | "buzz_received" | "steal_active") => void;
  devIsEliminated: boolean;
  setDevIsEliminated: (updater: (value: boolean) => boolean) => void;
  devIsFirstBuzz: boolean;
  setDevIsFirstBuzz: (updater: (value: boolean) => boolean) => void;
  devBuzzPosition: number | null;
  setDevBuzzPosition: (value: number | null) => void;
  devError: string;
  setDevError: (value: string) => void;
}

export function BuzzerDevTools({
  devBypassSession,
  setDevBypassSession,
  currentStatus,
  setDevStatus,
  devIsEliminated,
  setDevIsEliminated,
  devIsFirstBuzz,
  setDevIsFirstBuzz,
  devBuzzPosition,
  setDevBuzzPosition,
  devError,
  setDevError,
}: BuzzerDevToolsProps) {
  const [isOpen, setIsOpen] = useState(true);
  const actionButtonClass =
    "rounded-lg border px-2.5 py-1.5 text-xs font-semibold text-(--color-text-main) transition hover:-translate-y-px";
  const inputClass =
    "mt-1 w-full rounded-lg border border-(--accent-crimson)/35 bg-black/25 px-3 py-2 text-sm text-(--color-text-main) outline-none transition placeholder:text-(--color-text-muted)/70 focus:border-(--accent-crimson)/60 focus:ring-1 focus:ring-(--accent-crimson)/45";
  const getStatusButtonClass = (buttonStatus: "idle" | "buzzer_active" | "buzz_received" | "steal_active") => {
    const isActive = currentStatus === buttonStatus;

    if (isActive) {
      return `${actionButtonClass} border-(--color-gold-light)/95 bg-(--color-gold-primary)/35 text-(--color-gold-light) ring-2 ring-(--color-gold-primary)/65 shadow-[0_0_0_1px_rgba(236,192,82,0.45)]`;
    }

    return `${actionButtonClass} border-(--color-gold-primary)/45 bg-(--color-bg-midnight)/70 hover:border-(--color-gold-primary)/70 hover:bg-(--color-bg-midnight)`;
  };

  return (
    <aside className="fixed bottom-4 right-4 z-50 w-96 max-w-[calc(100vw-2rem)] rounded-2xl border border-(--accent-royal)/65 bg-[linear-gradient(170deg,rgba(12,19,34,0.94),rgba(6,10,20,0.94))] p-3 text-(--color-text-main) shadow-[0_18px_44px_rgba(0,0,0,0.6)] backdrop-blur-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold tracking-wide text-(--color-gold-light)">Buzzer Dev Tools</p>
          <p className="mt-0.5 text-[11px] text-(--color-text-muted)">Simulate buzzer states for rapid visual QA.</p>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen((value) => !value)}
          className="rounded-lg border border-(--color-gold-primary)/35 bg-(--color-bg-midnight)/70 px-2.5 py-1 text-xs font-semibold text-(--color-text-main) transition hover:border-(--color-gold-primary)/65 hover:bg-(--color-bg-midnight)"
        >
          {isOpen ? "Hide" : "Show"}
        </button>
      </div>

      {isOpen ? (
        <div className="mt-3 space-y-3 text-sm">
          <div className="rounded-xl border border-(--accent-royal)/45 bg-black/20 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-(--color-text-muted)">Session</p>
            <label className="mt-2 flex items-center gap-2.5">
              <input
                type="checkbox"
                checked={devBypassSession}
                onChange={(event) => setDevBypassSession(event.target.checked)}
                className="size-4 accent-(--color-gold-primary)"
              />
              <span>Bypass session/token requirement</span>
            </label>
          </div>

          <div className="rounded-xl border border-(--accent-royal)/45 bg-black/20 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-(--color-text-muted)">Round Status</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setDevStatus("idle")}
                className={getStatusButtonClass("idle")}
              >
                Idle
              </button>
              <button
                type="button"
                onClick={() => setDevStatus("buzzer_active")}
                className={getStatusButtonClass("buzzer_active")}
              >
                Buzzer Open
              </button>
              <button
                type="button"
                onClick={() => setDevStatus("buzz_received")}
                className={getStatusButtonClass("buzz_received")}
              >
                Buzz Received
              </button>
              <button
                type="button"
                onClick={() => setDevStatus("steal_active")}
                className={getStatusButtonClass("steal_active")}
              >
                Steal Active
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-(--accent-royal)/45 bg-black/20 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-(--color-text-muted)">Player State</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setDevIsEliminated((value) => !value)}
                className={`${actionButtonClass} ${
                  devIsEliminated
                    ? "border-(--accent-crimson)/95 bg-(--accent-crimson)/35 ring-2 ring-(--accent-crimson)/65"
                    : "border-(--accent-crimson)/45 bg-(--accent-crimson)/15 hover:border-(--accent-crimson)/70 hover:bg-(--accent-crimson)/20"
                }`}
              >
                Toggle Eliminated
              </button>
              <button
                type="button"
                onClick={() => setDevIsFirstBuzz((value) => !value)}
                className={`${actionButtonClass} ${
                  devIsFirstBuzz
                    ? "border-(--color-gold-light)/95 bg-(--color-gold-primary)/35 text-(--color-gold-light) ring-2 ring-(--color-gold-primary)/65"
                    : "border-(--color-gold-primary)/45 bg-(--color-bg-midnight)/70 hover:border-(--color-gold-primary)/70 hover:bg-(--color-bg-midnight)"
                }`}
              >
                Toggle First Buzz (You)
              </button>
              <button
                type="button"
                onClick={() => setDevBuzzPosition(1)}
                className={`${actionButtonClass} ${
                  devBuzzPosition === 1
                    ? "border-(--color-gold-light)/95 bg-(--color-gold-primary)/35 text-(--color-gold-light) ring-2 ring-(--color-gold-primary)/65"
                    : "border-(--color-gold-primary)/45 bg-(--color-bg-midnight)/70 hover:border-(--color-gold-primary)/70 hover:bg-(--color-bg-midnight)"
                }`}
              >
                Position 1
              </button>
              <button
                type="button"
                onClick={() => setDevBuzzPosition(2)}
                className={`${actionButtonClass} ${
                  devBuzzPosition === 2
                    ? "border-(--color-gold-light)/95 bg-(--color-gold-primary)/35 text-(--color-gold-light) ring-2 ring-(--color-gold-primary)/65"
                    : "border-(--color-gold-primary)/45 bg-(--color-bg-midnight)/70 hover:border-(--color-gold-primary)/70 hover:bg-(--color-bg-midnight)"
                }`}
              >
                Position 2
              </button>
              <button
                type="button"
                onClick={() => setDevBuzzPosition(null)}
                className={`${actionButtonClass} ${
                  devBuzzPosition === null
                    ? "border-(--color-gold-light)/95 bg-(--color-gold-primary)/35 text-(--color-gold-light) ring-2 ring-(--color-gold-primary)/65"
                    : "border-(--color-gold-primary)/45 bg-(--color-bg-midnight)/70 hover:border-(--color-gold-primary)/70 hover:bg-(--color-bg-midnight)"
                }`}
              >
                Clear Position
              </button>
            </div>
          </div>

          <label className="block rounded-xl border border-(--accent-crimson)/35 bg-(--accent-crimson)/8 p-3">
            <span className="text-xs text-(--color-text-muted)">Simulated error</span>
            <input
              type="text"
              value={devError}
              onChange={(event) => setDevError(event.target.value)}
              placeholder="e.g. Failed to send buzz"
              className={inputClass}
            />
          </label>
        </div>
      ) : null}
    </aside>
  );
}
