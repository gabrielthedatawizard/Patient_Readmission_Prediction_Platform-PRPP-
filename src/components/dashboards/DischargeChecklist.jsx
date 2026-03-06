import { CheckCircle } from "lucide-react";

const DEFAULT_STEPS = [
  { id: "vitals", label: "Final vitals check" },
  { id: "meds", label: "Medication reconciliation" },
  { id: "education", label: "Patient education" },
  { id: "followup", label: "Follow-up scheduled" },
  { id: "transport", label: "Transport arranged" },
];

export const DischargeChecklist = ({ patient, onStepComplete }) => {
  const checklist = patient?.checklist || {};
  const steps = DEFAULT_STEPS.map((step) => ({
    ...step,
    status: checklist[step.id] || "pending",
  }));

  const completedCount = steps.filter((step) => step.status === "done").length;
  const progress = Math.round((completedCount / steps.length) * 100);

  return (
    <div className="mb-6 p-4 border border-neutral-200 rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-semibold text-neutral-900">{patient?.name || "Unknown Patient"}</h3>
          <p className="text-sm text-neutral-600">
            {patient?.id || "-"} • Ward: {patient?.ward || "-"}
          </p>
        </div>
        <div className="text-sm font-medium text-neutral-700">{completedCount} / {steps.length} complete</div>
      </div>

      <div className="w-full h-2 bg-neutral-200 rounded-full mb-4">
        <div className="h-full bg-green-600 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>

      <div className="space-y-2">
        {steps.map((step) => (
          <div key={step.id} className="flex items-center gap-3 p-2 rounded hover:bg-neutral-50">
            <button
              type="button"
              onClick={() => onStepComplete?.(patient, step.id)}
              disabled={step.status === "done"}
              className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                step.status === "done" ? "bg-green-600 border-green-600" : "border-neutral-300 hover:border-green-600"
              }`}
            >
              {step.status === "done" ? <CheckCircle className="w-4 h-4 text-white" /> : null}
            </button>
            <span className={`flex-1 text-sm ${step.status === "done" ? "text-neutral-500 line-through" : "text-neutral-900"}`}>
              {step.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DischargeChecklist;
