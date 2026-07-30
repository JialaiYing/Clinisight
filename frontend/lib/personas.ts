import type { PatientFormValues } from "@/lib/validation";

export interface DemoPersona {
  id: string;
  name: string;
  /** Compact clinical identifier shown on the button. */
  tagline: string;
  /** Where this case shows up in a real workflow. */
  setting: string;
  /** One-line story for the demo. */
  blurb: string;
  values: PatientFormValues;
}

/**
 * Theatrical demo cases for inpatient medication-safety walkthroughs.
 * Primary narrative: catch nephrotoxic / metabolic ADE risk before prescribing.
 */
export const DEMO_PERSONAS: DemoPersona[] = [
  {
    id: "margaret-chen",
    name: "Margaret Chen",
    tagline: "72F · CKD · ACE-I + NSAID",
    setting: "Inpatient — pain order",
    blurb: "CKD on an ACE inhibitor; NSAID just added for back pain. High AKI / hyperkalemia risk.",
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
      medication_class: "analgesic",
      num_concurrent_meds: 7,
      on_nsaid: true,
      on_ace_inhibitor: true,
      on_anticoagulant: false,
      on_insulin: false,
    },
  },
  {
    id: "james-okonkwo",
    name: "James Okonkwo",
    tagline: "58M · HF · polypharmacy",
    setting: "Inpatient — new antibiotic",
    blurb: "Heart failure with a long med list; QT and bleeding risk climb if therapy stacks further.",
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
      medication_class: "antibiotic",
      num_concurrent_meds: 9,
      on_nsaid: false,
      on_ace_inhibitor: true,
      on_anticoagulant: true,
      on_insulin: false,
    },
  },
  {
    id: "rosa-alvarez",
    name: "Rosa Alvarez",
    tagline: "64F · diabetes · insulin",
    setting: "Inpatient — glycemic control",
    blurb: "Insulin-treated diabetes with reduced kidney clearance. Hypoglycemia risk on the current regimen.",
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
      medication_class: "antidiabetic",
      num_concurrent_meds: 6,
      on_nsaid: false,
      on_ace_inhibitor: true,
      on_anticoagulant: false,
      on_insulin: true,
    },
  },
];

export const PRIMARY_PERSONA = DEMO_PERSONAS[0];

/** Form default = primary demo persona so the app opens on a theatrical case. */
export const defaultPatientValues: PatientFormValues = PRIMARY_PERSONA.values;
