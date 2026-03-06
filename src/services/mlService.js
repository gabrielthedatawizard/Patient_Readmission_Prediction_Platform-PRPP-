const API_BASE = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "");

export async function generatePrediction(patientId, features = {}, options = {}) {
  const response = await fetch(`${API_BASE}/predictions/predict`, {
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
    const message = `Prediction failed with status ${response.status}`;
    throw new Error(message);
  }

  const payload = await response.json();
  const prediction = payload?.prediction || payload;
  return {
    ...prediction,
    tasks: payload?.tasks || [],
    automation: payload?.automation || null,
    escalationRequired: Boolean(payload?.escalationRequired),
  };
}

export async function extractDischargeSummary(patientId, notes, options = {}) {
  const response = await fetch(`${API_BASE}/predictions/discharge-summary/extract`, {
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
  });

  if (!response.ok) {
    const message = `Discharge summary extraction failed (${response.status})`;
    throw new Error(message);
  }

  const payload = await response.json();
  return payload?.extraction || null;
}
