import {
  OUTCOME_LABELS,
  cardRiskLabel,
  cardRiskTier,
  formatPercent,
  outcomesByRiskDesc,
  overallRiskLabel,
  topOutcome,
} from "@/lib/risk";
import { drugLabel } from "@/lib/drugs";
import type { PatientFormValues } from "@/lib/validation";
import type { PredictionResponse } from "@/lib/types";

export function patientSnapshot(patient: PatientFormValues): string {
  const parts = [`${patient.age}${patient.sex === "female" ? "F" : "M"}`];
  const meds = (patient.medications ?? []).slice(0, 3).map(drugLabel);
  if (meds.length) parts.push(meds.join(", "));
  if ((patient.medications?.length ?? 0) > 3) {
    parts.push(`+${patient.medications.length - 3} more`);
  }
  parts.push(`${patient.num_concurrent_meds} concurrent meds`);
  return parts.join(" · ");
}

function comorbidityList(patient: PatientFormValues): string {
  const items: string[] = [];
  if (patient.diabetes) items.push("Diabetes");
  if (patient.hypertension) items.push("Hypertension");
  if (patient.ckd) items.push("CKD");
  if (patient.liver_disease) items.push("Liver disease");
  if (patient.heart_failure) items.push("Heart failure");
  return items.length ? items.join(", ") : "None recorded";
}

function medicationList(patient: PatientFormValues): string {
  const named = (patient.medications ?? []).map(drugLabel);
  if (!named.length) {
    return `${patient.num_concurrent_meds} concurrent medications (none curated selected)`;
  }
  return `${named.join(", ")}; ${patient.num_concurrent_meds} concurrent medications`;
}

