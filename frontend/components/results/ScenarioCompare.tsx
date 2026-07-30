"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  OUTCOME_LABELS,
  OUTCOME_ORDER,
  formatPercent,
  formatRiskChange,
  outcomesByRiskDesc,
  overallRiskColor,
  overallRiskLabel,
  riskChangeColor,
  topOutcome,
} from "@/lib/risk";
import { cn } from "@/lib/utils";
import type { PatientFormValues } from "@/lib/validation";
import type { PredictionResponse } from "@/lib/types";

export interface ScenarioSnapshot {
  id: string;
  label: string;
  patient: PatientFormValues;
  result: PredictionResponse;
}

/** True when overall band or any ADE moved by ≥0.5 percentage points. */
export function scenariosDiffer(a: ScenarioSnapshot, b: ScenarioSnapshot): boolean {
  if (a.id === b.id) return false;
  if (a.result.overall_risk_level !== b.result.overall_risk_level) return true;
  return OUTCOME_ORDER.some((key) => {
    const delta = (b.result.risks[key] ?? 0) - (a.result.risks[key] ?? 0);
    return Math.abs(delta) >= 0.005;
  });
}

export function ScenarioCompare({
  current,
  previous,
  onDismiss,
}: {
  current: ScenarioSnapshot;
  previous: ScenarioSnapshot;
  onDismiss: () => void;
}) {
  const orderedKeys = outcomesByRiskDesc(current.result.risks);
  const deltas = orderedKeys.map((key) => {
    const before = previous.result.risks[key] ?? 0;
    const after = current.result.risks[key] ?? 0;
    return { key, before, after, delta: after - before };
  });
  const biggestDrop = [...deltas]
    .sort((a, b) => a.delta - b.delta)
    .find((d) => d.delta < -0.005);
  const [prevTop] = topOutcome(previous.result.risks);
  const [currTop] = topOutcome(current.result.risks);

  return (
    <div className="mb-8 border border-border px-6 py-5 sm:px-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold tracking-tight text-foreground">
            Scenario comparison
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            <span className="text-foreground">{previous.label}</span>
            <span className="mx-1.5">→</span>
            <span className="text-foreground">{current.label}</span>
          </p>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onDismiss}>
          <X className="size-3.5" />
          Dismiss
        </Button>
      </div>

      <div className="mt-4 flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-3">
        <p className="text-sm text-foreground">
          Overall{" "}
          <span style={{ color: overallRiskColor(previous.result.overall_risk_level) }}>
            {overallRiskLabel(previous.result.overall_risk_level)}
          </span>
          <span className="mx-2 text-muted-foreground">→</span>
          <span style={{ color: overallRiskColor(current.result.overall_risk_level) }}>
            {overallRiskLabel(current.result.overall_risk_level)}
          </span>
        </p>
        <p className="text-xs text-muted-foreground">
          Top concern {OUTCOME_LABELS[prevTop] ?? prevTop}
          <span className="mx-1.5">→</span>
          {OUTCOME_LABELS[currTop] ?? currTop}
          {biggestDrop && (
            <>
              {" "}
              · Risk fell most for {OUTCOME_LABELS[biggestDrop.key] ?? biggestDrop.key} (
              {formatRiskChange(biggestDrop.delta).toLowerCase()})
            </>
          )}
        </p>
      </div>

      <div className="mt-3 hidden grid-cols-[minmax(0,1fr)_5rem_5rem_7.5rem] gap-3 text-xs text-muted-foreground md:grid">
        <span>Event</span>
        <span className="text-right">Before</span>
        <span className="text-right">After</span>
        <span className="text-right">How it changed</span>
      </div>

      <ul>
        {deltas.map(({ key, before, after, delta }) => {
          const meaningful = Math.abs(delta) >= 0.005;
          return (
            <li
              key={key}
              className={cn(
                "border-b border-border py-2.5 last:border-b-0",
                meaningful && "bg-muted/40"
              )}
            >
              <div className="flex items-start justify-between gap-3 md:hidden">
                <span
                  className={cn(
                    "text-sm",
                    meaningful ? "font-medium text-foreground" : "text-muted-foreground"
                  )}
                >
                  {OUTCOME_LABELS[key] ?? key}
                </span>
                <div className="shrink-0 text-right">
                  <div className="font-mono text-sm tabular-nums text-foreground">
                    {formatPercent(before)}
                    <span className="mx-1 text-muted-foreground">→</span>
                    {formatPercent(after)}
                  </div>
                  <div
                    className="mt-0.5 text-xs font-medium"
                    style={{ color: riskChangeColor(delta) }}
                  >
                    {formatRiskChange(delta)}
                  </div>
                </div>
              </div>

              <div className="hidden grid-cols-[minmax(0,1fr)_5rem_5rem_7.5rem] items-baseline gap-3 md:grid">
                <span
                  className={cn(
                    "text-sm",
                    meaningful ? "font-medium text-foreground" : "text-muted-foreground"
                  )}
                >
                  {OUTCOME_LABELS[key] ?? key}
                </span>
                <span className="text-right font-mono text-sm tabular-nums text-muted-foreground">
                  {formatPercent(before)}
                </span>
                <span className="text-right font-mono text-sm tabular-nums text-foreground">
                  {formatPercent(after)}
                </span>
                <span
                  className="text-right text-sm font-medium"
                  style={{ color: riskChangeColor(delta) }}
                >
                  {formatRiskChange(delta)}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
