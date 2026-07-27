import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ExplanationList } from "@/components/results/ExplanationList";
import { cardRiskColor, cardRiskLabel, cardRiskTier, formatPercent } from "@/lib/risk";

export function RiskCard({
  label,
  probability,
  factors,
}: {
  label: string;
  probability: number;
  factors: string[];
}) {
  const pct = probability * 100;
  const tier = cardRiskTier(pct);
  const color = cardRiskColor(tier);

  return (
    <Card className="h-full gap-3 rounded-lg border border-border p-5 shadow-none">
      <CardHeader className="flex-row items-start justify-between gap-2 px-0 pb-0">
        <CardTitle className="text-sm font-medium text-foreground">{label}</CardTitle>
        <span
          className="shrink-0 rounded-md border px-2 py-0.5 text-xs font-medium"
          style={{ color, borderColor: color }}
        >
          {cardRiskLabel(tier)}
        </span>
      </CardHeader>
      <CardContent className="flex h-full flex-col space-y-3 px-0">
        <div className="font-mono text-3xl font-semibold tabular-nums" style={{ color }}>
          {formatPercent(probability)}
        </div>
        <Progress
          value={pct}
          className="h-1"
          style={{ ["--primary" as string]: color }}
        />
        <div className="flex-1 pt-1">
          <ExplanationList factors={factors} />
        </div>
      </CardContent>
    </Card>
  );
}
