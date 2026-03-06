import React, { useEffect, useState } from "react";
import { AlertCircle, Clock } from "lucide-react";
import Badge from "../common/Badge";

const PredictionHistory = ({ patientId }) => {
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadHistory = async () => {
      if (!patientId) {
        setPredictions([]);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const response = await fetch(`/api/predictions/history/${patientId}`, {
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error(`Failed to load history (${response.status})`);
        }

        const payload = await response.json();
        setPredictions(Array.isArray(payload?.predictions) ? payload.predictions : []);
      } catch (requestError) {
        setError(requestError?.message || "Unable to load prediction history.");
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, [patientId]);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Clock className="w-5 h-5" />
        Prediction History
      </h3>

      {loading && (
        <div className="space-y-2">
          {[0, 1, 2].map((index) => (
            <div key={index} className="h-16 rounded-lg bg-gray-100 animate-pulse" />
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && predictions.length === 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-600">
          No prior predictions recorded for this patient.
        </div>
      )}

      {!loading &&
        !error &&
        predictions.map((prediction) => (
          <div key={prediction.id} className="bg-neutral-50 rounded-lg p-4 border border-neutral-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-neutral-600">
                {prediction.generatedAt
                  ? new Date(prediction.generatedAt).toLocaleDateString("sw-TZ")
                  : "Unknown date"}
              </span>
              <Badge variant={String(prediction.tier).toLowerCase()}>
                {prediction.tier}
              </Badge>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-3xl font-bold text-neutral-900">{prediction.score}</div>
              <div className="flex-1">
                <div className="text-sm text-neutral-600 mb-1">
                  Model: {prediction.modelVersion} ({prediction.method === "rules" ? "Rule-Based" : "ML"})
                </div>
                <div className="text-sm text-neutral-600">
                  Confidence: {(Number(prediction.confidence || 0) * 100).toFixed(0)}%
                </div>
              </div>
            </div>

            {prediction.method === "rules" && (
              <div className="mt-2 text-xs text-amber-700 flex items-start gap-1">
                <AlertCircle className="w-3 h-3 mt-0.5" />
                ML service unavailable — rule-based fallback used
              </div>
            )}
          </div>
        ))}
    </div>
  );
};

export default PredictionHistory;
