"use client";

import { useBuzzer } from "@/lib/hooks/use-buzzer";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

function statusLabel(status: string) {
  if (status === "buzzer_active") return "Buzzer Open";
  if (status === "buzz_received") return "Buzz Locked";
  if (status === "steal_active") return "Steal Round";
  return "Waiting for Question";
}

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

function BuzzerDevTools({
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

function BuzzerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDevMode = useMemo(() => searchParams.get("dev") === "1", [searchParams]);
  const {
    isLoading,
    isSessionValid,
    error,
    table,
    status,
    canBuzz,
    isEliminated,
    firstBuzz,
    buzzPosition,
    isFirstBuzz,
    sendBuzz,
  } = useBuzzer();

  const [devBypassSession, setDevBypassSession] = useState(true);
  const [devStatus, setDevStatus] = useState<
    "idle" | "buzzer_active" | "buzz_received" | "steal_active"
  >("idle");
  const [devIsEliminated, setDevIsEliminated] = useState(false);
  const [devIsFirstBuzz, setDevIsFirstBuzz] = useState(false);
  const [devBuzzPosition, setDevBuzzPosition] = useState<number | null>(null);
  const [devError, setDevError] = useState("");

  useEffect(() => {
    if (!isDevMode && !isLoading && !isSessionValid) {
      router.replace("/buzzer/join");
    }
  }, [isDevMode, isLoading, isSessionValid, router]);

  const effectiveStatus = isDevMode ? devStatus : status;
  const effectiveCanBuzz = isDevMode
    ? devStatus === "buzzer_active" || (devStatus === "steal_active" && !devIsEliminated)
    : canBuzz;
  const effectiveIsEliminated = isDevMode ? devIsEliminated : isEliminated;
  const effectiveIsFirstBuzz = isDevMode ? devIsFirstBuzz : isFirstBuzz;
  const effectiveBuzzPosition = isDevMode ? devBuzzPosition : buzzPosition;
  const effectiveError = isDevMode ? (devError.trim() || error) : error;
  const effectiveTable =
    isDevMode && devBypassSession
      ? { id: "dev-table", name: "Demo Table", number: 7 }
      : table;
  const effectiveFirstBuzz = isDevMode
    ? devStatus === "buzz_received"
      ? {
          tableName: devIsFirstBuzz ? "Demo Table" : "Table 3",
          tableNumber: devIsFirstBuzz ? 7 : 3,
        }
      : null
    : firstBuzz;

  async function handleBuzz() {
    if (isDevMode) {
      if (!effectiveCanBuzz) {
        setDevError("Buzz is currently locked in this preview state.");
        return;
      }

      setDevError("");
      setDevStatus("buzz_received");
      setDevIsFirstBuzz(true);
      setDevBuzzPosition(1);
      return;
    }

    await sendBuzz();
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 12% -12%, color-mix(in srgb, var(--color-gold-primary) 20%, transparent 80%), transparent 52%), radial-gradient(95% 75% at 84% 12%, color-mix(in srgb, var(--accent-royal) 60%, transparent 40%), transparent 64%), linear-gradient(168deg, var(--color-bg-midnight), #0e1a32 58%, var(--color-bg-curtain))",
        }}
      />

      <section className="relative w-full max-w-lg rounded-3xl border border-(--color-gold-primary)/45 bg-(--color-bg-midnight)/74 p-7 text-(--color-text-main) shadow-[0_24px_70px_rgba(0,0,0,0.52)] backdrop-blur-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-script text-3xl text-(--color-gold-light)">Nightsky of Golden Dreams</p>
            <h1 className="mt-1 text-3xl font-semibold">Table Buzzer</h1>
          </div>
          <span className="rounded-full border border-(--color-gold-primary)/55 px-3 py-1 text-xs tracking-wide text-(--color-gold-light)">
            {statusLabel(effectiveStatus)}
          </span>
        </div>

        <div className="mt-5 rounded-xl border border-(--color-gold-primary)/25 bg-black/20 p-4 text-sm">
          <p className="text-(--color-text-muted)">Representative Device</p>
          <p className="mt-1 text-base font-medium">
            {effectiveTable
              ? `${effectiveTable.name} (Table ${effectiveTable.number})`
              : "Validating session..."}
          </p>
        </div>

        {effectiveStatus === "idle" ? (
          <p className="mt-5 text-sm text-(--color-text-muted)">
            Waiting for the next trivia question. Stay ready.
          </p>
        ) : null}

        {effectiveFirstBuzz ? (
          <div className="mt-5 rounded-xl border border-(--color-gold-primary)/30 bg-(--color-gold-primary)/10 p-4 text-sm">
            <p className="text-(--color-gold-light)">First Buzz</p>
            <p className="mt-1 font-medium">
              {effectiveFirstBuzz.tableName} (Table {effectiveFirstBuzz.tableNumber})
            </p>
          </div>
        ) : null}

        {effectiveIsEliminated ? (
          <div className="mt-5 rounded-xl border border-(--accent-crimson)/60 bg-(--accent-crimson)/12 p-4 text-sm">
            You are eliminated for this question and cannot buzz in this steal phase.
          </div>
        ) : null}

        {effectiveBuzzPosition ? (
          <p className="mt-5 text-sm text-(--color-text-muted)">
            Buzz position: <span className="text-(--color-text-main)">{effectiveBuzzPosition}</span>
            {effectiveIsFirstBuzz ? " (You buzzed first)" : ""}
          </p>
        ) : null}

        {effectiveError ? (
          <p className="mt-5 rounded-md border border-(--accent-crimson)/60 bg-(--accent-crimson)/12 px-3 py-2 text-sm">
            {effectiveError}
          </p>
        ) : null}

        <button
          type="button"
          onClick={handleBuzz}
          disabled={!effectiveCanBuzz || (!isDevMode && isLoading)}
          className="mt-7 w-full rounded-2xl px-4 py-4 text-lg font-semibold tracking-wide text-(--color-bg-midnight) transition disabled:cursor-not-allowed disabled:opacity-40"
          style={{
            background:
              "linear-gradient(110deg, var(--color-gold-primary), var(--color-gold-light))",
            boxShadow: "0 10px 30px color-mix(in srgb, var(--color-gold-primary) 45%, transparent 55%)",
          }}
        >
          {effectiveCanBuzz ? "BUZZ" : "LOCKED"}
        </button>

      </section>

      {isDevMode ? (
        <BuzzerDevTools
          devBypassSession={devBypassSession}
          setDevBypassSession={setDevBypassSession}
          setDevStatus={setDevStatus}
          setDevIsEliminated={setDevIsEliminated}
          setDevIsFirstBuzz={setDevIsFirstBuzz}
          setDevBuzzPosition={setDevBuzzPosition}
          devError={devError}
          setDevError={setDevError}
        />
      ) : null}
    </main>
  );
}

export default function BuzzerPage() {
  return (
    <Suspense
      fallback={
        <main className="relative flex min-h-screen items-center justify-center px-6 py-10">
          <p className="text-sm text-(--color-text-muted)">Loading buzzer...</p>
        </main>
      }
    >
      <BuzzerContent />
    </Suspense>
  );
}
