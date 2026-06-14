import React, { useMemo } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";

/**
 * ShapExplanation
 * Precision Clinical component for rendering ML feature attributions.
 * Separates factors that increase risk from factors that decrease risk.
 */
const ShapExplanation = ({ factors = [] }) => {
  const { escalationDrivers, stabilityWeights } = useMemo(() => {
    if (!factors || !factors.length) return { escalationDrivers: [], stabilityWeights: [] };
    
    // Sort by absolute attribution impact
    const sorted = [...factors].sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight));
    
    // Positive SHAP value = increases risk (Escalation)
    // Negative SHAP value = decreases risk (Stability)
    return {
      escalationDrivers: sorted.filter((f) => f.weight > 0).slice(0, 4),
      stabilityWeights: sorted.filter((f) => f.weight < 0).slice(0, 4),
    };
  }, [factors]);

  if (!factors.length) {
    return (
      <div className="p-6 text-center bg-slate-50 dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800">
        <p className="text-sm font-semibold text-slate-500">No ML attributions available.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 py-4">
      {/* Escalation Drivers (Increased Risk) */}
      <div className="space-y-6">
        <div className="flex items-center gap-2 mb-2">
          <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest">Escalation Drivers</p>
          <div className="h-[1px] flex-1 bg-rose-100 dark:bg-rose-900/30" />
        </div>
        <div className="space-y-5">
          {escalationDrivers.length ? (
            escalationDrivers.map((f, i) => (
              <div key={i} className="animate-in fade-in slide-in-from-bottom-2" style={{ animationDelay: `${i * 100}ms` }}>
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="text-slate-900 dark:text-slate-300 font-bold flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-rose-500" />
                    {f.factor}
                  </span>
                  <span className="text-rose-600 font-black tabular-nums">+{Math.round(f.weight * 100)}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-rose-500 rounded-full shadow-[0_0_8px_rgba(244,63,94,0.4)]"
                    style={{ width: `${Math.min(100, f.weight * 100)}%` }}
                  />
                </div>
              </div>
            ))
          ) : (
            <p className="text-xs font-medium text-slate-500 italic">No significant escalation drivers detected.</p>
          )}
        </div>
      </div>

      {/* Stability Weights (Decreased Risk) */}
      <div className="space-y-6">
        <div className="flex items-center gap-2 mb-2">
          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Stability Weights</p>
          <div className="h-[1px] flex-1 bg-emerald-100 dark:bg-emerald-900/30" />
        </div>
        <div className="space-y-5">
          {stabilityWeights.length ? (
            stabilityWeights.map((f, i) => (
              <div key={i} className="animate-in fade-in slide-in-from-bottom-2" style={{ animationDelay: `${i * 100}ms` }}>
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="text-slate-900 dark:text-slate-300 font-bold flex items-center gap-1.5">
                    <TrendingDown className="w-3.5 h-3.5 text-emerald-500" />
                    {f.factor}
                  </span>
                  <span className="text-emerald-600 font-black tabular-nums">{Math.round(f.weight * 100)}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.4)]"
                    style={{ width: `${Math.min(100, Math.abs(f.weight) * 100)}%` }}
                  />
                </div>
              </div>
            ))
          ) : (
            <p className="text-xs font-medium text-slate-500 italic">No significant stability weights detected.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShapExplanation;
