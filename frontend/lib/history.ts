import type { PatientFormValues } from "@/lib/validation";
import type { PredictionResponse } from "@/lib/types";

export interface HistoryEntry {
  id: string;
  createdAt: string;
  patient: PatientFormValues;
  result: PredictionResponse;
}

export interface TrashEntry extends HistoryEntry {
  deletedAt: string;
}

const HISTORY_KEY = "clinisight.history";
const TRASH_KEY = "clinisight.trash";
const MAX_ENTRIES = 20;

export const TRASH_RETENTION_DAYS = 7;
const TRASH_RETENTION_MS = TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000;

function readHistory(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    const valid = (parsed as HistoryEntry[]).filter(isCompatibleHistoryEntry);
    // Drop legacy entries that don't match the current patient schema.
    if (valid.length !== parsed.length) {
      writeHistory(valid);
    }
    return valid;
  } catch {
    return [];
  }
}

function isCompatibleHistoryEntry(entry: unknown): entry is HistoryEntry {
  if (!entry || typeof entry !== "object") return false;
  const e = entry as Partial<HistoryEntry>;
  const patient = e.patient as Partial<PatientFormValues> | undefined;
  if (!patient || typeof patient !== "object") return false;
  if (!Array.isArray(patient.medications)) return false;
  if (typeof patient.num_concurrent_meds !== "number") return false;
  if (typeof patient.age !== "number" || !patient.sex) return false;
  if (!e.result || typeof e.result !== "object") return false;
  if (!e.result.risks || typeof e.result.risks !== "object") return false;
  return typeof e.id === "string" && typeof e.createdAt === "string";
}

function writeHistory(entries: HistoryEntry[]): void {
  try {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(entries));
  } catch {
    // Quota exceeded or private browsing; keep working for this tab only.
  }
}

function readTrash(): TrashEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(TRASH_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return (parsed as TrashEntry[]).filter(
      (entry) =>
        isCompatibleHistoryEntry(entry) && typeof entry.deletedAt === "string"
    );
  } catch {
    return [];
  }
}

function writeTrash(entries: TrashEntry[]): void {
  try {
    window.localStorage.setItem(TRASH_KEY, JSON.stringify(entries));
  } catch {
    // Quota exceeded or private browsing; keep working for this tab only.
  }
}

/** Remove trash older than the retention window. */
function purgeExpiredTrash(entries: TrashEntry[]): TrashEntry[] {
  const cutoff = Date.now() - TRASH_RETENTION_MS;
  return entries.filter((entry) => new Date(entry.deletedAt).getTime() > cutoff);
}

interface HistoryAndTrash {
  history: HistoryEntry[];
  trash: TrashEntry[];
}

export function loadHistory(): HistoryEntry[] {
  return readHistory();
}

export function loadTrash(): TrashEntry[] {
  const purged = purgeExpiredTrash(readTrash());
  writeTrash(purged);
  return purged;
}

export function addHistoryEntry(
  patient: PatientFormValues,
  result: PredictionResponse
): HistoryEntry[] {
  const entry: HistoryEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    patient,
    result,
  };
  const next = [entry, ...readHistory()].slice(0, MAX_ENTRIES);
  writeHistory(next);
  return next;
}

/** Soft-delete one history entry into trash. */
export function deleteHistoryEntry(id: string): HistoryAndTrash {
  const history = readHistory();
  const target = history.find((entry) => entry.id === id);
  const nextHistory = history.filter((entry) => entry.id !== id);
  writeHistory(nextHistory);

  const nextTrash = purgeExpiredTrash(readTrash());
  if (target) {
    nextTrash.unshift({ ...target, deletedAt: new Date().toISOString() });
  }
  writeTrash(nextTrash);

  return { history: nextHistory, trash: nextTrash };
}

/** Soft-delete the whole history into trash. */
export function clearHistory(): HistoryAndTrash {
  const history = readHistory();
  const deletedAt = new Date().toISOString();
  const nextTrash = [
    ...history.map((entry) => ({ ...entry, deletedAt })),
    ...purgeExpiredTrash(readTrash()),
  ];
  writeHistory([]);
  writeTrash(nextTrash);
  return { history: [], trash: nextTrash };
}

/** Move one trash entry back into history. */
export function restoreTrashEntry(id: string): HistoryAndTrash {
  const trash = purgeExpiredTrash(readTrash());
  const target = trash.find((entry) => entry.id === id);
  const nextTrash = trash.filter((entry) => entry.id !== id);
  writeTrash(nextTrash);

  let nextHistory = readHistory();
  if (target) {
    const restored: HistoryEntry = {
      id: target.id,
      createdAt: target.createdAt,
      patient: target.patient,
      result: target.result,
    };
    nextHistory = [restored, ...nextHistory].slice(0, MAX_ENTRIES);
  }
  writeHistory(nextHistory);

  return { history: nextHistory, trash: nextTrash };
}

/** Hard-delete one trash entry (skips the retention window). */
export function permanentlyDeleteTrashEntry(id: string): TrashEntry[] {
  const nextTrash = purgeExpiredTrash(readTrash()).filter((entry) => entry.id !== id);
  writeTrash(nextTrash);
  return nextTrash;
}
