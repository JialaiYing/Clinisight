"use client";

import { useEffect, useRef } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { DRUG_CATALOG } from "@/lib/drugs";
import {
  patientFormSchema,
  type PatientFormValues,
} from "@/lib/validation";
import { defaultPatientValues } from "@/lib/personas";
import { AlertCircle, Loader2 } from "lucide-react";

type NumericField = Exclude<
  keyof PatientFormValues,
  | "sex"
  | "medications"
  | "diabetes"
  | "hypertension"
  | "ckd"
  | "liver_disease"
  | "heart_failure"
>;

type BoolField =
  | "diabetes"
  | "hypertension"
  | "ckd"
  | "liver_disease"
  | "heart_failure";

function clonePatient(values: PatientFormValues): PatientFormValues {
  return {
    ...values,
    medications: [...(values.medications ?? [])],
  };
}

interface PatientFormProps {
  onSubmitPatient: (values: PatientFormValues) => void;
  isSubmitting: boolean;
  submitError: string | null;
  /** Values to load into the form (demo case / history). */
  defaultValues?: PatientFormValues;
  /** Bump this to remount/reset when loading a demo case or history entry. */
  resetSignal?: number;
  /** Fires once the user changes any field away from the loaded defaults. */
  onUserEdit?: () => void;
  /** Wipes every field back to blank. */
  onClear?: () => void;
}

export function PatientForm({
  onSubmitPatient,
  isSubmitting,
  submitError,
  defaultValues = defaultPatientValues,
  resetSignal = 0,
  onUserEdit,
  onClear,
}: PatientFormProps) {
  // Remount on demo/history load so registered inputs always pick up new values.
  // Clone so RHF never shares mutable state with persona constants.
  return (
    <PatientFormInner
      key={resetSignal}
      defaultValues={clonePatient(defaultValues)}
      onSubmitPatient={onSubmitPatient}
      isSubmitting={isSubmitting}
      submitError={submitError}
      onUserEdit={onUserEdit}
      onClear={onClear}
    />
  );
}

