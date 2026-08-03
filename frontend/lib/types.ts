export type Sex = "female" | "male";

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

  /** Drug IDs from the curated inpatient list. */
  medications: string[];
  num_concurrent_meds: number;
}

export type OverallRiskLevel = "low" | "moderate" | "high";
export type ConfidenceLevel = "low" | "moderate" | "high";

/** One Captum attribution row for the UI. */
export interface AttributionItem {
  feature: string;
  feature_key: string;
  /** Positive pushes ADE risk up; negative pushes it down. */
  contribution: number;
}

export interface InteractionAlert {
  outcome: string;
  message: string;
}

export interface PredictionResponse {
  risks: Record<string, number>;
  explanations: Record<string, string[]>;
  /** Elevated ADEs only; older history rows may omit this. */
  recommendations?: Record<string, string[]>;
  /** Captum drivers; older history rows may omit this. */
  attributions?: Record<string, AttributionItem[]>;
  interaction_alerts?: InteractionAlert[];
  overall_risk_level: OverallRiskLevel;
  /** How decisive the probabilities look; older history may omit this. */
  confidence?: ConfidenceLevel;
  calibration_applied?: boolean;
  disclaimer: string;
  computed_egfr: number;
}

export interface OutcomeMetrics {
  auroc: number;
  auprc: number;
  "accuracy@0.5": number;
  prevalence: number;
  brier?: number;
  ece?: number;
}

export interface ModelMetrics {
  labels: Record<string, OutcomeMetrics>;
  macro_auroc: number;
  macro_auprc: number;
  macro_brier?: number;
  macro_ece?: number;
  "element_accuracy@0.5"?: number;
  best_epoch?: number;
  best_val_loss?: number;
  calibration?: {
    method: string;
    fitted_on: string;
    temperatures: Record<string, number>;
    macro_brier_before?: number;
    macro_brier_after?: number;
    macro_ece_before?: number;
    macro_ece_after?: number;
  };
  training?: {
    architecture: string;
    loss: string;
    optimizer: string;
    data: string;
    n_features: number;
    n_outcomes: number;
    disclaimer: string;
  };
  splits?: {
    train: number;
    val: number;
    test: number;
  };
}
