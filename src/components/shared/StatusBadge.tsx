import { cn } from "@/lib/utils";
import { dotClass, toneClass, type StatusTone } from "@/lib/labels";

interface Props {
  label: string;
  tone: StatusTone;
  className?: string;
}

export function StatusBadge({ label, tone, className }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
        toneClass[tone],
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", dotClass[tone])} />
      {label}
    </span>
  );
}