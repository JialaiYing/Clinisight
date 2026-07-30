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

/** Matches backend ELEVATED_RISK_THRESHOLD — actions only for ≥ this probability. */
export const ACTION_RISK_THRESHOLD = 0.3;

/** Returns the [outcome key, probability] pair with the highest predicted risk. */
export function topOutcome(risks: Record<string, number>): [string, number] {
  const entries = Object.entries(risks);
  return entries.reduce((max, entry) => (entry[1] > max[1] ? entry : max), entries[0] ?? ["", 0]);
}

/** Outcome keys sorted by descending risk (ties keep OUTCOME_ORDER). */
export function outcomesByRiskDesc(risks: Record<string, number>): string[] {
  return [...OUTCOME_ORDER].sort((a, b) => {
    const diff = (risks[b] ?? 0) - (risks[a] ?? 0);
    if (diff !== 0) return diff;
    return OUTCOME_ORDER.indexOf(a) - OUTCOME_ORDER.indexOf(b);
  });
}

/** Plain-language risk delta for before/after tables (same unit as displayed %). */
export function formatRiskChange(delta: number): string {
  const pct = Math.round(delta * 100);
  if (pct === 0) return "No change";
  return pct > 0 ? `Up ${pct}%` : `Down ${Math.abs(pct)}%`;
}

export function riskChangeColor(delta: number): string {
  if (delta <= -0.005) return "var(--risk-safe)";
  if (delta >= 0.005) return "var(--risk-high)";
  return "var(--muted-foreground)";
}

/** Count recommendation bullets across ADE keys. */
export function countRecommendations(
  recommendations: Record<string, string[]> | undefined
): number {
  if (!recommendations) return 0;
  return Object.values(recommendations).reduce((sum, list) => sum + list.length, 0);
}

/**
 * ADE keys that had suggested actions at baseline but not after simulation
 * (risk dropped below the action threshold or context no longer matched).
 */
export function clearedActionKeys(
  baseline: Record<string, string[]> | undefined,
  simulated: Record<string, string[]> | undefined
): string[] {
  const before = baseline ?? {};
  const after = simulated ?? {};
  return Object.keys(before).filter(
    (key) => (before[key]?.length ?? 0) > 0 && (after[key]?.length ?? 0) === 0
  );
}
