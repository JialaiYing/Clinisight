"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, simulatePatient } from "@/lib/api";
import { DRUG_CATALOG, drugLabel } from "@/lib/drugs";
import {
  OUTCOME_LABELS,
  clearedActionKeys,
  countRecommendations,
  formatPercent,
  formatRiskChange,
  outcomesByRiskDesc,
  overallRiskColor,
  overallRiskLabel,
  riskChangeColor,
} from "@/lib/risk";
import { cn } from "@/lib/utils";
import type { PatientFormValues } from "@/lib/validation";
import type { PredictionResponse } from "@/lib/types";

type MedScenario = Pick<PatientFormValues, "medications" | "num_concurrent_meds">;

function pickMeds(patient: PatientFormValues): MedScenario {
  return {
    medications: [...(patient.medications ?? [])],
    num_concurrent_meds: patient.num_concurrent_meds,
  };
}

function sortedMedKey(meds: string[]): string {
  return [...meds].sort().join("|");
}

function medsEqual(a: MedScenario, b: MedScenario): boolean {
  return (
    a.num_concurrent_meds === b.num_concurrent_meds &&
    sortedMedKey(a.medications) === sortedMedKey(b.medications)
  );
}

function describeMedChanges(baseline: MedScenario, scenario: MedScenario): string[] {
  const changes: string[] = [];
  const before = new Set(baseline.medications);
  const after = new Set(scenario.medications);
  for (const id of after) {
    if (!before.has(id)) changes.push(`Added ${drugLabel(id)}`);
  }
  for (const id of before) {
    if (!after.has(id)) changes.push(`Removed ${drugLabel(id)}`);
  }
  if (baseline.num_concurrent_meds !== scenario.num_concurrent_meds) {
    changes.push(
      `Concurrent meds ${baseline.num_concurrent_meds} → ${scenario.num_concurrent_meds}`
    );
  }
  return changes;
}

function clampConcurrentMeds(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(30, Math.max(0, Math.round(value)));
}

