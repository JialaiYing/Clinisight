import {
  OUTCOME_LABELS,
  cardRiskLabel,
  cardRiskTier,
  formatPercent,
  outcomesByRiskDesc,
  overallRiskLabel,
  topOutcome,
} from "@/lib/risk";
import type { PatientFormValues } from "@/lib/validation";
import type { PredictionResponse } from "@/lib/types";

export const MED_CLASS_LABELS: Record<string, string> = {
  none: "No primary class",
  antihypertensive: "Antihypertensive",
  antidiabetic: "Antidiabetic",
  antibiotic: "Antibiotic",
  analgesic: "Analgesic",
};

export function patientSnapshot(patient: PatientFormValues): string {
  const parts = [
    `${patient.age}${patient.sex === "female" ? "F" : "M"}`,
    MED_CLASS_LABELS[patient.medication_class] ?? patient.medication_class,
  ];
  const flags: string[] = [];
  if (patient.on_nsaid) flags.push("NSAID");
  if (patient.on_ace_inhibitor) flags.push("ACE-I");
  if (patient.on_anticoagulant) flags.push("Anticoagulant");
  if (patient.on_insulin) flags.push("Insulin");
  if (flags.length) parts.push(flags.join(", "));
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
  const items = [MED_CLASS_LABELS[patient.medication_class] ?? patient.medication_class];
  if (patient.on_nsaid) items.push("NSAID");
  if (patient.on_ace_inhibitor) items.push("ACE inhibitor");
  if (patient.on_anticoagulant) items.push("Anticoagulant");
  if (patient.on_insulin) items.push("Insulin");
  items.push(`${patient.num_concurrent_meds} concurrent medications`);
  return items.join("; ");
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
    "CLINISIGHT — CLINICIAN HANDOFF NOTE",
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
      { title: "Suggested next actions", lines: actionLines },
      { title: "Disclaimer", lines: [result.disclaimer] },
    ],
  };
}
