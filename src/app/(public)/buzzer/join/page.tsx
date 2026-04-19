"use client";

import { JoinDevTools } from "@/components/buzzer/join-dev-tools";
import { JoinInvitationCard } from "@/components/buzzer/join-invitation-card";
import { BUZZER_TABLE_ID_KEY } from "@/lib/hooks/use-buzzer";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

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
  const [fetchedTableName, setFetchedTableName] = useState<string | null>(null);
  const [devForceValid, setDevForceValid] = useState(true);
  const [devBypassRegister, setDevBypassRegister] = useState(true);
  const [devTableId, setDevTableId] = useState(
    searchParams.get("_dev_table")?.trim() ?? "demo-table-01"
  );
  const [devSimulatedError, setDevSimulatedError] = useState("");

  const tableId = useMemo(() => searchParams.get("table")?.trim() ?? "", [searchParams]);
  const effectiveTableId = isDevMode && devForceValid ? devTableId : tableId;

  useEffect(() => {
    if (effectiveTableId && effectiveTableId.length > 10) { // Simple UUID-ish check
      fetch(`/api/tables/${effectiveTableId}`)
        .then(res => res.json())
        .then(data => {
          if (data.display_name) setFetchedTableName(data.display_name);
        })
        .catch(() => {});
    }
  }, [effectiveTableId]);

  const tableNumberLabel = useMemo(
    () => fetchedTableName || getTableNumberLabel(effectiveTableId),
    [effectiveTableId, fetchedTableName]
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
      window.localStorage.setItem(BUZZER_TABLE_ID_KEY, effectiveTableId);
      router.replace("/buzzer?dev=1");
      return;
    }

    try {
      const response = await fetch(`/api/tables/${effectiveTableId}`);
      if (!response.ok) {
        setErrorMessage("Table not found or unavailable.");
        setIsSubmitting(false);
        return;
      }

      const table = (await response.json().catch(() => ({}))) as {
        id?: string;
        is_active?: boolean;
      };

      if (!table.id) {
        setErrorMessage("Table not found.");
        setIsSubmitting(false);
        return;
      }

      if (table.is_active === false) {
        setErrorMessage("Table is inactive.");
        setIsSubmitting(false);
        return;
      }

      window.localStorage.setItem(BUZZER_TABLE_ID_KEY, table.id);
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