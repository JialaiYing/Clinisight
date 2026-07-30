"use client";

import { useCallback, useEffect, useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Hero } from "@/components/hero/Hero";
import { PatientForm } from "@/components/forms/PatientForm";
import { EmptyState } from "@/components/results/EmptyState";
import { RiskReport } from "@/components/results/RiskReport";
import {
  ScenarioCompare,
  scenariosDiffer,
  type ScenarioSnapshot,
} from "@/components/results/ScenarioCompare";
import { PastPredictions } from "@/components/results/PastPredictions";
import { ModelCard } from "@/components/results/ModelCard";
import { DemoPersonas } from "@/components/forms/DemoPersonas";
import { ApiError, predictPatient } from "@/lib/api";
import {
  addHistoryEntry,
  clearHistory,
  deleteHistoryEntry,
  loadHistory,
  loadTrash,
  restoreTrashEntry,
  type HistoryEntry,
  type TrashEntry,
} from "@/lib/history";
import {
  blankPatientValues,
  defaultPatientValues,
  PRIMARY_PERSONA,
  type DemoPersona,
} from "@/lib/personas";
import type { PatientFormValues } from "@/lib/validation";
import type { PredictionResponse } from "@/lib/types";

function formatSnapshotTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function snapshotLabel(patient: PatientFormValues, createdAt?: string): string {
  const who = `${patient.age}${patient.sex === "female" ? "F" : "M"}`;
  return createdAt ? `${who} · ${formatSnapshotTime(createdAt)}` : who;
}

function snapshotFromLive(
  id: string,
  patient: PatientFormValues,
  result: PredictionResponse,
  createdAt?: string
): ScenarioSnapshot {
  return {
    id,
    label: snapshotLabel(patient, createdAt),
    patient,
    result,
  };
}

