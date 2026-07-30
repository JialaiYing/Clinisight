import type { ModelMetrics, PatientInput, PredictionResponse } from "@/lib/types";

// Loading the app from another device on the LAN (e.g. http://10.0.0.4:3000)
// means "127.0.0.1" in the browser refers to that device, not this machine.
// Fall back to whatever host the page was loaded from, keeping the backend's
// port, unless an explicit API URL is provided.
function resolveApiBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  if (typeof window !== "undefined") {
    const { hostname, protocol } = window.location;
    if (hostname !== "localhost" && hostname !== "127.0.0.1") {
      return `${protocol}//${hostname}:8000`;
    }
  }
  return "http://127.0.0.1:8000";
}

const API_BASE_URL = resolveApiBaseUrl();

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
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patient),
    });
  } catch {
    throw new ApiError(
      "Could not reach the prediction service. Confirm the backend is running at " +
        API_BASE_URL
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
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/metrics`);
  } catch {
    throw new ApiError(
      "Could not reach the prediction service. Confirm the backend is running at " +
        API_BASE_URL
    );
  }
  if (!response.ok) {
    throw new ApiError(`Could not load model metrics (${response.status})`);
  }
  return response.json();
}
