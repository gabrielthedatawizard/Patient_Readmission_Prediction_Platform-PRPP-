import React from "react";
import Badge from "./Badge";

/**
 * RiskScoreDisplay Component
 * High-precision visual representation of readmission risk.
 * Optimized for clinical clarity and authority.
 */

const RiskScoreDisplay = ({
  score,
  tier,
  confidence,
  size = "md",
  showLabel = true,
  showBadge = true,
  showConfidence = false,
}) => {
  const normalizedTier =
    String(tier || "")
      .toLowerCase()
      .replace(/^\w/, (character) => character.toUpperCase()) || "Low";

  // Semantic variants mapping (Rose for high, Amber for med, Emerald for low)
  const variants = {
    Low: {
      text: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-950/20",
      border: "border-emerald-200 dark:border-emerald-800/50",
      accent: "bg-emerald-500",
      badge: "success"
    },
    Medium: {
      text: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-950/20",
      border: "border-amber-200 dark:border-amber-800/50",
      accent: "bg-amber-500",
      badge: "warning"
    },
    High: {
      text: "text-rose-600 dark:text-rose-400",
      bg: "bg-rose-50 dark:bg-rose-950/20",
      border: "border-rose-200 dark:border-rose-800/50",
      accent: "bg-rose-500",
      badge: "danger"
    },
  };

  const v = variants[normalizedTier] || variants.Low;
  const numericScore = Number(score || 0);
  const safeScore = Number.isFinite(numericScore) ? numericScore : 0;
  const hasConfidence = Number.isFinite(Number(confidence));
  const confidenceRatio = hasConfidence ? Number(confidence) : null;

  // Confidence window calculation for interval display
  const confidenceWindow = hasConfidence
    ? Math.max(4, Math.round((1 - confidenceRatio) * 20))
    : null;
  const lowerBound =
    confidenceWindow === null ? null : Math.max(1, safeScore - confidenceWindow);
  const upperBound =
    confidenceWindow === null ? null : Math.min(99, safeScore + confidenceWindow);

  // Size configurations
  const sizeMap = {
    sm: { container: "px-2 py-1", scoreText: "text-lg", labelText: "text-[10px]" },
    md: { container: "px-4 py-3", scoreText: "text-3xl", labelText: "text-xs" },
    lg: { container: "px-6 py-5", scoreText: "text-5xl", labelText: "text-sm" },
    xl: { container: "px-8 py-7", scoreText: "text-7xl", labelText: "text-base" },
  };

  const s = sizeMap[size] || sizeMap.md;

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className={[
          "relative overflow-hidden flex flex-col items-center justify-center rounded-2xl border transition-all",
          v.bg,
          v.border,
          s.container,
          "min-w-[120px] shadow-sm",
        ].join(" ")}
      >
        {/* Top accent bar for structural authority */}
        <div className={["absolute top-0 inset-x-0 h-1.5", v.accent].join(" ")} />

        <div className="flex flex-col items-center">
          <span className={["font-black tracking-tighter tabular-nums", v.text, s.scoreText].join(" ")}>
            {safeScore}
          </span>
          {showLabel && (
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500 dark:text-slate-400 mt-1">
              Risk Score
            </span>
          )}
        </div>

        {/* Confidence Interval Visualization */}
        {showConfidence && hasConfidence && lowerBound !== null && upperBound !== null && (
          <div className="mt-4 w-full px-2">
             <div className="flex justify-between text-[9px] font-bold text-neutral-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">
               <span>P5</span>
               <span>P95 interval</span>
               <span>P95</span>
             </div>
             <div className="relative h-1.5 bg-white/50 dark:bg-slate-800/50 rounded-full overflow-hidden">
                {/* Interval Bar */}
                <div 
                  className={["absolute h-full opacity-30", v.accent].join(" ")}
                  style={{ 
                    left: `${lowerBound}%`, 
                    width: `${upperBound - lowerBound}%` 
                  }}
                />
                {/* Main Score Dot */}
                <div 
                   className={["absolute top-0 bottom-0 w-1", v.accent].join(" ")}
                   style={{ left: `${safeScore}%` }}
                />
             </div>
             <p className="text-center text-[10px] font-semibold text-neutral-500 dark:text-slate-400 mt-2">
               {lowerBound}—{upperBound} ({ (confidenceRatio * 100).toFixed(0) }% Confidence)
             </p>
          </div>
        )}
      </div>

      {showBadge && (
        <Badge variant={v.badge} size={size === "sm" ? "sm" : "default"}>
          {normalizedTier} Priority
        </Badge>
      )}
    </div>
  );
};

export default RiskScoreDisplay;
