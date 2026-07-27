import type { OverallRiskLevel } from "@/lib/types";

export const OUTCOME_LABELS: Record<string, string> = {
  aki: "Acute Kidney Injury",
  hyperkalemia: "Hyperkalemia",
  qt_prolongation: "QT Prolongation",
  liver_toxicity: "Liver Toxicity",
  bleeding_risk: "Bleeding Risk",
  hypoglycemia: "Hypoglycemia",
};

// Order the six ADE cards deterministically regardless of API key ordering.
export const OUTCOME_ORDER = [
  "aki",
  "hyperkalemia",
  "qt_prolongation",
  "liver_toxicity",
  "bleeding_risk",
  "hypoglycemia",
];

export type CardRiskTier = "low" | "moderate" | "high";

/** Per-card thresholds: only moderate/high get color, low stays grayscale. */
export function cardRiskTier(pct: number): CardRiskTier {
  if (pct < 30) return "low";
  if (pct < 60) return "moderate";
  return "high";
}

export function cardRiskLabel(tier: CardRiskTier): string {
  if (tier === "low") return "Low";
  if (tier === "moderate") return "Moderate";
  return "High";
}

export function cardRiskColor(tier: CardRiskTier): string {
  if (tier === "moderate") return "var(--risk-moderate)";
  if (tier === "high") return "var(--risk-high)";
  return "var(--muted-foreground)";
}

/** Overall summary badge uses the backend's classification and a fuller safe/amber/red palette. */
export function overallRiskColor(level: OverallRiskLevel): string {
  if (level === "moderate") return "var(--risk-moderate)";
  if (level === "high") return "var(--risk-high)";
  return "var(--risk-safe)";
}

export function overallRiskLabel(level: OverallRiskLevel): string {
  if (level === "moderate") return "Moderate Risk";
  if (level === "high") return "High Risk";
  return "Low Risk";
}

export function formatPercent(probability: number): string {
  return `${Math.round(probability * 100)}%`;
}

/** Returns the [outcome key, probability] pair with the highest predicted risk. */
export function topOutcome(risks: Record<string, number>): [string, number] {
  const entries = Object.entries(risks);
  return entries.reduce((max, entry) => (entry[1] > max[1] ? entry : max), entries[0] ?? ["", 0]);
}
