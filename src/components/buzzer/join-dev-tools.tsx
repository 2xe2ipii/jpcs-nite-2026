"use client";

import { useState } from "react";

interface JoinDevToolsProps {
  devForceValid: boolean;
  setDevForceValid: (value: boolean) => void;
  devBypassRegister: boolean;
  setDevBypassRegister: (value: boolean) => void;
  devTableId: string;
  setDevTableId: (value: string) => void;
  devSimulatedError: string;
  setDevSimulatedError: (value: string) => void;
}

export function JoinDevTools({
  devForceValid,
  setDevForceValid,
  devBypassRegister,
  setDevBypassRegister,
  devTableId,
  setDevTableId,
  devSimulatedError,
  setDevSimulatedError,
}: JoinDevToolsProps) {
  const [isOpen, setIsOpen] = useState(true);
  const toggleButtonClass =
    "rounded-lg border border-(--color-gold-primary)/35 bg-(--color-bg-midnight)/70 px-2.5 py-1 text-xs font-semibold text-(--color-text-main) transition hover:border-(--color-gold-primary)/65 hover:bg-(--color-bg-midnight)";
  const inputClass =
    "mt-1 w-full rounded-lg border bg-black/25 px-3 py-2 text-sm text-(--color-text-main) outline-none transition placeholder:text-(--color-text-muted)/70 focus:border-(--color-gold-primary)/70 focus:ring-1 focus:ring-(--color-gold-primary)/50";

  return (
    <aside className="fixed bottom-4 right-4 z-50 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-(--accent-royal)/65 bg-[linear-gradient(170deg,rgba(12,19,34,0.94),rgba(6,10,20,0.94))] p-3 text-(--color-text-main) shadow-[0_18px_44px_rgba(0,0,0,0.6)] backdrop-blur-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold tracking-wide text-(--color-gold-light)">Join Dev Tools</p>
          <p className="mt-0.5 text-[11px] text-(--color-text-muted)">Preview join outcomes without live backend state.</p>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen((value) => !value)}
          className={toggleButtonClass}
        >
          {isOpen ? "Hide" : "Show"}
        </button>
      </div>

      {isOpen ? (
        <div className="mt-3 space-y-3 text-sm">
          <div className="rounded-xl border border-(--accent-royal)/45 bg-black/20 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-(--color-text-muted)">Behavior Toggles</p>
            <div className="mt-2 space-y-2.5">
              <label className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={devForceValid}
                  onChange={(event) => setDevForceValid(event.target.checked)}
                  className="size-4 accent-(--color-gold-primary)"
                />
                <span>Force valid join data</span>
              </label>
              <label className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={devBypassRegister}
                  onChange={(event) => setDevBypassRegister(event.target.checked)}
                  className="size-4 accent-(--color-gold-primary)"
                />
                <span>Bypass register API and mock success</span>
              </label>
            </div>
          </div>

          <div className="rounded-xl border border-(--accent-royal)/45 bg-black/20 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-(--color-text-muted)">Mock Payload</p>
            <label className="mt-2 block">
              <span className="text-xs text-(--color-text-muted)">Mock Table ID</span>
              <input
                type="text"
                value={devTableId}
                onChange={(event) => setDevTableId(event.target.value)}
                className={`${inputClass} border-(--color-gold-primary)/35`}
              />
            </label>
          </div>

          <label className="block rounded-xl border border-(--accent-crimson)/35 bg-(--accent-crimson)/8 p-3">
            <span className="text-xs text-(--color-text-muted)">Simulated Error (optional)</span>
            <input
              type="text"
              value={devSimulatedError}
              onChange={(event) => setDevSimulatedError(event.target.value)}
              placeholder="e.g. This table already has an active representative"
              className={`${inputClass} border-(--accent-crimson)/35`}
            />
          </label>
        </div>
      ) : null}
    </aside>
  );
}
