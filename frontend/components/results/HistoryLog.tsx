import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { HistoryEntry } from "@/lib/history";
import { OUTCOME_LABELS, formatPercent, overallRiskColor, overallRiskLabel, topOutcome } from "@/lib/risk";

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function HistoryLog({
  entries,
  onDelete,
  onClear,
}: {
  entries: HistoryEntry[];
  onDelete: (id: string) => void;
  onClear: () => void;
}) {
  return (
    <div className="rounded-lg border border-border">
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <h3 className="text-sm font-semibold text-foreground">History</h3>
        {entries.length > 0 && (
          <Button variant="ghost" size="sm" onClick={onClear}>
            Clear
          </Button>
        )}
      </div>

      {entries.length === 0 ? (
        <p className="px-5 py-6 text-sm text-muted-foreground">
          Predictions you run will be logged here for this browser session.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {entries.map((entry) => {
            const [topKey, topProbability] = topOutcome(entry.result.risks);
            const color = overallRiskColor(entry.result.overall_risk_level);
            return (
              <li key={entry.id} className="flex items-center justify-between gap-4 px-5 py-3">
                <div className="min-w-0">
                  <div className="text-sm text-foreground">
                    Age {entry.patient.age} &middot;{" "}
                    {entry.patient.sex === "female" ? "Female" : "Male"}
                  </div>
                  <div className="font-mono text-xs text-muted-foreground">
                    {formatTimestamp(entry.createdAt)}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-4 text-right">
                  <div>
                    <div className="text-sm text-foreground">
                      {OUTCOME_LABELS[topKey] ?? topKey}
                    </div>
                    <div className="font-mono text-xs text-muted-foreground">
                      {formatPercent(topProbability)}
                    </div>
                  </div>
                  <span
                    className="rounded-md border px-2 py-0.5 text-xs font-medium"
                    style={{ color, borderColor: color }}
                  >
                    {overallRiskLabel(entry.result.overall_risk_level)}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Delete result"
                    onClick={() => onDelete(entry.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