export default function Home() {
  const [result, setResult] = useState<PredictionResponse | null>(null);
  const [baselinePatient, setBaselinePatient] = useState<PatientFormValues | null>(null);
  const [formValues, setFormValues] = useState<PatientFormValues>(defaultPatientValues);
  const [formKey, setFormKey] = useState(0);
  const [reportKey, setReportKey] = useState(0);
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);
  const [activeCreatedAt, setActiveCreatedAt] = useState<string | null>(null);
  const [compare, setCompare] = useState<ScenarioSnapshot | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [trash, setTrash] = useState<TrashEntry[]>([]);
  const [pastOpen, setPastOpen] = useState(false);
  const [activePersonaId, setActivePersonaId] = useState<string | null>(PRIMARY_PERSONA.id);

  useEffect(() => {
    // localStorage is a client-only external system; can't read it during SSR render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHistory(loadHistory());
    setTrash(loadTrash());
  }, []);

  const handleLoadPersona = useCallback((persona: DemoPersona) => {
    // Clone so React always sees a new values object even if the same case is re-clicked.
    setFormValues({ ...persona.values, medications: [...persona.values.medications] });
    setFormKey((k) => k + 1);
    setActivePersonaId(persona.id);
    setSubmitError(null);
    document.getElementById("patient-form")?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const handleUserEdit = useCallback(() => {
    setActivePersonaId(null);
  }, []);

  const handleClearForm = useCallback(() => {
    setFormValues({ ...blankPatientValues, medications: [] });
    setFormKey((k) => k + 1);
    setActivePersonaId(null);
    setSubmitError(null);
  }, []);

  const pinCurrentAsCompare = () => {
    if (!result || !baselinePatient) return;
    setCompare(
      snapshotFromLive(
        activeEntryId ?? `live-${reportKey}`,
        baselinePatient,
        result,
        activeCreatedAt ?? undefined
      )
    );
  };

  const handleSubmitPatient = async (values: PatientFormValues) => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const prediction = await predictPatient(values);
      pinCurrentAsCompare();
      const nextHistory = addHistoryEntry(values, prediction);
      const newest = nextHistory[0];
      setHistory(nextHistory);
      setBaselinePatient(values);
      setFormValues(values);
      setResult(prediction);
      setActiveEntryId(newest?.id ?? null);
      setActiveCreatedAt(newest?.createdAt ?? null);
      setReportKey((k) => k + 1);
      setPastOpen(true);
      document.getElementById("results")?.scrollIntoView({ behavior: "smooth" });
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "Unexpected error running prediction.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectHistoryEntry = (entry: HistoryEntry) => {
    if (activeEntryId === entry.id) {
      document.getElementById("results")?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    pinCurrentAsCompare();
    setBaselinePatient(entry.patient);
    setFormValues({
      ...entry.patient,
      medications: [...(entry.patient.medications ?? [])],
    });
    setFormKey((k) => k + 1);
    setResult(entry.result);
    setActiveEntryId(entry.id);
    setActiveCreatedAt(entry.createdAt);
    setActivePersonaId(null);
    setReportKey((k) => k + 1);
    setSubmitError(null);
    setPastOpen(true);
    document.getElementById("results")?.scrollIntoView({ behavior: "smooth" });
  };

  const handleDeleteEntry = (id: string) => {
    const next = deleteHistoryEntry(id);
    setHistory(next.history);
    setTrash(next.trash);
    if (activeEntryId === id) {
      setActiveEntryId(null);
      setActiveCreatedAt(null);
      setResult(null);
      setBaselinePatient(null);
      setCompare(null);
    } else if (compare?.id === id) {
      setCompare(null);
    }
  };

  const handleClearHistory = () => {
    const next = clearHistory();
    setHistory(next.history);
    setTrash(next.trash);
    setActiveEntryId(null);
    setActiveCreatedAt(null);
    setCompare(null);
    setResult(null);
    setBaselinePatient(null);
  };

  const handleRestoreEntry = (id: string) => {
    const next = restoreTrashEntry(id);
    setHistory(next.history);
    setTrash(next.trash);
  };

  const currentSnapshot =
    result && baselinePatient
      ? snapshotFromLive(
          activeEntryId ?? `live-${reportKey}`,
          baselinePatient,
          result,
          activeCreatedAt ?? undefined
        )
      : null;

  const showCompare =
    compare &&
    currentSnapshot &&
    scenariosDiffer(compare, currentSnapshot);

  return (
    <>
      <div className="print:hidden">
        <Navbar />
      </div>
      <main className="flex-1">
        <div className="print:hidden">
          <Hero />
        </div>

        <section className="mx-auto max-w-[1200px] px-4 pb-12 sm:px-6 lg:px-8 print:hidden">
          <DemoPersonas
            activePersonaId={activePersonaId}
            onSelect={handleLoadPersona}
          />
          <PatientForm
            defaultValues={formValues}
            resetSignal={formKey}
            onSubmitPatient={handleSubmitPatient}
            onClear={handleClearForm}
            isSubmitting={isSubmitting}
            submitError={submitError}
            onUserEdit={handleUserEdit}
          />
        </section>

        <div className="border-t border-border print:hidden" aria-hidden="true" />

        <section
          id="results"
          className="mx-auto max-w-[1200px] scroll-mt-20 px-4 pt-12 pb-12 sm:px-6 lg:px-8"
        >
          {result && baselinePatient && currentSnapshot ? (
            <>
              {showCompare && compare && (
                <div className="print:hidden">
                  <ScenarioCompare
                    previous={compare}
                    current={currentSnapshot}
                    onDismiss={() => setCompare(null)}
                  />
                </div>
              )}
              <RiskReport
                key={reportKey}
                result={result}
                baselinePatient={baselinePatient}
              />
            </>
          ) : (
            <div className="print:hidden">
              <h2 className="mb-4 text-base font-semibold tracking-tight text-foreground">
                Risk assessment report
              </h2>
              <EmptyState />
            </div>
          )}
        </section>

        <div className="border-t border-border print:hidden" aria-hidden="true" />

        <section className="mx-auto max-w-[1200px] px-4 pt-2 pb-16 sm:px-6 lg:px-8 print:hidden">
          <PastPredictions
            open={pastOpen}
            onOpenChange={setPastOpen}
            history={history}
            trash={trash}
            activeEntryId={activeEntryId}
            onSelect={handleSelectHistoryEntry}
            onDelete={handleDeleteEntry}
            onClear={handleClearHistory}
            onRestore={handleRestoreEntry}
          />
        </section>

        <section id="about" className="border-t border-border bg-card print:hidden">
          <div className="mx-auto max-w-[1200px] px-4 py-14 sm:px-6 lg:px-8">
            <h2 className="text-sm font-semibold text-foreground">About</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Clinisight is an inpatient medication-safety prototype: given labs and meds, it
              estimates risk for six adverse drug events (AKI, hyperkalemia, QT prolongation,
              liver toxicity, bleeding, hypoglycemia), suggests next actions, and lets clinicians
              simulate safer regimens before prescribing. Trained on synthetic patient data,
              not clinically validated. See{" "}
              <a href="#model-card" className="underline-offset-2 hover:underline">
                model card
              </a>{" "}
              for test metrics.
            </p>
            <p className="mt-3 text-sm font-medium text-foreground">
              {result?.disclaimer ?? "Not for clinical use. Prototype only."}
            </p>

            <div className="mt-10 border-t border-border pt-10">
              <ModelCard />
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
