import { Sparkles } from "lucide-react";

function priorityClass(priority) {
  const normalized = String(priority || "medium").toLowerCase();
  if (normalized === "high") {
    return "border-red-200 bg-red-50 text-red-800";
  }
  if (normalized === "low") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }
  return "border-amber-200 bg-amber-50 text-amber-800";
}

export const PolicyRecommendation = ({ title, message, action, priority = "medium" }) => {
  return (
    <div className={`p-4 rounded-lg border ${priorityClass(priority)}`}>
      <p className="font-semibold flex items-center gap-2 mb-1">
        <Sparkles className="w-4 h-4" />
        {title || "Recommendation"}
      </p>
      <p className="text-sm mb-2">{message || "No recommendation details provided."}</p>
      {action ? <p className="text-xs font-medium">Action: {action}</p> : null}
    </div>
  );
};

export default PolicyRecommendation;
