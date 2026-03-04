import { getStoredToken } from "./apiClient";

const ML_API_URL = (import.meta.env.VITE_ML_API_URL || "http://localhost:5001").replace(/\/$/, "");

const DEFAULT_FEATURE_KEYS = [
  "age",
  "gender",
  "diagnosis",
  "lengthOfStay",
  "priorAdmissions6mo",
  "charlsonIndex",
];

export async function generatePrediction(visitId, features = {}) {
  const token = getStoredToken();
  if (!token) {
    throw new Error("Missing session token.");
  }

  const reducedFeatures = DEFAULT_FEATURE_KEYS.reduce((accumulator, key) => {
    if (features[key] !== undefined) {
      accumulator[key] = features[key];
    }
    return accumulator;
  }, {});

  const response = await fetch(`${ML_API_URL}/api/v1/predict`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      visitId,
      features: {
        ...reducedFeatures,
      },
    }),
  });

  if (!response.ok) {
    const message = `Prediction failed with status ${response.status}`;
    throw new Error(message);
  }

  return response.json();
}
