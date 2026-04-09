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
  idle: "bg-night-soft text-gold border border-night-line",
  buzzer_active: "bg-gold/20 text-gold border border-gold/40 animate-pulse",
  buzz_received: "bg-emerald-500/20 text-emerald-300 border border-emerald-400/40",
  steal_active: "bg-amber-500/20 text-amber-300 border border-amber-400/40 animate-pulse",
  resolved: "bg-emerald-600/20 text-emerald-200 border border-emerald-500/40",
  aborted: "bg-red-500/20 text-red-300 border border-red-400/40",
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
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium uppercase tracking-wide",
        STATUS_STYLES[status],
        className,
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
