"use client";

import { useState } from "react";

interface JoinDevToolsProps {
  devForceValid: boolean;
  setDevForceValid: (value: boolean) => void;
  devBypassRegister: boolean;
  setDevBypassRegister: (value: boolean) => void;
  devTableId: string;
  setDevTableId: (value: string) => void;
  devToken: string;
  setDevToken: (value: string) => void;
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
  devToken,
  setDevToken,
  devSimulatedError,
  setDevSimulatedError,
}: JoinDevToolsProps) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <aside className="fixed bottom-4 right-4 z-50 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-(--accent-royal)/60 bg-(--color-bg-midnight)/92 p-3 text-(--color-text-main) shadow-[0_16px_36px_rgba(0,0,0,0.55)] backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-(--color-gold-light)">Join Dev Tools</p>
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
              checked={devForceValid}
              onChange={(event) => setDevForceValid(event.target.checked)}
            />
            <span>Force valid join data</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={devBypassRegister}
              onChange={(event) => setDevBypassRegister(event.target.checked)}
            />
            <span>Bypass register API and mock success</span>
          </label>
          <label className="block">
            <span className="text-xs text-(--color-text-muted)">Mock Table ID</span>
            <input
              type="text"
              value={devTableId}
              onChange={(event) => setDevTableId(event.target.value)}
              className="mt-1 w-full rounded-md border border-(--color-gold-primary)/35 bg-black/25 px-2 py-1"
            />
          </label>
          <label className="block">
            <span className="text-xs text-(--color-text-muted)">Mock QR Token</span>
            <input
              type="text"
              value={devToken}
              onChange={(event) => setDevToken(event.target.value)}
              className="mt-1 w-full rounded-md border border-(--color-gold-primary)/35 bg-black/25 px-2 py-1"
            />
          </label>
          <label className="block">
            <span className="text-xs text-(--color-text-muted)">Simulated Error (optional)</span>
            <input
              type="text"
              value={devSimulatedError}
              onChange={(event) => setDevSimulatedError(event.target.value)}
              placeholder="e.g. This table already has an active representative"
              className="mt-1 w-full rounded-md border border-(--accent-crimson)/35 bg-black/25 px-2 py-1"
            />
          </label>
        </div>
      ) : null}
    </aside>
  );
}
