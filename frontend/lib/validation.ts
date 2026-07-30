import { z } from "zod";
import { DRUG_IDS } from "@/lib/drugs";

const drugIdSchema = z.enum(DRUG_IDS);

// Inputs are type="number" with valueAsNumber on register, so RHF already
// hands zod real numbers. Plain z.number() (not z.coerce) keeps input/output
// types aligned for the resolver.
export const patientFormSchema = z.object({
  age: z.number({ error: "Required" }).min(18).max(120),
  sex: z.enum(["female", "male"]),
  bmi: z.number({ error: "Required" }).min(10).max(80),

  heart_rate: z.number({ error: "Required" }).min(30).max(220),
  sbp: z.number({ error: "Required" }).min(60).max(250),
  dbp: z.number({ error: "Required" }).min(30).max(150),
  temperature: z.number({ error: "Required" }).min(90).max(110),

  creatinine: z.number({ error: "Required" }).min(0.1).max(20),
  potassium: z.number({ error: "Required" }).min(1.5).max(9),
  sodium: z.number({ error: "Required" }).min(110).max(170),
  ast: z.number({ error: "Required" }).min(1).max(2000),
  alt: z.number({ error: "Required" }).min(1).max(2000),
  hemoglobin: z.number({ error: "Required" }).min(3).max(22),
  wbc: z.number({ error: "Required" }).min(0.5).max(50),
  platelets: z.number({ error: "Required" }).min(10).max(1000),
  glucose: z.number({ error: "Required" }).min(30).max(600),

  diabetes: z.boolean(),
  hypertension: z.boolean(),
  ckd: z.boolean(),
  liver_disease: z.boolean(),
  heart_failure: z.boolean(),

  medications: z.array(drugIdSchema).max(30),
  num_concurrent_meds: z.number({ error: "Required" }).int().min(0).max(30),
});

export type PatientFormValues = z.infer<typeof patientFormSchema>;
