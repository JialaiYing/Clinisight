"use client";

import { useState } from "react";
import { ChevronDown, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  TRASH_RETENTION_DAYS,
  type HistoryEntry,
  type TrashEntry,
} from "@/lib/history";
import {
  OUTCOME_LABELS,
  formatPercent,
  overallRiskColor,
  overallRiskLabel,
  topOutcome,
} from "@/lib/risk";
import { cn } from "@/lib/utils";

const DAY_MS = 24 * 60 * 60 * 1000;

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function daysRemaining(deletedAt: string): number {
  const elapsedMs = Date.now() - new Date(deletedAt).getTime();
  const remainingMs = TRASH_RETENTION_DAYS * DAY_MS - elapsedMs;
  return Math.max(0, Math.ceil(remainingMs / DAY_MS));
}

function statusMeta(historyCount: number, trashCount: number, open: boolean): string {
  const parts: string[] = [];
  if (historyCount > 0) {
    parts.push(`${historyCount} saved`);
    if (!open) parts.push("Click to reopen");
  } else if (trashCount > 0) {
    parts.push("None active");
  } else {
    parts.push("None yet");
  }
  if (trashCount > 0) {
    parts.push(`${trashCount} deleted`);
  }
  return parts.join(" · ");
}

export function PastPredictions({
  history,
  trash,
  activeEntryId,
  onSelect,
  onDelete,
  onClear,
  onRestore,
  open,
  onOpenChange,
}: {
  history: HistoryEntry[];
  trash: TrashEntry[];
  activeEntryId: string | null;
  onSelect: (entry: HistoryEntry) => void;
  onDelete: (id: string) => void;
  onClear: () => void;
  onRestore: (id: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [showDeleted, setShowDeleted] = useState(false);

  return (
    <div>
      <div className="flex items-center gap-3 py-4">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left"
          aria-expanded={open}
          onClick={() => onOpenChange(!open)}
        >
          <span className="min-w-0">
            <span className="text-base font-semibold tracking-tight text-foreground">
              Past predictions
            </span>
            <span className="mt-0.5 block text-sm font-normal text-muted-foreground sm:mt-0 sm:ml-2 sm:inline">
              {statusMeta(history.length, trash.length, open)}
            </span>
          </span>
          <ChevronDown
            className={cn(
              "size-4 shrink-0 text-muted-foreground transition-transform",
              open && "rotate-180"
            )}
          />
        </button>
        {open && history.length > 0 && (
          <Button type="button" variant="ghost" size="sm" onClick={onClear}>
            Clear all
          </Button>
        )}
      </div>

      {open && (
        <div className="pb-6">
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Run a prediction to save it here. Cases stay in this browser for{" "}
              {TRASH_RETENTION_DAYS} days after delete.
            </p>
          ) : (
            <ul className="divide-y divide-border border-y border-border">
              {history.map((entry) => {
                const [topKey, topProbability] = topOutcome(entry.result.risks);
                const color = overallRiskColor(entry.result.overall_risk_level);
                const isActive = entry.id === activeEntryId;
                return (
                  <li key={entry.id}>
                    <div
                      className={cn(
                        "flex items-stretch gap-2 py-1",
                        isActive && "bg-muted/50"
                      )}
                    >
                      <button
                        type="button"
                        className="flex min-w-0 flex-1 items-center justify-between gap-4 py-2 text-left"
                        onClick={() => onSelect(entry)}
                      >
                        <div className="min-w-0">
                          <div className="text-sm text-foreground">
                            Age {entry.patient.age} ·{" "}
                            {entry.patient.sex === "female" ? "Female" : "Male"}
                            {isActive && (
                              <span className="ml-2 text-xs font-medium text-muted-foreground">
                                Open
                              </span>
                            )}
                          </div>
                          <div className="font-mono text-xs text-muted-foreground">
                            {formatTimestamp(entry.createdAt)}
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-3 text-right">
                          <div>
                            <div className="text-sm text-foreground">
                              {OUTCOME_LABELS[topKey] ?? topKey}
                            </div>
                            <div className="font-mono text-xs text-muted-foreground">
                              {formatPercent(topProbability)}
                            </div>
                          </div>
                          <span
                            className="hidden rounded-md border px-2 py-0.5 text-xs font-medium sm:inline"
                            style={{ color, borderColor: color }}
                          >
                            {overallRiskLabel(entry.result.overall_risk_level)}
                          </span>
                        </div>
                      </button>
                      <div className="flex items-center pr-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Move to deleted"
                          onClick={() => onDelete(entry.id)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {trash.length > 0 && (
            <div className="mt-4">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="px-0"
                onClick={() => setShowDeleted((prev) => !prev)}
              >
                {showDeleted ? "Hide deleted" : `Show deleted (${trash.length})`}
              </Button>

              {showDeleted && (
                <ul className="mt-2 divide-y divide-border border-y border-border">
                  {trash.map((entry) => {
                    const [topKey] = topOutcome(entry.result.risks);
                    const remaining = daysRemaining(entry.deletedAt);
                    return (
                      <li
                        key={entry.id}
                        className="flex items-center justify-between gap-4 py-3"
                      >
                        <div className="min-w-0">
                          <div className="text-sm text-muted-foreground">
                            Age {entry.patient.age} ·{" "}
                            {entry.patient.sex === "female" ? "Female" : "Male"} ·{" "}
                            {OUTCOME_LABELS[topKey] ?? topKey}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Removed in {remaining} {remaining === 1 ? "day" : "days"}
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => onRestore(entry.id)}
                        >
                          <RotateCcw className="size-3.5" />
                          Restore
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
