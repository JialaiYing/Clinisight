/** Curated drug catalog mirrored from backend/ml/drugs.py for the UI. */

export interface DrugInfo {
  id: string;
  label: string;
  tags: string[];
}

/** Keep in sync with backend/ml/drugs.py DRUG_CATALOG. */
export const DRUG_CATALOG: DrugInfo[] = [
  { id: "lisinopril", label: "Lisinopril", tags: ["ace_inhibitor"] },
  { id: "losartan", label: "Losartan", tags: ["ace_inhibitor"] },
  { id: "spironolactone", label: "Spironolactone", tags: ["k_sparing_diuretic"] },
  { id: "furosemide", label: "Furosemide", tags: ["loop_diuretic"] },
  { id: "ibuprofen", label: "Ibuprofen", tags: ["nsaid"] },
  { id: "ketorolac", label: "Ketorolac", tags: ["nsaid"] },
  { id: "warfarin", label: "Warfarin", tags: ["anticoagulant"] },
  { id: "heparin", label: "Heparin", tags: ["anticoagulant"] },
  { id: "apixaban", label: "Apixaban", tags: ["anticoagulant"] },
  { id: "aspirin", label: "Aspirin", tags: ["antiplatelet"] },
  { id: "insulin", label: "Insulin", tags: ["insulin", "antidiabetic"] },
  { id: "metformin", label: "Metformin", tags: ["antidiabetic"] },
  { id: "glipizide", label: "Glipizide", tags: ["antidiabetic", "sulfonylurea"] },
  {
    id: "amoxicillin_clavulanate",
    label: "Amoxicillin-clavulanate",
    tags: ["antibiotic", "hepatotoxic"],
  },
  { id: "azithromycin", label: "Azithromycin", tags: ["antibiotic", "qt_risk"] },
  { id: "amiodarone", label: "Amiodarone", tags: ["qt_risk"] },
  { id: "ondansetron", label: "Ondansetron", tags: ["qt_risk"] },
  { id: "acetaminophen", label: "Acetaminophen", tags: ["analgesic"] },
];

export const DRUG_IDS = DRUG_CATALOG.map((d) => d.id) as [string, ...string[]];

export const DRUG_LABELS: Record<string, string> = Object.fromEntries(
  DRUG_CATALOG.map((d) => [d.id, d.label])
);

export function drugLabel(id: string): string {
  return DRUG_LABELS[id] ?? id;
}
