import type { ModelMetrics, PatientInput, PredictionResponse } from "@/lib/types";

function isLanHostname(hostname: string): boolean {
  if (/^10\.\d+\.\d+\.\d+$/.test(hostname)) return true;
  if (/^192\.168\.\d+\.\d+$/.test(hostname)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/.test(hostname)) return true;
  return false;
}

// Prefer NEXT_PUBLIC_API_URL. On a phone/laptop hitting the dev machine over
// LAN, reuse that host on port 8000. Never invent host:8000 for public deploys
// like Vercel; those need the env var.
function resolveApiBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  if (typeof window !== "undefined") {
    const { hostname, protocol } = window.location;
    if (isLanHostname(hostname)) {
      return `${protocol}//${hostname}:8000`;
    }
  }
  return "http://127.0.0.1:8000";
}

export class ApiError extends Error {}

function formatApiDetail(detail: unknown, status: number): string {
  if (!detail || typeof detail !== "object") {
    return `Prediction failed (${status})`;
  }
  const payload = detail as { detail?: unknown };
  if (typeof payload.detail === "string") return payload.detail;
  if (Array.isArray(payload.detail) && payload.detail.length > 0) {
    const first = payload.detail[0] as { msg?: string; loc?: unknown[] };
    if (typeof first?.msg === "string") {
      const field =
        Array.isArray(first.loc) && first.loc.length > 0
          ? String(first.loc[first.loc.length - 1])
          : null;
      return field ? `${field}: ${first.msg}` : first.msg;
    }
  }
  return `Prediction failed (${status})`;
}

async function postPrediction(
  path: "/predict" | "/simulate",
  patient: PatientInput
): Promise<PredictionResponse> {
  const base = resolveApiBaseUrl();
  let response: Response;
  try {
    response = await fetch(`${base}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patient),
    });
  } catch {
    throw new ApiError(
      "Could not reach the prediction service. Confirm the backend is running at " +
        base
    );
  }

  if (!response.ok) {
    const detail = await response.json().catch(() => null);
    throw new ApiError(formatApiDetail(detail, response.status));
  }

  return response.json();
}

export function predictPatient(patient: PatientInput): Promise<PredictionResponse> {
  return postPrediction("/predict", patient);
}

export function simulatePatient(patient: PatientInput): Promise<PredictionResponse> {
  return postPrediction("/simulate", patient);
}

export async function fetchModelMetrics(): Promise<ModelMetrics> {
  const base = resolveApiBaseUrl();
  let response: Response;
  try {
    response = await fetch(`${base}/metrics`);
  } catch {
    throw new ApiError(
      "Could not reach the prediction service. Confirm the backend is running at " +
        base
    );
  }
  if (!response.ok) {
    throw new ApiError(`Could not load model metrics (${response.status})`);
  }
  return response.json();
}
