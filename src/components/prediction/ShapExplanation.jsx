import React from "react";
import { AlertCircle, TrendingDown, TrendingUp } from "lucide-react";

const ShapExplanation = ({ factors = [] }) => {
  if (!factors.length) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
        <AlertCircle className="w-4 h-4" />
        Top Risk Factors (SHAP values)
      </div>

      {factors.map((factor, index) => {
        const isIncreasing = Number(factor.weight) > 0;
        const percentage = Math.min(Math.abs(Number(factor.weight) * 100), 100);

        return (
          <div
            key={`${factor.factor}-${index}`}
            className="bg-gray-50 rounded-lg p-3 animate-fade-in"
            style={{ animationDelay: `${index * 70}ms` }}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-start gap-2">
                {isIncreasing ? (
                  <TrendingUp className="w-4 h-4 text-red-500 mt-0.5" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-emerald-500 mt-0.5" />
                )}
                <span className="text-sm font-medium">{factor.factor}</span>
              </div>
              <span
                className={`text-sm font-semibold ${isIncreasing ? "text-red-600" : "text-emerald-600"}`}
              >
                {isIncreasing ? "+" : ""}
                {percentage.toFixed(1)}%
              </span>
            </div>

            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full ${isIncreasing ? "bg-gradient-to-r from-red-400 to-red-600" : "bg-gradient-to-r from-emerald-400 to-emerald-600"}`}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        );
      })}

      <p className="text-xs text-gray-500 italic mt-4">
        SHAP values show each factor contribution to predicted readmission risk.
      </p>
    </div>
  );
};

export default ShapExplanation;
