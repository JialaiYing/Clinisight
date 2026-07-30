"use client";

import { DEMO_PERSONAS, type DemoPersona } from "@/lib/personas";
import { cn } from "@/lib/utils";

export function DemoPersonas({
  activePersonaId,
  onSelect,
}: {
  activePersonaId: string | null;
  onSelect: (persona: DemoPersona) => void;
}) {
  return (
    <div className="mb-10">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold tracking-tight text-foreground">
          Demo cases
        </h2>
        <p className="text-sm text-muted-foreground">
          Load a patient, then Predict — use what-if to try a safer regimen.
        </p>
      </div>
      <ul className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        {DEMO_PERSONAS.map((persona) => {
          const active = persona.id === activePersonaId;
          return (
            <li key={persona.id}>
              <button
                type="button"
                aria-pressed={active}
                onClick={() => onSelect(persona)}
                className={cn(
                  "h-full w-full border px-4 py-3 text-left transition-colors",
                  active
                    ? "border-foreground bg-muted/60"
                    : "border-border hover:border-foreground/40 hover:bg-muted/30"
                )}
              >
                <div className="text-xs text-muted-foreground">{persona.setting}</div>
                <div className="mt-1 text-sm font-semibold text-foreground">
                  {persona.name}
                </div>
                <div className="mt-0.5 font-mono text-xs text-muted-foreground">
                  {persona.tagline}
                </div>
                <p className="mt-2 text-sm leading-snug text-muted-foreground">
                  {persona.blurb}
                </p>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
