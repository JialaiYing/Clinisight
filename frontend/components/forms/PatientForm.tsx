"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type FieldPath } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  defaultPatientValues,
  patientFormSchema,
  type PatientFormValues,
} from "@/lib/validation";
import { AlertCircle, Loader2 } from "lucide-react";

type FormField = FieldPath<PatientFormValues>;

interface PatientFormProps {
  onSubmitPatient: (values: PatientFormValues) => void;
  isSubmitting: boolean;
  submitError: string | null;
}

export function PatientForm({ onSubmitPatient, isSubmitting, submitError }: PatientFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<PatientFormValues>({
    resolver: zodResolver(patientFormSchema),
    defaultValues: defaultPatientValues,
  });

  const values = watch();

  const checkbox = (name: FormField, label: string) => (
    <label
      key={name}
      htmlFor={name}
      className="flex items-center gap-2.5 rounded-lg border border-border px-3 py-2.5 text-sm transition-colors hover:bg-muted"
    >
      <Checkbox
        id={name}
        checked={Boolean(values[name])}
        onCheckedChange={(checked) => setValue(name, checked === true)}
      />
      {label}
    </label>
  );

  const number = (name: FormField, label: string, step = 1, mono = false) => (
    <div key={name} className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        type="number"
        step={step}
        className={cn(mono && "font-mono")}
        {...register(name, { valueAsNumber: true })}
      />
      {errors[name] && (
        <p className="text-xs text-destructive">Out of expected range</p>
      )}
    </div>
  );

  return (
    <Card id="patient-form" className="rounded-lg border border-border p-6 shadow-none sm:p-8">
      <CardContent className="px-0">
        <form
          onSubmit={handleSubmit(onSubmitPatient)}
          className="space-y-10"
        >
          <section>
            <h3 className="text-sm font-semibold text-foreground">Demographics</h3>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              {number("age", "Age (years)")}
              <div className="space-y-1.5">
                <Label htmlFor="sex">Sex</Label>
                <Select
                  value={values.sex}
                  onValueChange={(v) => setValue("sex", v as PatientFormValues["sex"])}
                >
                  <SelectTrigger id="sex" className="w-full">
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
            <h3 className="text-sm font-semibold text-foreground">Vitals</h3>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-4">
              {number("heart_rate", "Heart Rate (bpm)")}
              {number("sbp", "Systolic BP (mmHg)")}
              {number("dbp", "Diastolic BP (mmHg)")}
              {number("temperature", "Temperature (°F)", 0.1)}
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-foreground">Medical History</h3>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {checkbox("diabetes", "Diabetes")}
              {checkbox("hypertension", "Hypertension")}
              {checkbox("ckd", "Chronic Kidney Disease")}
              {checkbox("liver_disease", "Liver Disease")}
              {checkbox("heart_failure", "Heart Failure")}
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-foreground">Laboratory Values</h3>
            <p className="mt-1 text-xs" style={{ color: "var(--risk-info)" }}>
              eGFR is calculated automatically from creatinine, age, and sex.
            </p>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-4">
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
            <h3 className="text-sm font-semibold text-foreground">Medications</h3>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="medication_class">Medication Class</Label>
                <Select
                  value={values.medication_class}
                  onValueChange={(v) =>
                    setValue("medication_class", v as PatientFormValues["medication_class"])
                  }
                >
                  <SelectTrigger id="medication_class" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="antihypertensive">Antihypertensive</SelectItem>
                    <SelectItem value="antidiabetic">Antidiabetic</SelectItem>
                    <SelectItem value="antibiotic">Antibiotic</SelectItem>
                    <SelectItem value="analgesic">Analgesic</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {number("num_concurrent_meds", "Concurrent Medications")}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {checkbox("on_nsaid", "NSAID")}
              {checkbox("on_ace_inhibitor", "ACE Inhibitor")}
              {checkbox("on_anticoagulant", "Anticoagulant")}
              {checkbox("on_insulin", "Insulin")}
            </div>
          </section>

          {submitError && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          <Button type="submit" size="lg" className="h-12 w-full text-base" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Predicting…
              </>
            ) : (
              "Predict"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
