export type Sex = "female" | "male";

export type MedicationClass =
  | "none"
  | "antihypertensive"
  | "antidiabetic"
  | "antibiotic"
  | "analgesic";

export interface PatientInput {
  age: number;
  sex: Sex;
  bmi: number;

  heart_rate: number;
  sbp: number;
  dbp: number;
  temperature: number;

  creatinine: number;
  potassium: number;
  sodium: number;
  ast: number;
  alt: number;
  hemoglobin: number;
  wbc: number;
  platelets: number;
  glucose: number;

  diabetes: boolean;
  hypertension: boolean;
  ckd: boolean;
  liver_disease: boolean;
  heart_failure: boolean;

  medication_class: MedicationClass;
  num_concurrent_meds: number;
  on_nsaid: boolean;
  on_ace_inhibitor: boolean;
  on_anticoagulant: boolean;
  on_insulin: boolean;
}

export type OverallRiskLevel = "low" | "moderate" | "high";

export interface PredictionResponse {
  risks: Record<string, number>;
  explanations: Record<string, string[]>;
  overall_risk_level: OverallRiskLevel;
  disclaimer: string;
  computed_egfr: number;
}
