"use client";

import { useMemo, useState } from "react";
import { Check, Copy, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildHandoffSections, buildHandoffText } from "@/lib/handoff";
import type { PatientFormValues } from "@/lib/validation";
import type { PredictionResponse } from "@/lib/types";

function useHandoff(
  patient: PatientFormValues,
  result: PredictionResponse,
  generatedAt: Date
) {
  const handoffText = useMemo(
    () => buildHandoffText(patient, result, generatedAt),
    [patient, result, generatedAt]
  );
  const sections = useMemo(
    () => buildHandoffSections(patient, result, generatedAt),
    [patient, result, generatedAt]
  );
  return { handoffText, ...sections };
}

export function HandoffActions({
  patient,
  result,
  generatedAt,
}: {
  patient: PatientFormValues;
  result: PredictionResponse;
  generatedAt: Date;
}) {
  const { handoffText } = useHandoff(patient, result, generatedAt);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);

  const handleCopy = async () => {
    setCopyError(null);
    try {
      await navigator.clipboard.writeText(handoffText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyError("Could not copy. Try Print / PDF instead.");
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        {copied ? "Copied" : "Copy handoff"}
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={() => window.print()}>
        <Printer className="size-3.5" />
        Print / PDF
      </Button>
      {copyError && <span className="text-xs text-destructive">{copyError}</span>}
    </div>
  );
}

/** Must sit outside any `print:hidden` ancestor so browser print can show it. */
export function HandoffPrintDocument({
  patient,
  result,
  generatedAt,
}: {
  patient: PatientFormValues;
  result: PredictionResponse;
  generatedAt: Date;
}) {
  const { subtitle, sections } = useHandoff(patient, result, generatedAt);

  return (
    <article id="clinician-handoff" className="hidden print:block" aria-hidden="true">
      <header className="mb-4 border-b border-black pb-3">
        <p className="text-xs tracking-wide uppercase">Clinisight</p>
        <h1 className="mt-1 text-xl font-semibold">Clinician handoff note</h1>
        <p className="mt-1 text-sm">{subtitle}</p>
        <p className="mt-1 text-xs">Care-team use only. Not a patient education document.</p>
      </header>
      {sections.map((section) => (
        <section key={section.title} className="mb-4 break-inside-avoid">
          <h2 className="text-sm font-semibold uppercase tracking-wide">{section.title}</h2>
          <ul className="mt-2 space-y-1 text-sm leading-relaxed">
            {section.lines.map((line, index) => (
              <li key={`${section.title}-${index}`}>{line}</li>
            ))}
          </ul>
        </section>
      ))}
    </article>
  );
}