function formatGeneratedAt(date: Date): string {
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/** Plain-text clinician handoff note for clipboard / paste into EHR or email. */
export function buildHandoffText(
  patient: PatientFormValues,
  result: PredictionResponse,
  generatedAt: Date = new Date()
): string {
  const [topKey, topProbability] = topOutcome(result.risks);
  const orderedKeys = outcomesByRiskDesc(result.risks);
  const recommendations = result.recommendations ?? {};
  const actionKeys = orderedKeys.filter((key) => (recommendations[key]?.length ?? 0) > 0);

  const lines: string[] = [
    "CLINISIGHT · CLINICIAN HANDOFF NOTE",
    "Care-team use only. Not a patient education document.",
    `Generated: ${formatGeneratedAt(generatedAt)}`,
    "",
    "PATIENT SUMMARY",
    `Demographics: ${patient.age} ${patient.sex}, BMI ${patient.bmi}`,
    `Vitals: HR ${patient.heart_rate}, BP ${patient.sbp}/${patient.dbp}, Temp ${patient.temperature}°F`,
    `History: ${comorbidityList(patient)}`,
    `Labs: Cr ${patient.creatinine} mg/dL, eGFR ${result.computed_egfr} mL/min/1.73m², K ${patient.potassium}, Na ${patient.sodium}, Glu ${patient.glucose}, AST ${patient.ast}, ALT ${patient.alt}, Hb ${patient.hemoglobin}, WBC ${patient.wbc}, Plt ${patient.platelets}`,
    `Medications: ${medicationList(patient)}`,
    "",
    "RISK SUMMARY",
    `Overall: ${overallRiskLabel(result.overall_risk_level)}`,
    `Most concerning: ${OUTCOME_LABELS[topKey] ?? topKey} (${formatPercent(topProbability)})`,
    `Primary driver: ${result.explanations[topKey]?.[0] ?? "None identified"}`,
    "",
    "ADVERSE EVENT RISKS (highest first)",
  ];

  for (const key of orderedKeys) {
    const probability = result.risks[key] ?? 0;
    const tier = cardRiskLabel(cardRiskTier(probability * 100));
    lines.push(`- ${OUTCOME_LABELS[key] ?? key}: ${formatPercent(probability)} (${tier})`);
    for (const factor of result.explanations[key] ?? []) {
      lines.push(`  Factor: ${factor}`);
    }
  }

  lines.push("", "DRUG INTERACTION ALERTS");
  const alerts = result.interaction_alerts ?? [];
  if (alerts.length === 0) {
    lines.push("- None flagged for the current curated regimen.");
  } else {
    for (const alert of alerts) {
      lines.push(`- ${OUTCOME_LABELS[alert.outcome] ?? alert.outcome}: ${alert.message}`);
    }
  }

  lines.push("", "SUGGESTED NEXT ACTIONS");
  if (actionKeys.length === 0) {
    lines.push("- No events met the ≥30% action threshold. Continue routine monitoring.");
  } else {
    for (const key of actionKeys) {
      lines.push(`- ${OUTCOME_LABELS[key] ?? key} (${formatPercent(result.risks[key] ?? 0)})`);
      for (const action of recommendations[key] ?? []) {
        lines.push(`  → ${action}`);
      }
    }
  }

  lines.push("", "DISCLAIMER", result.disclaimer);
  return lines.join("\n");
}

export interface HandoffSection {
  title: string;
  lines: string[];
}

/** Structured sections for the printable handoff document. */
export function buildHandoffSections(
  patient: PatientFormValues,
  result: PredictionResponse,
  generatedAt: Date = new Date()
): { subtitle: string; sections: HandoffSection[] } {
  const [topKey, topProbability] = topOutcome(result.risks);
  const orderedKeys = outcomesByRiskDesc(result.risks);
  const recommendations = result.recommendations ?? {};
  const actionKeys = orderedKeys.filter((key) => (recommendations[key]?.length ?? 0) > 0);

  const riskLines = orderedKeys.flatMap((key) => {
    const probability = result.risks[key] ?? 0;
    const tier = cardRiskLabel(cardRiskTier(probability * 100));
    const head = `${OUTCOME_LABELS[key] ?? key}: ${formatPercent(probability)} (${tier})`;
    const factors = (result.explanations[key] ?? []).map((f) => `Factor: ${f}`);
    return [head, ...factors];
  });

  const actionLines =
    actionKeys.length === 0
      ? ["No events met the ≥30% action threshold. Continue routine monitoring."]
      : actionKeys.flatMap((key) => [
          `${OUTCOME_LABELS[key] ?? key} (${formatPercent(result.risks[key] ?? 0)})`,
          ...(recommendations[key] ?? []).map((a) => `→ ${a}`),
        ]);

  const alertLines =
    (result.interaction_alerts?.length ?? 0) === 0
      ? ["None flagged for the current curated regimen."]
      : (result.interaction_alerts ?? []).map(
          (alert) =>
            `${OUTCOME_LABELS[alert.outcome] ?? alert.outcome}: ${alert.message}`
        );

  return {
    subtitle: `Care-team handoff · Generated ${formatGeneratedAt(generatedAt)}`,
    sections: [
      {
        title: "Patient summary",
        lines: [
          `Demographics: ${patient.age} ${patient.sex}, BMI ${patient.bmi}`,
          `Vitals: HR ${patient.heart_rate}, BP ${patient.sbp}/${patient.dbp}, Temp ${patient.temperature}°F`,
          `History: ${comorbidityList(patient)}`,
          `Labs: Cr ${patient.creatinine} mg/dL, eGFR ${result.computed_egfr} mL/min/1.73m², K ${patient.potassium}, Na ${patient.sodium}, Glu ${patient.glucose}, AST ${patient.ast}, ALT ${patient.alt}, Hb ${patient.hemoglobin}, WBC ${patient.wbc}, Plt ${patient.platelets}`,
          `Medications: ${medicationList(patient)}`,
        ],
      },
      {
        title: "Risk summary",
        lines: [
          `Overall: ${overallRiskLabel(result.overall_risk_level)}`,
          `Most concerning: ${OUTCOME_LABELS[topKey] ?? topKey} (${formatPercent(topProbability)})`,
          `Primary driver: ${result.explanations[topKey]?.[0] ?? "None identified"}`,
        ],
      },
      { title: "Adverse event risks", lines: riskLines },
      { title: "Drug interaction alerts", lines: alertLines },
      { title: "Suggested next actions", lines: actionLines },
      { title: "Disclaimer", lines: [result.disclaimer] },
    ],
  };
}
