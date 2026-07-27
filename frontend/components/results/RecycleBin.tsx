import { Button } from "@/components/ui/button";
import { TRASH_RETENTION_DAYS, type TrashEntry } from "@/lib/history";
import { OUTCOME_LABELS, overallRiskColor, overallRiskLabel, topOutcome } from "@/lib/risk";

const DAY_MS = 24 * 60 * 60 * 1000;

function daysRemaining(deletedAt: string): number {
  const elapsedMs = Date.now() - new Date(deletedAt).getTime();
  const remainingMs = TRASH_RETENTION_DAYS * DAY_MS - elapsedMs;
  return Math.max(0, Math.ceil(remainingMs / DAY_MS));
}

export function RecycleBin({
  entries,
  onRestore,
}: {
  entries: TrashEntry[];
  onRestore: (id: string) => void;
}) {
  if (entries.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 rounded-lg border border-dashed border-border">
      <div className="border-b border-dashed border-border px-5 py-3">
        <h3 className="text-sm font-semibold text-foreground">Recycle Bin</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Deleted results stay here for {TRASH_RETENTION_DAYS} days before they are removed for
          good.
        </p>
      </div>
      <ul className="divide-y divide-dashed divide-border">
        {entries.map((entry) => {
          const [topKey] = topOutcome(entry.result.risks);
          const color = overallRiskColor(entry.result.overall_risk_level);
          const remaining = daysRemaining(entry.deletedAt);
          return (
            <li key={entry.id} className="flex items-center justify-between gap-4 px-5 py-3">
              <div className="min-w-0">
                <div className="text-sm text-muted-foreground">
                  Age {entry.patient.age} &middot;{" "}
                  {entry.patient.sex === "female" ? "Female" : "Male"} &middot;{" "}
                  {OUTCOME_LABELS[topKey] ?? topKey}
                </div>
                <div className="text-xs text-muted-foreground">
                  Permanently deleted in {remaining} {remaining === 1 ? "day" : "days"}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span
                  className="rounded-md border px-2 py-0.5 text-xs font-medium"
                  style={{ color, borderColor: color }}
                >
                  {overallRiskLabel(entry.result.overall_risk_level)}
                </span>
                <Button variant="outline" size="sm" onClick={() => onRestore(entry.id)}>
                  Restore
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
