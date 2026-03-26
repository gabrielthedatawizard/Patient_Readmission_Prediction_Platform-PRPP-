import React, { useState } from "react";
import { AlertCircle, Clock } from "lucide-react";
import Badge from "../common/Badge";
import Button from "../common/Button";
import {
  useOverridePredictionMutation,
  usePredictionHistoryQuery,
} from "../../hooks/useTrip";

const TIERS = ["Low", "Medium", "High"];

const PredictionHistory = ({
  patientId,
  canOverride = false,
  onPredictionOverridden,
}) => {
  const [activeOverrideId, setActiveOverrideId] = useState(null);
  const [overrideTier, setOverrideTier] = useState("Medium");
  const [overrideReason, setOverrideReason] = useState("");
  const [overrideError, setOverrideError] = useState("");
  const [overrideSuccess, setOverrideSuccess] = useState("");
  const historyQuery = usePredictionHistoryQuery(patientId);
  const overrideMutation = useOverridePredictionMutation();
  const predictions = historyQuery.data || [];
  const loading = historyQuery.isLoading;
  const error = historyQuery.error?.message || "";
  const submittingOverrideId = overrideMutation.variables?.predictionId || null;

  const openOverrideForm = (prediction) => {
    setActiveOverrideId(prediction.id);
    setOverrideTier(prediction.tier || "Medium");
    setOverrideReason("");
    setOverrideError("");
    setOverrideSuccess("");
  };

  const closeOverrideForm = () => {
    setActiveOverrideId(null);
    setOverrideReason("");
    setOverrideError("");
  };

  const submitOverride = async (prediction) => {
    const reason = overrideReason.trim();
    if (reason.length < 10) {
      setOverrideError("Reason must be at least 10 characters.");
      return;
    }

    if (!TIERS.includes(overrideTier)) {
      setOverrideError("Select a valid target tier.");
      return;
    }

    setOverrideError("");
    setOverrideSuccess("");

    try {
      const updated = await overrideMutation.mutateAsync({
        predictionId: prediction.id,
        payload: {
          newTier: overrideTier,
          reason,
        },
      });
      setOverrideSuccess("Risk tier override saved.");
      setActiveOverrideId(null);
      if (updated && typeof onPredictionOverridden === "function") {
        onPredictionOverridden(updated);
      }
    } catch (requestError) {
      setOverrideError(
        requestError?.message || "Unable to save prediction override.",
      );
    }
  };

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

      {!loading && !error && overrideSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm text-emerald-700">
          {overrideSuccess}
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

            {prediction.override && (
              <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800 space-y-1">
                <p className="font-semibold">Clinician Override</p>
                <p>
                  Tier: {prediction.override.previousTier} to{" "}
                  {prediction.override.newTier}
                </p>
                <p>Reason: {prediction.override.reason}</p>
                {prediction.override.overriddenAt && (
                  <p>
                    At: {new Date(prediction.override.overriddenAt).toLocaleString("sw-TZ")}
                  </p>
                )}
              </div>
            )}

            {prediction.method === "rules" && (
              <div className="mt-2 text-xs text-amber-700 flex items-start gap-1">
                <AlertCircle className="w-3 h-3 mt-0.5" />
                ML service unavailable - rule-based fallback used
              </div>
            )}

            {canOverride && (
              <div className="mt-4 space-y-3">
                {activeOverrideId === prediction.id ? (
                  <div className="rounded-lg border border-gray-200 bg-white p-3 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <label className="text-xs text-gray-600 space-y-1">
                        <span className="block font-semibold">Target Tier</span>
                        <select
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                          value={overrideTier}
                          onChange={(event) => setOverrideTier(event.target.value)}
                        >
                          {TIERS.map((tier) => (
                            <option key={tier} value={tier}>
                              {tier}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <label className="text-xs text-gray-600 space-y-1">
                      <span className="block font-semibold">Clinical Reason</span>
                      <textarea
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm min-h-[96px]"
                        value={overrideReason}
                        onChange={(event) => setOverrideReason(event.target.value)}
                        placeholder="Document rationale for override (minimum 10 characters)."
                      />
                    </label>

                    {overrideError && (
                      <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-md p-2">
                        {overrideError}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={closeOverrideForm}
                        disabled={submittingOverrideId === prediction.id}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="warning"
                        size="sm"
                        loading={submittingOverrideId === prediction.id}
                        onClick={() => submitOverride(prediction)}
                      >
                        Save Override
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openOverrideForm(prediction)}
                  >
                    Override Tier
                  </Button>
                )}
              </div>
            )}
          </div>
        ))}
    </div>
  );
};

export default PredictionHistory;
