import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface KanbanColumn {
  id: string;
  title: string;
  count: number;
}

interface Props {
  columns: KanbanColumn[];
  renderCards: (columnId: string) => ReactNode;
}

export function KanbanBoard({ columns, renderCards }: Props) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {columns.map((col) => (
        <div
          key={col.id}
          className="flex w-72 shrink-0 flex-col rounded-lg border border-border bg-muted/30"
        >
          <div className="flex items-center justify-between px-3 py-2.5">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {col.title}
            </h3>
            <span className="rounded-full bg-background px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {col.count}
            </span>
          </div>
          <div className={cn("flex flex-col gap-2 px-2 pb-2")}>{renderCards(col.id)}</div>
        </div>
      ))}
    </div>
  );
}