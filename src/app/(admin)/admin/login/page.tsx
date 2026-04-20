"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function AdminLoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/admin/buzzer-control";

  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      router.replace(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-night px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 rounded-lg border border-surface-3 bg-surface-1 p-6"
      >
        <div>
          <h1 className="text-xl font-semibold text-white">Admin Login</h1>
          <p className="mt-1 text-sm text-white/50">
            Enter the admin password to continue.
          </p>
        </div>

        <input
          type="password"
          autoFocus
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={submitting}
          placeholder="Password"
          className="h-10 w-full rounded border border-surface-3 bg-surface-2 px-3 text-sm text-white placeholder:text-white/30 focus:border-gold/50 focus:outline-none disabled:opacity-40"
        />

        {error && <p className="text-sm text-red-400">{error}</p>}

        <Button
          type="submit"
          disabled={submitting || !password}
          className="w-full bg-gold font-medium text-night hover:bg-gold-soft"
        >
          {submitting ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </div>
  );
}