function PatientFormInner({
  onSubmitPatient,
  isSubmitting,
  submitError,
  defaultValues,
  onUserEdit,
  onClear,
}: {
  onSubmitPatient: (values: PatientFormValues) => void;
  isSubmitting: boolean;
  submitError: string | null;
  defaultValues: PatientFormValues;
  onUserEdit?: () => void;
  onClear?: () => void;
}) {
  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isDirty },
  } = useForm<PatientFormValues>({
    resolver: zodResolver(patientFormSchema),
    defaultValues,
    shouldUnregister: false,
  });

  const notifiedDirty = useRef(false);

  // defaultValue avoids a first-paint undefined that crashes Radix Select on remount.
  const sex =
    useWatch({ control, name: "sex", defaultValue: defaultValues.sex }) ??
    defaultValues.sex ??
    "female";
  const medications =
    useWatch({
      control,
      name: "medications",
      defaultValue: defaultValues.medications,
    }) ??
    defaultValues.medications ??
    [];
  const diabetes =
    useWatch({
      control,
      name: "diabetes",
      defaultValue: defaultValues.diabetes,
    }) ?? defaultValues.diabetes;
  const hypertension =
    useWatch({
      control,
      name: "hypertension",
      defaultValue: defaultValues.hypertension,
    }) ?? defaultValues.hypertension;
  const ckd =
    useWatch({ control, name: "ckd", defaultValue: defaultValues.ckd }) ??
    defaultValues.ckd;
  const liverDisease =
    useWatch({
      control,
      name: "liver_disease",
      defaultValue: defaultValues.liver_disease,
    }) ?? defaultValues.liver_disease;
  const heartFailure =
    useWatch({
      control,
      name: "heart_failure",
      defaultValue: defaultValues.heart_failure,
    }) ?? defaultValues.heart_failure;
  const numConcurrentMeds =
    useWatch({
      control,
      name: "num_concurrent_meds",
      defaultValue: defaultValues.num_concurrent_meds,
    }) ?? defaultValues.num_concurrent_meds;

  const boolValues: Record<BoolField, boolean> = {
    diabetes: !!diabetes,
    hypertension: !!hypertension,
    ckd: !!ckd,
    liver_disease: !!liverDisease,
    heart_failure: !!heartFailure,
  };

  useEffect(() => {
    if (isDirty && onUserEdit && !notifiedDirty.current) {
      notifiedDirty.current = true;
      onUserEdit();
    }
  }, [isDirty, onUserEdit]);

  const toggleMedication = (drugId: string, checked: boolean) => {
    const current = medications;
    const next = checked
      ? current.includes(drugId)
        ? current
        : [...current, drugId]
      : current.filter((id) => id !== drugId);
    setValue("medications", next, { shouldDirty: true, shouldValidate: true });
    if (checked && numConcurrentMeds < next.length) {
      setValue("num_concurrent_meds", next.length, { shouldDirty: true });
    } else if (!checked && numConcurrentMeds === current.length) {
      setValue("num_concurrent_meds", next.length, { shouldDirty: true });
    }
  };

  const runPredict = () => {
    void handleSubmit(onSubmitPatient)();
  };

  const checkbox = (name: BoolField, label: string) => (
    <label
      key={name}
      htmlFor={name}
      className="flex items-center gap-2.5 py-1 text-sm text-foreground"
    >
      <Checkbox
        id={name}
        checked={boolValues[name]}
        onCheckedChange={(checked) =>
          setValue(name, checked === true, { shouldDirty: true })
        }
      />
      {label}
    </label>
  );

  const number = (name: NumericField, label: string, step = 1, mono = false) => (
    <div key={name} className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        type="number"
        step={step}
        className={cn(mono && "font-mono")}
        {...register(name, {
          valueAsNumber: true,
          setValueAs: (v) => {
            if (v === "" || v === null || v === undefined) return undefined;
            const n = typeof v === "number" ? v : Number(v);
            return Number.isFinite(n) ? n : undefined;
          },
        })}
      />
      {errors[name] && (
        <p className="text-xs text-destructive">Out of expected range</p>
      )}
    </div>
  );

  return (
    <div id="patient-form">
      {/*
        Not a <form>: Next.js App Router + native submit (and button-default-submit
        from Radix Checkbox/Select) was navigating to /?age=&… and wiping the page.
      */}
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold tracking-tight text-foreground">
          Patient details
        </h2>
        {onClear && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isSubmitting}
            onClick={onClear}
          >
            Clear
          </Button>
        )}
      </div>
      <div className="mt-6 space-y-10">
        <section>
          <h3 className="text-base font-semibold tracking-tight text-foreground">
            Demographics
          </h3>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {number("age", "Age (years)")}
            <div className="space-y-1.5">
              <Label htmlFor="sex">Sex</Label>
              <Select
                value={sex === "male" ? "male" : "female"}
                onValueChange={(v) =>
                  setValue("sex", v as PatientFormValues["sex"], {
                    shouldDirty: true,
                  })
                }
              >
                <SelectTrigger id="sex" type="button" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="male">Male</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {number("bmi", "BMI", 0.1)}
          </div>
        </section>

        <section>
          <h3 className="text-base font-semibold tracking-tight text-foreground">
            Vitals
          </h3>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-4">
            {number("heart_rate", "Heart Rate (bpm)")}
            {number("sbp", "Systolic BP (mmHg)")}
            {number("dbp", "Diastolic BP (mmHg)")}
            {number("temperature", "Temperature (°F)", 0.1)}
          </div>
        </section>

        <section>
          <h3 className="text-base font-semibold tracking-tight text-foreground">
            Medical History
          </h3>
          <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 lg:grid-cols-5">
            {checkbox("diabetes", "Diabetes")}
            {checkbox("hypertension", "Hypertension")}
            {checkbox("ckd", "Chronic Kidney Disease")}
            {checkbox("liver_disease", "Liver Disease")}
            {checkbox("heart_failure", "Heart Failure")}
          </div>
        </section>

        <section>
          <h3 className="text-base font-semibold tracking-tight text-foreground">
            Laboratory Values
          </h3>
          <p className="mt-2 text-xs" style={{ color: "var(--risk-info)" }}>
            eGFR is calculated automatically from creatinine, age, and sex.
          </p>
          <div className="mt-4 grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-3">
            {number("creatinine", "Creatinine (mg/dL)", 0.1, true)}
            {number("potassium", "Potassium (mEq/L)", 0.1, true)}
            {number("sodium", "Sodium (mEq/L)", 1, true)}
            {number("glucose", "Glucose (mg/dL)", 1, true)}
            {number("ast", "AST (U/L)", 1, true)}
            {number("alt", "ALT (U/L)", 1, true)}
            {number("hemoglobin", "Hemoglobin (g/dL)", 0.1, true)}
            {number("wbc", "WBC (x10³/µL)", 0.1, true)}
            {number("platelets", "Platelets (x10³/µL)", 1, true)}
          </div>
        </section>

        <section>
          <h3 className="text-base font-semibold tracking-tight text-foreground">
            Medications
          </h3>
          <p className="mt-2 text-xs text-muted-foreground">
            Curated high-risk drugs only. The concurrent-med count below can include
            others you&apos;re not tracking here.
          </p>
          <div className="mt-4 max-w-xs">
            {number("num_concurrent_meds", "Total concurrent medications")}
          </div>
          <div className="mt-4 grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
            {DRUG_CATALOG.map((drug) => {
              const checked = medications.includes(drug.id);
              return (
                <label
                  key={drug.id}
                  htmlFor={`med-${drug.id}`}
                  className="flex items-center gap-2.5 py-1 text-sm text-foreground"
                >
                  <Checkbox
                    id={`med-${drug.id}`}
                    checked={checked}
                    onCheckedChange={(value) =>
                      toggleMedication(drug.id, value === true)
                    }
                  />
                  {drug.label}
                </label>
              );
            })}
          </div>
        </section>

        {submitError && (
          <div className="flex items-start gap-2 text-sm text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>{submitError}</span>
          </div>
        )}

        <Button
          type="button"
          size="lg"
          className="h-12 w-full text-base"
          disabled={isSubmitting}
          onClick={runPredict}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Predicting…
            </>
          ) : (
            "Predict"
          )}
        </Button>
      </div>
    </div>
  );
}
