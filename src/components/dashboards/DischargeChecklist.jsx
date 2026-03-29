import { CheckCircle } from "lucide-react";

const DEFAULT_STEPS = [
  { id: "vitals", label: "Final vitals check" },
  { id: "meds", label: "Medication reconciliation" },
  { id: "education", label: "Patient education" },
  { id: "followup", label: "Follow-up scheduled" },
  { id: "transport", label: "Transport arranged" },
];

export const DischargeChecklist = ({
  patient,
  onStepComplete,
  interactive = typeof onStepComplete === "function",
  readOnlyMessage = "",
}) => {
  const checklist = patient?.checklist || {};
  const steps = DEFAULT_STEPS.map((step) => ({
    ...step,
    status: checklist[step.id] || "pending",
  }));

  const completedCount = steps.filter((step) => step.status === "done").length;
  const progress = Math.round((completedCount / steps.length) * 100);

  return (
    <div className="mb-6 rounded-lg border border-neutral-200 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-neutral-900">{patient?.name || "Unknown Patient"}</h3>
          <p className="text-sm text-neutral-600">
            {patient?.id || "-"} | Ward: {patient?.ward || "-"}
          </p>
        </div>
        <div className="text-sm font-medium text-neutral-700">
          {completedCount} / {steps.length} complete
        </div>
      </div>

      <div className="mb-4 h-2 w-full rounded-full bg-neutral-200">
        <div
          className="h-full rounded-full bg-green-600 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {!interactive && readOnlyMessage ? (
        <div className="mb-4 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-800">
          {readOnlyMessage}
        </div>
      ) : null}

      <div className="space-y-2">
        {steps.map((step) => (
          <div key={step.id} className="flex items-center gap-3 rounded p-2 hover:bg-neutral-50">
            {interactive ? (
              <button
                type="button"
                onClick={() => onStepComplete?.(patient, step.id)}
                disabled={step.status === "done"}
                className={`flex h-5 w-5 items-center justify-center rounded border-2 transition-colors ${
                  step.status === "done"
                    ? "border-green-600 bg-green-600"
                    : "border-neutral-300 hover:border-green-600"
                }`}
              >
                {step.status === "done" ? <CheckCircle className="h-4 w-4 text-white" /> : null}
              </button>
            ) : (
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                  step.status === "done"
                    ? "border-green-600 bg-green-600"
                    : "border-neutral-300 bg-white"
                }`}
              >
                {step.status === "done" ? <CheckCircle className="h-4 w-4 text-white" /> : null}
              </span>
            )}
            <span
              className={`flex-1 text-sm ${
                step.status === "done" ? "text-neutral-500 line-through" : "text-neutral-900"
              }`}
            >
              {step.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DischargeChecklist;
