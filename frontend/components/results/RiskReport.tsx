"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { WhatIfSimulator } from "@/components/results/WhatIfSimulator";
import { HandoffActions, HandoffPrintDocument } from "@/components/results/HandoffExport";
import { patientSnapshot } from "@/lib/handoff";
import {
  OUTCOME_LABELS,
  cardRiskColor,
  cardRiskLabel,
  cardRiskTier,
  countRecommendations,
  formatPercent,
  outcomesByRiskDesc,
  overallRiskColor,
  overallRiskLabel,
  topOutcome,
} from "@/lib/risk";
import type { PatientFormValues } from "@/lib/validation";
import type { AttributionItem, PredictionResponse } from "@/lib/types";

function maxAbsContribution(items: AttributionItem[]): number {
  if (items.length === 0) return 1;
  return Math.max(...items.map((item) => Math.abs(item.contribution)), 1e-6);
}

function ModelDrivers({ items }: { items: AttributionItem[] }) {
  const scale = maxAbsContribution(items);
  if (items.length === 0) {
    return (
      <p className="mt-2 pl-3 text-sm text-muted-foreground">
        No strong model drivers for this prediction.
      </p>
    );
  }

  return (
    <ul className="mt-2 max-w-3xl space-y-2">
      {items.map((item) => {
        const widthPct = Math.min(100, (Math.abs(item.contribution) / scale) * 100);
        const raises = item.contribution >= 0;
        const barColor = raises ? "var(--risk-high)" : "var(--risk-safe)";
        return (
          <li key={`${item.feature_key}-${item.contribution}`}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 pl-3">
              <span className="text-sm text-foreground">
                <span className="mr-1.5 font-mono text-xs" style={{ color: barColor }}>
                  {raises ? "+" : "−"}
                </span>
                {item.feature}
              </span>
              <span className="font-mono text-xs tabular-nums text-muted-foreground">
                {raises ? "+" : ""}
                {item.contribution.toFixed(3)}
              </span>
            </div>
            <div className="ml-3 mt-1 h-1 max-w-md bg-border/60">
              <div
                className="h-1"
                style={{ width: `${widthPct}%`, backgroundColor: barColor }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function RiskReport({
  result,
  baselinePatient,
}: {
  result: PredictionResponse;
  baselinePatient: PatientFormValues;
}) {
  const [topKey, topProbability] = topOutcome(result.risks);
  const topAttribution = result.attributions?.[topKey]?.[0];
  const primaryDriver =
    topAttribution?.feature ?? result.explanations[topKey]?.[0];
  const overallColor = overallRiskColor(result.overall_risk_level);
  const orderedKeys = outcomesByRiskDesc(result.risks);
  const recommendations = result.recommendations ?? {};
  const recommendationsStale = result.recommendations === undefined;
  const actionKeys = orderedKeys.filter((key) => (recommendations[key]?.length ?? 0) > 0);
  const actionCount = countRecommendations(recommendations);
  const generatedAt = useMemo(() => new Date(), []);

  return (
    <motion.article
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="border border-border bg-background print:border-0"
      aria-label="Risk assessment report"
    >
      <header className="scroll-mt-20 border-b border-border px-6 py-7 sm:px-8 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
          <div>
            <p className="text-sm font-semibold tracking-wide text-foreground uppercase">
              Risk assessment report
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {patientSnapshot(baselinePatient)}
            </p>
          </div>
          <HandoffActions
            patient={baselinePatient}
            result={result}
            generatedAt={generatedAt}
          />
        </div>

        <div className="mt-3 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <h2
            className="text-2xl font-semibold tracking-tight"
            style={{ color: overallColor }}
          >
            {overallRiskLabel(result.overall_risk_level)}
          </h2>
          <p className="font-mono text-sm text-muted-foreground">
            eGFR{" "}
            <span className="text-foreground">{result.computed_egfr}</span>{" "}
            mL/min/1.73m²
          </p>
        </div>

        <dl className="mt-5 grid grid-cols-1 gap-4 border-t border-border pt-5 sm:grid-cols-3">
          <div>
            <dt className="text-xs text-muted-foreground">Most concerning</dt>
            <dd className="mt-1 text-sm text-foreground">
              {OUTCOME_LABELS[topKey] ?? topKey}{" "}
              <span className="font-mono text-muted-foreground">
                {formatPercent(topProbability)}
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Top model driver</dt>
            <dd className="mt-1 text-sm text-foreground">
              {primaryDriver ?? "None identified"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Suggested actions</dt>
            <dd className="mt-1 text-sm text-foreground">
              {actionCount > 0 ? (
                <a href="#suggested-actions" className="underline-offset-2 hover:underline">
                  {actionCount} for {actionKeys.length} elevated{" "}
                  {actionKeys.length === 1 ? "event" : "events"}
                </a>
              ) : recommendationsStale ? (
                "Re-run Predict to refresh"
              ) : (
                "None at ≥30% risk"
              )}
            </dd>
          </div>
        </dl>
        {(result.confidence || result.calibration_applied) && (
          <p className="mt-4 text-xs text-muted-foreground">
            {result.calibration_applied ? "Temperature-calibrated probabilities" : "Uncalibrated probabilities"}
            {result.confidence ? ` · Score confidence: ${result.confidence}` : ""}
          </p>
        )}
        {(result.interaction_alerts?.length ?? 0) > 0 && (
          <ul className="mt-4 space-y-1.5 border border-border bg-muted/30 px-3 py-3">
            {(result.interaction_alerts ?? []).map((alert) => (
              <li
                key={`${alert.outcome}-${alert.message}`}
                className="text-sm text-foreground"
              >
                <span className="mr-2 text-xs font-medium text-muted-foreground uppercase">
                  {OUTCOME_LABELS[alert.outcome] ?? alert.outcome}
                </span>
                {alert.message}
              </li>
            ))}
          </ul>
        )}
      </header>

      <div className="print:hidden">
        <section
          className="scroll-mt-20 px-6 py-7 sm:px-8"
          aria-labelledby="ade-risks-heading"
        >
          <h3
            id="ade-risks-heading"
            className="text-sm font-semibold tracking-wide text-foreground uppercase"
          >
            1. Adverse event risks
          </h3>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Sorted by predicted risk. &quot;Model drivers&quot; come straight from the
            network (Integrated Gradients); &quot;clinical factors&quot; are the
            guideline checklist items behind it.
          </p>

          <div className="mt-5">
            <div className="hidden grid-cols-[minmax(0,1fr)_4.5rem_5rem] gap-4 border-b border-border pb-2 text-xs text-muted-foreground md:grid">
              <span>Event</span>
              <span className="text-right">Risk</span>
              <span className="text-right">Level</span>
            </div>
            <ul>
              {orderedKeys.map((key) => {
                const probability = result.risks[key] ?? 0;
                const factors = result.explanations[key] ?? [];
                const drivers = result.attributions?.[key] ?? [];
                const actionCountForKey = recommendations[key]?.length ?? 0;
                const pct = probability * 100;
                const tier = cardRiskTier(pct);
                const color = cardRiskColor(tier);

                return (
                  <li
                    key={key}
                    className="border-b border-border py-4 last:border-b-0"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 md:grid md:grid-cols-[minmax(0,1fr)_4.5rem_5rem]">
                      <span className="text-sm font-medium text-foreground">
                        {OUTCOME_LABELS[key] ?? key}
                        {actionCountForKey > 0 && (
                          <a
                            href={`#action-${key}`}
                            className="ml-2 text-xs font-normal underline-offset-2 hover:underline"
                            style={{ color: "var(--risk-info)" }}
                          >
                            {actionCountForKey} action{actionCountForKey === 1 ? "" : "s"}
                          </a>
                        )}
                      </span>
                      <span
                        className="font-mono text-sm tabular-nums md:text-right"
                        style={{ color }}
                      >
                        {formatPercent(probability)}
                      </span>
                      <span
                        className="text-xs font-medium md:text-right"
                        style={{ color }}
                      >
                        {cardRiskLabel(tier)}
                      </span>
                    </div>

                    <p className="mt-3 pl-3 text-xs tracking-wide text-muted-foreground uppercase">
                      Model drivers
                    </p>
                    <ModelDrivers items={drivers} />

                    <p className="mt-3 pl-3 text-xs tracking-wide text-muted-foreground uppercase">
                      Clinical factors
                    </p>
                    {factors.length > 0 ? (
                      <ul className="mt-2 max-w-3xl space-y-1">
                        {factors.map((factor, factorIndex) => (
                          <li
                            key={`${key}-factor-${factorIndex}`}
                            className="pl-3 text-sm leading-relaxed text-muted-foreground"
                          >
                            <span className="mr-2 text-border">–</span>
                            {factor}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 pl-3 text-sm text-muted-foreground">
                        No notable contributing factors.
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        <section
          id="suggested-actions"
          className="scroll-mt-20 border-t border-border px-6 py-7 sm:px-8"
          aria-labelledby="suggested-actions-heading"
        >
          <h3
            id="suggested-actions-heading"
            className="text-sm font-semibold tracking-wide text-foreground uppercase"
          >
            2. Suggested next actions
          </h3>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Guideline-tagged CDS guidance for events at ≥30% predicted risk. Demo
            guidance only, not a treatment protocol; section 3 below lets you test
            whether a med change clears an action.
          </p>

          {recommendationsStale ? (
            <p className="mt-4 text-sm text-muted-foreground">
              This saved case predates action suggestions. Run Predict again to refresh
              recommendations for the form values above.
            </p>
          ) : actionKeys.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              No events met the ≥30% action threshold. Continue routine monitoring.
            </p>
          ) : (
            <ol className="mt-4 space-y-5">
              {actionKeys.map((key, index) => {
                const probability = result.risks[key] ?? 0;
                const tier = cardRiskTier(probability * 100);
                const color = cardRiskColor(tier);
                return (
                  <li key={key} id={`action-${key}`} className="scroll-mt-24">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <span className="font-mono text-xs text-muted-foreground">
                        {index + 1}.
                      </span>
                      <span className="text-sm font-medium text-foreground">
                        {OUTCOME_LABELS[key] ?? key}
                      </span>
                      <span className="font-mono text-xs tabular-nums" style={{ color }}>
                        {formatPercent(probability)} · {cardRiskLabel(tier)}
                      </span>
                    </div>
                    <ul className="mt-2 space-y-1.5">
                      {(recommendations[key] ?? []).map((action, actionIndex) => (
                        <li
                          key={`${key}-action-${actionIndex}`}
                          className="pl-6 text-sm leading-relaxed text-foreground"
                        >
                          <span className="mr-2" style={{ color: "var(--risk-info)" }}>
                            →
                          </span>
                          {action}
                        </li>
                      ))}
                    </ul>
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        <section
          id="what-if"
          className="scroll-mt-20 border-t border-border px-6 py-7 sm:px-8"
          aria-labelledby="what-if-heading"
        >
          <WhatIfSimulator
            baselinePatient={baselinePatient}
            baselineResult={result}
          />
        </section>

        <footer className="border-t border-border bg-card px-6 py-4 sm:px-8">
          <p className="text-xs leading-relaxed text-muted-foreground">
            {result.disclaimer}
          </p>
        </footer>
      </div>

      <HandoffPrintDocument
        patient={baselinePatient}
        result={result}
        generatedAt={generatedAt}
      />
    </motion.article>
  );
}
