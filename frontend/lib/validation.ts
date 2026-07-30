import { z } from "zod";

// Inputs are type="number" with valueAsNumber on register, so RHF already
// hands zod real numbers. Plain z.number() (not z.coerce) keeps input/output
// types aligned for the resolver.
export const patientFormSchema = z.object({
  age: z.number().min(18).max(120),
  sex: z.enum(["female", "male"]),
  bmi: z.number().min(10).max(80),

  heart_rate: z.number().min(30).max(220),
  sbp: z.number().min(60).max(250),
  dbp: z.number().min(30).max(150),
  temperature: z.number().min(90).max(110),

  creatinine: z.number().min(0.1).max(20),
  potassium: z.number().min(1.5).max(9),
  sodium: z.number().min(110).max(170),
  ast: z.number().min(1).max(2000),
  alt: z.number().min(1).max(2000),
  hemoglobin: z.number().min(3).max(22),
  wbc: z.number().min(0.5).max(50),
  platelets: z.number().min(10).max(1000),
  glucose: z.number().min(30).max(600),

  diabetes: z.boolean(),
  hypertension: z.boolean(),
  ckd: z.boolean(),
  liver_disease: z.boolean(),
  heart_failure: z.boolean(),

  medication_class: z.enum([
    "none",
    "antihypertensive",
    "antidiabetic",
    "antibiotic",
    "analgesic",
  ]),
  num_concurrent_meds: z.number().int().min(0).max(30),
  on_nsaid: z.boolean(),
  on_ace_inhibitor: z.boolean(),
  on_anticoagulant: z.boolean(),
  on_insulin: z.boolean(),
});

export type PatientFormValues = z.infer<typeof patientFormSchema>;
