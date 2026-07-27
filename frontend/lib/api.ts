import type { PatientInput, PredictionResponse } from "@/lib/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

export class ApiError extends Error {}

export async function predictPatient(patient: PatientInput): Promise<PredictionResponse> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/predict`, {
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
    throw new ApiError(
      typeof detail?.detail === "string" ? detail.detail : `Prediction failed (${response.status})`
    );
  }

  return response.json();
}