export function WhatIfSimulator({
  baselinePatient,
  baselineResult,
}: {
  baselinePatient: PatientFormValues;
  baselineResult: PredictionResponse;
}) {
  const baselineMeds = useMemo(() => pickMeds(baselinePatient), [baselinePatient]);
  const [scenario, setScenario] = useState<MedScenario>(baselineMeds);
  const [simulated, setSimulated] = useState<PredictionResponse | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const hasChanges = !medsEqual(scenario, baselineMeds);
  const changeSummary = useMemo(
    () => (hasChanges ? describeMedChanges(baselineMeds, scenario) : []),
    [baselineMeds, scenario, hasChanges]
  );

  useEffect(() => {
    if (!hasChanges) return;

    const id = ++requestId.current;
    const timer = window.setTimeout(async () => {
      setIsSimulating(true);
      setError(null);
      try {
        const result = await simulatePatient({ ...baselinePatient, ...scenario });
        if (requestId.current === id) {
          setSimulated(result);
        }
      } catch (err) {
        if (requestId.current === id) {
          setSimulated(null);
          setError(
            err instanceof ApiError ? err.message : "Could not run medication simulation."
          );
        }
      } finally {
        if (requestId.current === id) {
          setIsSimulating(false);
        }
      }
    }, 300);

    return () => window.clearTimeout(timer);
  }, [baselinePatient, scenario, hasChanges]);

  const orderedKeys = useMemo(
    () => outcomesByRiskDesc(baselineResult.risks),
    [baselineResult.risks]
  );

  const deltas = useMemo(() => {
    if (!simulated) return [];
    return orderedKeys.map((key) => {
      const before = baselineResult.risks[key] ?? 0;
      const after = simulated.risks[key] ?? 0;
      return { key, before, after, delta: after - before };
    });
  }, [baselineResult, simulated, orderedKeys]);

  const biggestDrop = useMemo(
    () =>
      [...deltas].sort((a, b) => a.delta - b.delta).find((d) => d.delta < -0.005),
    [deltas]
  );

  const clearedActions = useMemo(
    () =>
      simulated
        ? clearedActionKeys(baselineResult.recommendations, simulated.recommendations)
        : [],
    [baselineResult.recommendations, simulated]
  );

  const actionCountDelta = useMemo(() => {
    if (!simulated) return null;
    const before = countRecommendations(baselineResult.recommendations);
    const after = countRecommendations(simulated.recommendations);
    return { before, after, delta: after - before };
  }, [baselineResult.recommendations, simulated]);

  const toggleDrug = (drugId: string, checked: boolean) => {
    setScenario((prev) => {
      const medications = checked
        ? prev.medications.includes(drugId)
          ? prev.medications
          : [...prev.medications, drugId]
        : prev.medications.filter((id) => id !== drugId);
      let num_concurrent_meds = prev.num_concurrent_meds;
      if (checked) {
        num_concurrent_meds = Math.max(num_concurrent_meds, medications.length);
      } else {
        // Shrink total count with removals, but never below curated selection size.
        num_concurrent_meds = Math.max(medications.length, num_concurrent_meds - 1);
      }
      return { medications, num_concurrent_meds };
    });
  };

  const alerts =
    (hasChanges ? simulated?.interaction_alerts : baselineResult.interaction_alerts) ?? [];

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3
            id="what-if-heading"
            className="text-sm font-semibold tracking-wide text-foreground uppercase"
          >
            3. Medication what-if
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Toggle curated drugs to compare risk against the baseline report. Try removing
            ibuprofen or adding spironolactone on an ACE inhibitor.
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={!hasChanges}
          onClick={() => setScenario(baselineMeds)}
        >
          <RotateCcw className="size-3.5" />
          Reset
        </Button>
      </div>

      <div className="mt-5 max-w-xs space-y-1.5">
        <Label htmlFor="sim-num_concurrent_meds">Total concurrent medications</Label>
        <Input
          id="sim-num_concurrent_meds"
          type="number"
          min={0}
          max={30}
          className="font-mono"
          value={scenario.num_concurrent_meds}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === "") {
              setScenario((prev) => ({ ...prev, num_concurrent_meds: 0 }));
              return;
            }
            const n = e.target.valueAsNumber;
            if (!Number.isFinite(n)) return;
            setScenario((prev) => ({
              ...prev,
              num_concurrent_meds: clampConcurrentMeds(n),
            }));
          }}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
        {DRUG_CATALOG.map((drug) => {
          const checked = scenario.medications.includes(drug.id);
          return (
            <label
              key={drug.id}
              htmlFor={`sim-${drug.id}`}
              className="flex items-center gap-2 text-sm text-foreground"
            >
              <Checkbox
                id={`sim-${drug.id}`}
                checked={checked}
                onCheckedChange={(value) => toggleDrug(drug.id, value === true)}
              />
              {drug.label}
            </label>
          );
        })}
      </div>

      {alerts.length > 0 && (
        <ul className="mt-5 space-y-1.5 border border-border bg-muted/30 px-3 py-3">
          {alerts.map((alert) => (
            <li key={`${alert.outcome}-${alert.message}`} className="text-sm text-foreground">
              <span className="mr-2 text-xs font-medium text-muted-foreground uppercase">
                {OUTCOME_LABELS[alert.outcome] ?? alert.outcome}
              </span>
              {alert.message}
            </li>
          ))}
        </ul>
      )}

      {!hasChanges && (
        <p className="mt-5 text-sm text-muted-foreground">
          No changes yet. Toggle a medication to see a before/after comparison.
        </p>
      )}

      {hasChanges && changeSummary.length > 0 && (
        <p className="mt-5 text-sm text-foreground">
          <span className="text-muted-foreground">Scenario: </span>
          {changeSummary.join("; ")}
          {isSimulating && (
            <span className="ml-2 inline-flex items-center gap-1.5 text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              Comparing…
            </span>
          )}
        </p>
      )}

      {error && hasChanges && (
        <div className="mt-4 flex items-start gap-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {simulated && hasChanges && (
        <div
          className={cn("mt-6 transition-opacity", isSimulating && "opacity-60")}
          aria-live="polite"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-3">
            <p className="text-sm text-foreground">
              Overall{" "}
              <span style={{ color: overallRiskColor(baselineResult.overall_risk_level) }}>
                {overallRiskLabel(baselineResult.overall_risk_level)}
              </span>
              <span className="mx-2 text-muted-foreground">→</span>
              <span style={{ color: overallRiskColor(simulated.overall_risk_level) }}>
                {overallRiskLabel(simulated.overall_risk_level)}
              </span>
            </p>
            {biggestDrop && (
              <p className="text-xs text-muted-foreground">
                Risk fell most for{" "}
                <span className="text-foreground">
                  {OUTCOME_LABELS[biggestDrop.key] ?? biggestDrop.key}
                </span>
                :{" "}
                <span className="font-mono" style={{ color: "var(--risk-safe)" }}>
                  {formatPercent(biggestDrop.before)} → {formatPercent(biggestDrop.after)}
                </span>{" "}
                <span style={{ color: "var(--risk-safe)" }}>
                  ({formatRiskChange(biggestDrop.delta).toLowerCase()})
                </span>
              </p>
            )}
          </div>

          {actionCountDelta && (
            <p className="mt-3 text-sm text-foreground">
              <span className="text-muted-foreground">Suggested actions: </span>
              <span className="font-mono">{actionCountDelta.before}</span>
              <span className="mx-1.5 text-muted-foreground">→</span>
              <span className="font-mono">{actionCountDelta.after}</span>
              {clearedActions.length > 0 && (
                <span className="ml-2 text-muted-foreground">
                  Cleared for{" "}
                  <span style={{ color: "var(--risk-safe)" }}>
                    {clearedActions
                      .map((key) => OUTCOME_LABELS[key] ?? key)
                      .join(", ")}
                  </span>
                </span>
              )}
            </p>
          )}

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
                    <span className="font-mono text-sm tabular-nums text-muted-foreground text-right">
                      {formatPercent(before)}
                    </span>
                    <span className="font-mono text-sm tabular-nums text-foreground text-right">
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
      )}
    </div>
  );
}
