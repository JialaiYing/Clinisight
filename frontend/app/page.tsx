"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Navbar } from "@/components/layout/Navbar";
import { Hero } from "@/components/hero/Hero";
import { PatientForm } from "@/components/forms/PatientForm";
import { EmptyState } from "@/components/results/EmptyState";
import { ResultsGrid } from "@/components/results/ResultsGrid";
import { PatientSummary } from "@/components/results/PatientSummary";
import { HistoryLog } from "@/components/results/HistoryLog";
import { RecycleBin } from "@/components/results/RecycleBin";
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
import type { PatientFormValues } from "@/lib/validation";
import type { PredictionResponse } from "@/lib/types";

export default function Home() {
  const [result, setResult] = useState<PredictionResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [trash, setTrash] = useState<TrashEntry[]>([]);

  useEffect(() => {
    setHistory(loadHistory());
    setTrash(loadTrash());
  }, []);

  const handleSubmitPatient = async (values: PatientFormValues) => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const prediction = await predictPatient(values);
      setResult(prediction);
      setHistory(addHistoryEntry(values, prediction));
      document.getElementById("results")?.scrollIntoView({ behavior: "smooth" });
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "Unexpected error running prediction.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEntry = (id: string) => {
    const next = deleteHistoryEntry(id);
    setHistory(next.history);
    setTrash(next.trash);
  };

  const handleClearHistory = () => {
    const next = clearHistory();
    setHistory(next.history);
    setTrash(next.trash);
  };

  const handleRestoreEntry = (id: string) => {
    const next = restoreTrashEntry(id);
    setHistory(next.history);
    setTrash(next.trash);
  };

  return (
    <>
      <Navbar />
      <main className="flex-1">
        <Hero />

        <section className="mx-auto max-w-[1200px] px-4 pb-16 sm:px-6 lg:px-8">
          <PatientForm
            onSubmitPatient={handleSubmitPatient}
            isSubmitting={isSubmitting}
            submitError={submitError}
          />
        </section>

        <section id="results" className="mx-auto max-w-[1200px] px-4 pb-24 sm:px-6 lg:px-8">
          <h2 className="mb-4 text-sm font-semibold text-foreground">Risk Results</h2>
          {result ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <ResultsGrid result={result} />
              <PatientSummary result={result} />
            </motion.div>
          ) : (
            <EmptyState />
          )}
        </section>

        <section className="mx-auto max-w-[1200px] px-4 pb-24 sm:px-6 lg:px-8">
          <HistoryLog entries={history} onDelete={handleDeleteEntry} onClear={handleClearHistory} />
          <RecycleBin entries={trash} onRestore={handleRestoreEntry} />
        </section>

        <section
          id="about"
          className="border-t border-border bg-card"
        >
          <div className="mx-auto max-w-[1200px] px-4 py-14 sm:px-6 lg:px-8">
            <h2 className="text-sm font-semibold text-foreground">About</h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Clinisight estimates the risk of six medication-related adverse events: acute
              kidney injury, hyperkalemia, QT prolongation, liver toxicity, bleeding, and
              hypoglycemia. It runs on a neural network trained on synthetic patient data, so
              treat the predictions and explanations as illustrative rather than clinical
              advice.
            </p>
            <p className="mt-3 text-sm font-medium text-foreground">
              {result?.disclaimer ?? "Not for clinical use. Prototype only."}
            </p>
          </div>
        </section>
      </main>
    </>
  );
}
