"use client";

import { JoinDevTools } from "@/components/buzzer/join-dev-tools";
import { BUZZER_SESSION_TOKEN_KEY } from "@/lib/hooks/use-buzzer";
import type { DeviceRegisterResponse } from "@/lib/types/realtime";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useMemo, useState } from "react";

function JoinTableContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const isDevMode = useMemo(() => searchParams.get("dev") === "1", [searchParams]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [devForceValid, setDevForceValid] = useState(true);
  const [devBypassRegister, setDevBypassRegister] = useState(true);
  const [devTableId, setDevTableId] = useState(
    searchParams.get("_dev_table")?.trim() ?? "demo-table-01"
  );
  const [devToken, setDevToken] = useState(
    searchParams.get("_dev_token")?.trim() ?? "demo-token-01"
  );
  const [devSimulatedError, setDevSimulatedError] = useState("");

  const tableId = useMemo(() => searchParams.get("table")?.trim() ?? "", [searchParams]);
  const qrToken = useMemo(() => searchParams.get("token")?.trim() ?? "", [searchParams]);
  const effectiveTableId = isDevMode && devForceValid ? devTableId : tableId;
  const effectiveQrToken = isDevMode && devForceValid ? devToken : qrToken;
  const canSubmit = effectiveTableId.length > 0 && effectiveQrToken.length > 0;

  async function handleConfirmJoin() {
    if (!canSubmit || isSubmitting) {
      return;
    }

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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          table_id: effectiveTableId,
          qr_token: effectiveQrToken,
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
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{
          background:
            "radial-gradient(120% 90% at 8% -10%, color-mix(in srgb, var(--color-gold-primary) 22%, transparent 78%), transparent 56%), radial-gradient(100% 80% at 88% 10%, color-mix(in srgb, var(--accent-royal) 58%, transparent 42%), transparent 60%), linear-gradient(160deg, var(--color-bg-midnight), #0f1d35 55%, var(--color-bg-curtain))",
        }}
      />

      <section className="relative w-full max-w-md rounded-2xl border border-(--color-gold-primary)/45 bg-(--color-bg-midnight)/76 p-7 text-(--color-text-main) shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur-sm">
        <p className="font-script text-3xl text-(--color-gold-light)">Red Carpet Rewind</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-wide">Join Your Table</h1>
        <p className="mt-3 text-sm text-(--color-text-muted)">
          Confirm this phone as the official representative buzzer device.
        </p>

        <div className="mt-6 space-y-3 rounded-xl border border-(--color-gold-primary)/30 bg-black/20 p-4 text-sm">
          <p>
            <span className="text-(--color-gold-light)">Table ID:</span>{" "}
            <span className="break-all">{effectiveTableId || "Missing"}</span>
          </p>
          <p>
            <span className="text-(--color-gold-light)">QR Token:</span>{" "}
            <span>{effectiveQrToken ? "Detected" : "Missing"}</span>
          </p>
        </div>

        {errorMessage ? (
          <p className="mt-4 rounded-md border border-(--accent-crimson)/60 bg-(--accent-crimson)/12 px-3 py-2 text-sm text-(--color-text-main)">
            {errorMessage}
          </p>
        ) : null}

        <button
          type="button"
          onClick={handleConfirmJoin}
          disabled={!canSubmit || isSubmitting}
          className="mt-6 w-full rounded-xl px-4 py-3 text-sm font-semibold tracking-wide text-(--color-bg-midnight) transition disabled:cursor-not-allowed disabled:opacity-50"
          style={{
            background:
              "linear-gradient(100deg, var(--color-gold-primary), var(--color-gold-light))",
          }}
        >
          {isSubmitting ? "Registering Device..." : "Confirm and Enter Buzzer"}
        </button>

        {!canSubmit ? (
          <p className="mt-3 text-xs text-(--color-text-muted)">
            Invalid QR link. Ask the marshal for the correct table QR.
          </p>
        ) : null}
      </section>

      {isDevMode ? (
        <JoinDevTools
          devForceValid={devForceValid}
          setDevForceValid={setDevForceValid}
          devBypassRegister={devBypassRegister}
          setDevBypassRegister={setDevBypassRegister}
          devTableId={devTableId}
          setDevTableId={setDevTableId}
          devToken={devToken}
          setDevToken={setDevToken}
          devSimulatedError={devSimulatedError}
          setDevSimulatedError={setDevSimulatedError}
        />
      ) : null}
    </main>
  );
}

export default function JoinTablePage() {
  return (
    <Suspense
      fallback={
        <main className="relative flex min-h-screen items-center justify-center px-6 py-10">
          <p className="text-sm text-(--color-text-muted)">Loading join details...</p>
        </main>
      }
    >
      <JoinTableContent />
    </Suspense>
  );
}
