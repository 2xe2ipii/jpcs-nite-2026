"use client";

import * as React from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import type { VariantProps } from "class-variance-authority";

/**
 * Two-stage confirmation button — required by SRS §4.2.3
 * ("must have a confirmation step before every action").
 *
 * First click "arms" the button (label changes to "Click again to confirm").
 * Second click within `armDurationMs` fires `onConfirm`. If the user does
 * nothing within that window the button reverts.
 */
export function ConfirmButton({
  children,
  confirmLabel = "Click again to confirm",
  armDurationMs = 3000,
  onConfirm,
  variant,
  size,
  disabled,
  className,
}: {
  children: React.ReactNode;
  confirmLabel?: string;
  armDurationMs?: number;
  onConfirm: () => void | Promise<void>;
  variant?: VariantProps<typeof buttonVariants>["variant"];
  size?: VariantProps<typeof buttonVariants>["size"];
  disabled?: boolean;
  className?: string;
}) {
  const [armed, setArmed] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const disarm = React.useCallback(() => {
    setArmed(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  React.useEffect(() => () => disarm(), [disarm]);

  const handleClick = async () => {
    if (busy) return;
    if (!armed) {
      setArmed(true);
      timerRef.current = setTimeout(disarm, armDurationMs);
      return;
    }
    disarm();
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      type="button"
      variant={armed ? "destructive" : variant}
      size={size}
      disabled={disabled || busy}
      onClick={handleClick}
      className={className}
    >
      {busy ? "Working..." : armed ? confirmLabel : children}
    </Button>
  );
}
