import { Card, CardContent } from "@/components/ui/card";
import {
  OUTCOME_LABELS,
  formatPercent,
  overallRiskColor,
  overallRiskLabel,
  topOutcome,
} from "@/lib/risk";
import type { PredictionResponse } from "@/lib/types";

export function PatientSummary({ result }: { result: PredictionResponse }) {
  const [topKey, topProbability] = topOutcome(result.risks);
  const primaryDriver = result.explanations[topKey]?.[0];
  const overallColor = overallRiskColor(result.overall_risk_level);

  return (
    <Card className="rounded-lg border border-border p-6 shadow-none">
      <CardContent className="grid grid-cols-1 gap-6 px-0 sm:grid-cols-3">
        <div>
          <div className="text-xs tracking-wide text-muted-foreground uppercase">
            Overall Risk
          </div>
          <div className="mt-1.5 text-lg font-semibold" style={{ color: overallColor }}>
            {overallRiskLabel(result.overall_risk_level)}
          </div>
        </div>
        <div>
          <div className="text-xs tracking-wide text-muted-foreground uppercase">
            Most Concerning
          </div>
          <div className="mt-1.5 text-lg font-semibold text-foreground">
            {OUTCOME_LABELS[topKey] ?? topKey}
            <span className="ml-2 font-mono text-sm font-normal text-muted-foreground">
              {formatPercent(topProbability)}
            </span>
          </div>
        </div>
        <div>
          <div className="text-xs tracking-wide text-muted-foreground uppercase">
            Primary Driver
          </div>
          <div className="mt-1.5 text-lg font-semibold text-foreground">
            {primaryDriver ?? "None identified"}
          </div>
        </div>
      </CardContent>
      <CardContent className="mt-2 border-t border-border px-0 pt-4 text-sm text-muted-foreground">
        Computed eGFR:{" "}
        <span className="font-mono text-foreground">{result.computed_egfr} mL/min/1.73m²</span>
      </CardContent>
    </Card>
  );
}
