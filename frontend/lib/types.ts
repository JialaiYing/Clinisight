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

  /** Curated high-risk inpatient drug IDs. */
  medications: string[];
  num_concurrent_meds: number;
}

export type OverallRiskLevel = "low" | "moderate" | "high";
export type ConfidenceLevel = "low" | "moderate" | "high";

/** Signed model attribution from Captum Integrated Gradients. */
export interface AttributionItem {
  feature: string;
  feature_key: string;
  /** Positive → increased predicted ADE risk; negative → decreased. */
  contribution: number;
}

export interface InteractionAlert {
  outcome: string;
  message: string;
}

export interface PredictionResponse {
  risks: Record<string, number>;
  explanations: Record<string, string[]>;
  /** Present for elevated ADEs; may be missing on older cached history entries. */
  recommendations?: Record<string, string[]>;
  /** Model-faithful drivers; may be missing on older cached history entries. */
  attributions?: Record<string, AttributionItem[]>;
  interaction_alerts?: InteractionAlert[];
  overall_risk_level: OverallRiskLevel;
  /** Decisiveness of probabilities; may be missing on older cached history. */
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
