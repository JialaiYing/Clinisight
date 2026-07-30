"use client";

import { useEffect, useState } from "react";
import { ApiError, fetchModelMetrics } from "@/lib/api";
import { OUTCOME_LABELS, OUTCOME_ORDER } from "@/lib/risk";
import type { ModelMetrics } from "@/lib/types";

function fmt(n: number | undefined, digits = 3): string {
  if (n === undefined || Number.isNaN(n)) return "—";
  return n.toFixed(digits);
}

export function ModelCard() {
  const [metrics, setMetrics] = useState<ModelMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchModelMetrics()
      .then((data) => {
        if (!cancelled) {
          setMetrics(data);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Failed to load metrics");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div id="model-card" className="scroll-mt-20">
      <h3 className="text-sm font-semibold text-foreground">Model card</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        Held-out synthetic test metrics after temperature scaling. Literature-derived
        simulation data, not clinically validated.
      </p>

      {error && (
        <p className="mt-4 text-sm text-muted-foreground">
          {error}. Start the backend and run <span className="font-mono">python -m ml.evaluate</span>{" "}
          if metrics are missing.
        </p>
      )}

      {!error && !metrics && (
        <p className="mt-4 text-sm text-muted-foreground">Loading metrics…</p>
      )}

      {metrics && (
        <div className="mt-5 space-y-5">
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <dt className="text-xs text-muted-foreground">Macro AUROC</dt>
              <dd className="mt-1 font-mono text-sm text-foreground">
                {fmt(metrics.macro_auroc)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Macro AUPRC</dt>
              <dd className="mt-1 font-mono text-sm text-foreground">
                {fmt(metrics.macro_auprc)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Macro Brier</dt>
              <dd className="mt-1 font-mono text-sm text-foreground">
                {fmt(metrics.macro_brier, 4)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Macro ECE</dt>
              <dd className="mt-1 font-mono text-sm text-foreground">
                {fmt(metrics.macro_ece, 4)}
              </dd>
            </div>
          </dl>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[28rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Outcome</th>
                  <th className="py-2 pr-3 font-medium">AUROC</th>
                  <th className="py-2 pr-3 font-medium">AUPRC</th>
                  <th className="py-2 pr-3 font-medium">Brier</th>
                  <th className="py-2 font-medium">Prev.</th>
                </tr>
              </thead>
              <tbody>
                {OUTCOME_ORDER.map((key) => {
                  const row = metrics.labels[key];
                  if (!row) return null;
                  return (
                    <tr key={key} className="border-b border-border/70">
                      <td className="py-2 pr-3 text-foreground">
                        {OUTCOME_LABELS[key] ?? key}
                      </td>
                      <td className="py-2 pr-3 font-mono tabular-nums text-muted-foreground">
                        {fmt(row.auroc)}
                      </td>
                      <td className="py-2 pr-3 font-mono tabular-nums text-muted-foreground">
                        {fmt(row.auprc)}
                      </td>
                      <td className="py-2 pr-3 font-mono tabular-nums text-muted-foreground">
                        {fmt(row.brier, 4)}
                      </td>
                      <td className="py-2 font-mono tabular-nums text-muted-foreground">
                        {fmt(row.prevalence * 100, 1)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="space-y-1 text-xs leading-relaxed text-muted-foreground">
            {metrics.training && (
              <p>
                {metrics.training.architecture}. {metrics.training.optimizer} ·{" "}
                {metrics.training.loss}. Data: {metrics.training.data.replaceAll("_", " ")}.
                {metrics.best_epoch != null && ` Best epoch ${metrics.best_epoch}.`}
              </p>
            )}
            {metrics.splits && (
              <p>
                Splits: train {metrics.splits.train.toLocaleString()}, val{" "}
                {metrics.splits.val.toLocaleString()}, test{" "}
                {metrics.splits.test.toLocaleString()}.
              </p>
            )}
            {metrics.calibration && (
              <p>
                Calibration: {metrics.calibration.method.replaceAll("_", " ")} fitted on{" "}
                {metrics.calibration.fitted_on}.
              </p>
            )}
            <p>{metrics.training?.disclaimer ?? "Not for clinical use."}</p>
          </div>
        </div>
      )}
    </div>
  );
}
