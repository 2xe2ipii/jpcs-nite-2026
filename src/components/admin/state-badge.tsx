import { cn } from "@/lib/utils";
import type { RoundStatus } from "@/lib/types/realtime";

const STATUS_LABELS: Record<RoundStatus, string> = {
  idle: "Idle",
  buzzer_active: "Buzzer Active",
  buzz_received: "Buzz Received",
  steal_active: "Steal Active",
  resolved: "Resolved",
  aborted: "Aborted",
};

const STATUS_STYLES: Record<RoundStatus, string> = {
  idle:          "bg-surface-2 text-text-muted",
  buzzer_active: "bg-gold/15 text-gold",
  buzz_received: "bg-emerald-500/15 text-emerald-400",
  steal_active:  "bg-amber-500/15 text-amber-400",
  resolved:      "bg-emerald-600/15 text-emerald-300",
  aborted:       "bg-red-500/15 text-red-400",
};

export function StateBadge({
  status,
  className,
}: {
  status: RoundStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide",
        STATUS_STYLES[status],
        className,
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
