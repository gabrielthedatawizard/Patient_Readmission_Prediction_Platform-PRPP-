import { getStoredToken } from "./apiClient";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "");

export async function generatePrediction(visitId, features = {}) {
  const token = getStoredToken();
  if (!token) {
    throw new Error("Missing session token.");
  }

  const response = await fetch(`${API_BASE}/predictions/predict`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      patientId: visitId,
      visitId,
      features,
    }),
  });

  if (!response.ok) {
    const message = `Prediction failed with status ${response.status}`;
    throw new Error(message);
  }

  const payload = await response.json();
  const prediction = payload?.prediction || payload;
  return {
    ...prediction,
    tasks: payload?.tasks || [],
    escalationRequired: Boolean(payload?.escalationRequired),
  };
}
