import { motion } from "framer-motion";
import { AlertTriangle, Info, Sparkles, ChevronRight } from "lucide-react";

// World-class principle: every recommendation card must have
// Label → Value → Context → Action  (Palantir Foundry pattern)
// Priority drives: icon, left accent bar, and text color — never just bg color alone.

const PRIORITY_MAP = {
  high: {
    bar: "bg-rose-500",
    icon: AlertTriangle,
    iconClass: "text-rose-600 dark:text-rose-400",
    container: "border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900",
    label: "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300",
    title: "text-neutral-900 dark:text-slate-100",
    message: "text-neutral-600 dark:text-slate-400",
  },
  medium: {
    bar: "bg-amber-500",
    icon: Info,
    iconClass: "text-amber-600 dark:text-amber-400",
    container: "border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900",
    label: "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
    title: "text-neutral-900 dark:text-slate-100",
    message: "text-neutral-600 dark:text-slate-400",
  },
  low: {
    bar: "bg-emerald-500",
    icon: Sparkles,
    iconClass: "text-emerald-600 dark:text-emerald-400",
    container: "border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900",
    label: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
    title: "text-neutral-900 dark:text-slate-100",
    message: "text-neutral-600 dark:text-slate-400",
  },
};

export const PolicyRecommendation = ({ title, message, action, priority = "medium", onAction }) => {
  const p = PRIORITY_MAP[String(priority).toLowerCase()] ?? PRIORITY_MAP.medium;
  const PriorityIcon = p.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className={[
        "relative overflow-hidden rounded-xl border pl-6",
        "shadow-sm",
        p.container,
      ].join(" ")}
    >
      {/* Left semantic accent bar */}
      <span className={`absolute inset-y-0 left-0 w-1.5 ${p.bar}`} />

      <div className="p-4">
        {/* Header row: icon + title + priority badge */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-start gap-2.5 min-w-0">
            <PriorityIcon className={`w-4 h-4 mt-0.5 shrink-0 ${p.iconClass}`} />
            <p className={`text-sm font-semibold leading-snug ${p.title}`}>
              {title || "Recommendation"}
            </p>
          </div>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${p.label}`}
          >
            {priority}
          </span>
        </div>

        {/* Message body */}
        <p className={`text-sm leading-relaxed mb-3 pl-6 ${p.message}`}>
          {message || "No details provided."}
        </p>

        {/* Action pill — not plain text, but a visual affordance */}
        {action && (
          <button
            onClick={onAction}
            className={[
              "inline-flex items-center gap-1.5 pl-6",
              "text-xs font-semibold",
              p.iconClass,
              "hover:underline transition-colors",
            ].join(" ")}
          >
            <ChevronRight className="w-3.5 h-3.5" />
            {action}
          </button>
        )}
      </div>
    </motion.div>
  );
};

export default PolicyRecommendation;
