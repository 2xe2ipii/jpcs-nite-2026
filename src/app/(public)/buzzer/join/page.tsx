"use client";

import { JoinDevTools } from "@/components/buzzer/join-dev-tools";
import { JoinInvitationCard } from "@/components/buzzer/join-invitation-card";
import { BUZZER_SESSION_TOKEN_KEY } from "@/lib/hooks/use-buzzer";
import type { DeviceRegisterResponse } from "@/lib/types/realtime";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";

function getTableNumberLabel(rawValue: string) {
  const trimmed = rawValue.trim();
  if (trimmed.length === 0) return "Missing";

  if (/^\d+$/.test(trimmed)) {
    return trimmed;
  }

  const trailingDigits = trimmed.match(/(\d+)$/)?.[1];
  if (trailingDigits) {
    return String(Number.parseInt(trailingDigits, 10));
  }

  return "Unknown";
}

function JoinTableContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const isDevMode = useMemo(
    () => process.env.NODE_ENV === "development" || searchParams.get("dev") === "1",
    [searchParams]
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [devForceValid, setDevForceValid] = useState(true);
  const [devBypassRegister, setDevBypassRegister] = useState(true);
  const [devTableId, setDevTableId] = useState(
    searchParams.get("_dev_table")?.trim() ?? "demo-table-01"
  );
  const [devSimulatedError, setDevSimulatedError] = useState("");

  const tableId = useMemo(() => searchParams.get("table")?.trim() ?? "", [searchParams]);
  const effectiveTableId = isDevMode && devForceValid ? devTableId : tableId;
  const tableNumberLabel = useMemo(
    () => getTableNumberLabel(effectiveTableId),
    [effectiveTableId]
  );
  const canSubmit = effectiveTableId.length > 0;

  async function handleConfirmJoin() {
    if (!canSubmit || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    if (isDevMode && devBypassRegister) {
      if (devSimulatedError.trim().length > 0) {
        setErrorMessage(devSimulatedError.trim());
        setIsSubmitting(false);
        return;
      }
      const fakeSessionToken = `dev_session_${Date.now()}`;
      window.localStorage.setItem(BUZZER_SESSION_TOKEN_KEY, fakeSessionToken);
      router.replace("/buzzer?dev=1");
      return;
    }

    try {
      const response = await fetch("/api/devices/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          table_id: effectiveTableId,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as
        | DeviceRegisterResponse
        | { error?: string };

      if (!response.ok || !("session_token" in payload)) {
        const errorPayload = payload as { error?: string };
        setErrorMessage(errorPayload.error ?? "Unable to register this device.");
        setIsSubmitting(false);
        return;
      }

      window.localStorage.setItem(BUZZER_SESSION_TOKEN_KEY, payload.session_token);
      router.replace("/buzzer");
    } catch {
      setErrorMessage("Network error while joining table.");
      setIsSubmitting(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-(--color-bg-midnight) px-4 py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-80"
        style={{
          background:
            "radial-gradient(circle at 50% 0%, color-mix(in srgb, var(--color-gold-primary) 15%, transparent 85%), transparent 60%), linear-gradient(180deg, transparent 0%, var(--color-bg-curtain) 100%)",
        }}
      />

      <JoinInvitationCard
        tableNumberLabel={tableNumberLabel}
        errorMessage={errorMessage}
        canSubmit={canSubmit}
        isSubmitting={isSubmitting}
        onConfirmJoin={handleConfirmJoin}
      />

      {isDevMode ? (
        <div className="absolute bottom-4 left-4 right-4 z-50">
           <JoinDevTools
            devForceValid={devForceValid}
            setDevForceValid={setDevForceValid}
            devBypassRegister={devBypassRegister}
            setDevBypassRegister={setDevBypassRegister}
            devTableId={devTableId}
            setDevTableId={setDevTableId}
            devSimulatedError={devSimulatedError}
            setDevSimulatedError={setDevSimulatedError}
          />
        </div>
      ) : null}
    </main>
  );
}

export default function JoinTablePage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-(--color-bg-midnight)">
          <p className="text-xs uppercase tracking-widest text-(--color-gold-light)">Validating Invitation...</p>
        </main>
      }
    >
      <JoinTableContent />
    </Suspense>
  );
}