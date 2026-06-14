import { buildApiUrl } from "./runtimeConfig";
import { predictOffline } from "./OfflinePredictor";

export async function generatePrediction(patientId, features = {}, options = {}) {
  try {
    const response = await fetch(buildApiUrl("/predictions/predict"), {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        patientId,
        visitId: options.visitId || undefined,
        features,
      }),
    });

    if (!response.ok) {
      throw new Error(`Prediction failed with status ${response.status}`);
    }

    const payload = await response.json();
    const prediction = payload?.prediction || payload;
    return {
      ...prediction,
      tasks: payload?.tasks || [],
      automation: payload?.automation || null,
      escalationRequired: Boolean(payload?.escalationRequired),
      isOfflineFallback: false,
    };
  } catch (err) {
    // Graceful fallback to Edge AI Surrogate when backend is unreachable
    console.warn("API Prediction failed, falling back to pure-JS Edge Predictor:", err.message);
    
    // Attempt offline evaluation using the provided features
    const offlinePrediction = predictOffline(features);
    
    return {
      ...offlinePrediction,
      tasks: [], // We can't generate tasks offline without the backend workflow engine
      automation: null,
      escalationRequired: offlinePrediction.tier === "VeryHigh" || offlinePrediction.tier === "High",
      isOfflineFallback: true,
      patientId,
    };
  }
}

export async function extractDischargeSummary(patientId, notes, options = {}) {
  const response = await fetch(
    buildApiUrl("/predictions/discharge-summary/extract"),
    {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        patientId,
        notes,
        workflow: options.workflow || {},
        prediction: options.prediction || null,
      }),
    },
  );

  if (!response.ok) {
    const message = `Discharge summary extraction failed (${response.status})`;
    throw new Error(message);
  }

  const payload = await response.json();
  return payload?.extraction || null;
}
