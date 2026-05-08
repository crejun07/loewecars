import { ChevronLeft, ChevronRight } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import type { StatusTone } from "@/lib/labels";
import { cn } from "@/lib/utils";

interface Props {
  status: string;
  order: readonly string[];
  labels: Record<string, string>;
  tones: Record<string, StatusTone>;
  onChange: (next: string) => void;
  className?: string;
}

/**
 * Inline quick status switcher: chevron arrows on each side of the badge to
 * cycle through the next/previous status without opening the record dialog.
 */
export function QuickStatusToggle({ status, order, labels, tones, onChange, className }: Props) {
  const idx = order.indexOf(status);
  const prev = idx > 0 ? order[idx - 1] : null;
  const next = idx >= 0 && idx < order.length - 1 ? order[idx + 1] : null;

  const stop = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
  };

  return (
    <div className={cn("inline-flex items-center gap-1", className)} onClick={stop}>
      <button
        type="button"
        onClick={(e) => { stop(e); if (prev) onChange(prev); }}
        disabled={!prev}
        title={prev ? `Mover a "${labels[prev]}"` : "Sin estado anterior"}
        className="flex h-5 w-5 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:hover:bg-background"
      >
        <ChevronLeft className="h-3 w-3" />
      </button>
      <StatusBadge label={labels[status] ?? status} tone={tones[status] ?? "neutral"} />
      <button
        type="button"
        onClick={(e) => { stop(e); if (next) onChange(next); }}
        disabled={!next}
        title={next ? `Mover a "${labels[next]}"` : "Sin estado siguiente"}
        className="flex h-5 w-5 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:hover:bg-background"
      >
        <ChevronRight className="h-3 w-3" />
      </button>
    </div>
  );
}