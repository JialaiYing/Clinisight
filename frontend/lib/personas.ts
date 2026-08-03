import type { PatientFormValues } from "@/lib/validation";

export interface DemoPersona {
  id: string;
  name: string;
  /** Short clinical label on the button. */
  tagline: string;
  /** Care setting for context. */
  setting: string;
  /** One-line case story. */
  blurb: string;
  values: PatientFormValues;
}

/** Click-to-load inpatient demo cases. */
export const DEMO_PERSONAS: DemoPersona[] = [
  {
    id: "margaret-chen",
    name: "Margaret Chen",
    tagline: "72F · CKD · lisinopril + ibuprofen",
    setting: "Inpatient · pain order",
    blurb:
      "CKD on lisinopril; ibuprofen just added for back pain. High AKI / hyperkalemia risk. Try swapping to acetaminophen.",
    values: {
      age: 72,
      sex: "female",
      bmi: 28.4,
      heart_rate: 82,
      sbp: 128,
      dbp: 74,
      temperature: 98.2,
      creatinine: 1.7,
      potassium: 5.0,
      sodium: 136,
      ast: 26,
      alt: 24,
      hemoglobin: 11.4,
      wbc: 7.8,
      platelets: 198,
      glucose: 118,
      diabetes: true,
      hypertension: true,
      ckd: true,
      liver_disease: false,
      heart_failure: false,
      medications: ["lisinopril", "ibuprofen", "metformin"],
      num_concurrent_meds: 7,
    },
  },
  {
    id: "james-okonkwo",
    name: "James Okonkwo",
    tagline: "58M · HF · warfarin + QT stack",
    setting: "Inpatient · new antibiotic",
    blurb:
      "Heart failure on warfarin with azithromycin + ondansetron. QT and bleeding risk climb if therapy stacks further.",
    values: {
      age: 58,
      sex: "male",
      bmi: 31.2,
      heart_rate: 88,
      sbp: 108,
      dbp: 68,
      temperature: 99.1,
      creatinine: 1.4,
      potassium: 4.3,
      sodium: 132,
      ast: 38,
      alt: 42,
      hemoglobin: 12.1,
      wbc: 11.2,
      platelets: 165,
      glucose: 132,
      diabetes: false,
      hypertension: true,
      ckd: false,
      liver_disease: false,
      heart_failure: true,
      medications: [
        "lisinopril",
        "warfarin",
        "azithromycin",
        "ondansetron",
        "furosemide",
      ],
      num_concurrent_meds: 9,
    },
  },
  {
    id: "rosa-alvarez",
    name: "Rosa Alvarez",
    tagline: "64F · diabetes · insulin + ACE-I",
    setting: "Inpatient · glycemic control",
    blurb:
      "Insulin-treated diabetes with reduced kidney clearance. Hypoglycemia risk. Try removing glipizide or lowering intensity.",
    values: {
      age: 64,
      sex: "female",
      bmi: 29.6,
      heart_rate: 76,
      sbp: 138,
      dbp: 80,
      temperature: 98.5,
      creatinine: 1.5,
      potassium: 4.4,
      sodium: 139,
      ast: 22,
      alt: 25,
      hemoglobin: 12.6,
      wbc: 6.9,
      platelets: 225,
      glucose: 86,
      diabetes: true,
      hypertension: true,
      ckd: true,
      liver_disease: false,
      heart_failure: false,
      medications: ["insulin", "lisinopril", "metformin", "glipizide"],
      num_concurrent_meds: 6,
    },
  },
];

// NaN keeps number inputs visually empty (they coerce NaN to "") instead of
// showing 0. Personas only fill the form when the user clicks one.
export const blankPatientValues: PatientFormValues = {
  age: Number.NaN,
  sex: "female",
  bmi: Number.NaN,
  heart_rate: Number.NaN,
  sbp: Number.NaN,
  dbp: Number.NaN,
  temperature: Number.NaN,
  creatinine: Number.NaN,
  potassium: Number.NaN,
  sodium: Number.NaN,
  ast: Number.NaN,
  alt: Number.NaN,
  hemoglobin: Number.NaN,
  wbc: Number.NaN,
  platelets: Number.NaN,
  glucose: Number.NaN,
  diabetes: false,
  hypertension: false,
  ckd: false,
  liver_disease: false,
  heart_failure: false,
  medications: [],
  num_concurrent_meds: Number.NaN,
};
