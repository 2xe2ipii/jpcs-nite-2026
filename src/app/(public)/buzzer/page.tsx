"use client";

import { BuzzerDevTools } from "@/components/buzzer/buzzer-dev-tools";
import { BuzzerStage } from "@/components/buzzer/buzzer-stage";
import { useBuzzer } from "@/lib/hooks/use-buzzer";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

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
    isSending,
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
      ? { id: "dev-table", name: "Table 7", number: 7 }
      : table;
  const effectiveFirstBuzz = isDevMode
    ? devStatus === "buzz_received"
      ? {
          tableName: devIsFirstBuzz ? "Table 7" : "Table 3",
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

  const isLocked = !effectiveCanBuzz || (!isDevMode && isLoading);

  return (
    <main className="relative flex flex-col min-h-screen items-center justify-between bg-(--color-bg-midnight) px-6 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: "radial-gradient(circle at 50% 50%, color-mix(in srgb, var(--color-bg-curtain) 40%, transparent 60%), var(--color-bg-midnight) 100%)",
        }}
      />

      <BuzzerStage
        tableName={effectiveTable?.name ?? "Validating..."}
        canBuzz={effectiveCanBuzz}
        isEliminated={effectiveIsEliminated}
        status={effectiveStatus}
        firstBuzzTableName={effectiveFirstBuzz?.tableName ?? null}
        buzzPosition={effectiveBuzzPosition}
        isFirstBuzz={effectiveIsFirstBuzz}
        error={effectiveError}
        isLocked={isLocked}
        isSending={isDevMode ? false : isSending}
        onBuzz={handleBuzz}
      />

      {isDevMode ? (
        <div className="absolute bottom-4 left-4 right-4 z-50">
          <BuzzerDevTools
            devBypassSession={devBypassSession}
            setDevBypassSession={setDevBypassSession}
            currentStatus={devStatus}
            setDevStatus={setDevStatus}
            devIsEliminated={devIsEliminated}
            setDevIsEliminated={setDevIsEliminated}
            devIsFirstBuzz={devIsFirstBuzz}
            setDevIsFirstBuzz={setDevIsFirstBuzz}
            devBuzzPosition={devBuzzPosition}
            setDevBuzzPosition={setDevBuzzPosition}
            devError={devError}
            setDevError={setDevError}
          />
        </div>
      ) : null}
    </main>
  );
}

export default function BuzzerPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-(--color-bg-midnight)">
          <p className="text-xs uppercase tracking-widest text-(--color-gold-light)">Loading Interface...</p>
        </main>
      }
    >
      <BuzzerContent />
    </Suspense>
  );
}