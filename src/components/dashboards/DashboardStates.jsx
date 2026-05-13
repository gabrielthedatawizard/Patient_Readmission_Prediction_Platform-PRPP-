import { AlertCircle, RefreshCw, InboxIcon, WifiOff } from "lucide-react";
import { motion } from "framer-motion";
import Button from "../common/Button";

// Tip 3: Premium shimmer skeleton — the #1 signal of a high-quality dashboard.
// Shimmer (gradient pass) feels intentional and premium vs. plain pulse.
const ShimmerBlock = ({ className = "" }) => (
  <div
    className={`relative overflow-hidden rounded-xl bg-neutral-100 dark:bg-slate-800 ${className}`}
  >
    <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.4s_infinite] bg-gradient-to-r from-transparent via-white/60 dark:via-slate-700/60 to-transparent" />
  </div>
);

export const DashboardSkeleton = ({ cards = 4 }) => {
  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Title shimmer */}
      <div className="space-y-2">
        <ShimmerBlock className="h-7 w-56" />
        <ShimmerBlock className="h-4 w-80" />
      </div>

      {/* KPI grid shimmer */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: cards }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 pl-7 relative overflow-hidden"
          >
            <span className="absolute inset-y-0 left-0 w-1 rounded-l-xl bg-neutral-200 dark:bg-slate-800" />
            <div className="flex justify-between gap-3 mb-4">
              <ShimmerBlock className="h-3 w-24" />
              <ShimmerBlock className="h-10 w-10 rounded-lg" />
            </div>
            <ShimmerBlock className="h-8 w-16 mb-2" />
            <ShimmerBlock className="h-3 w-32" />
          </div>
        ))}
      </div>

      {/* Section shimmer */}
      <div className="rounded-xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        <div className="border-b border-neutral-100 dark:border-slate-800 px-5 py-4">
          <ShimmerBlock className="h-4 w-40" />
        </div>
        <div className="p-5 space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <ShimmerBlock key={i} className="h-14" />
          ))}
        </div>
      </div>
    </div>
  );
};

// Tip 5: Icon-led error state — never leave users staring at a dead page.
// Good dashboards tell you WHAT failed and give you a PATH OUT.
export const ErrorState = ({ error, onRetry }) => {
  const isNetworkError =
    typeof error === "string" && /network|fetch|offline|connect/i.test(error);

  const ErrorIcon = isNetworkError ? WifiOff : AlertCircle;

  return (
    <div className="p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md mx-auto rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 p-8 text-center"
      >
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/50">
          <ErrorIcon className="w-6 h-6 text-red-600 dark:text-red-400" />
        </div>
        <h2 className="text-base font-semibold text-red-900 dark:text-red-200 mb-1">
          {isNetworkError ? "Connection lost" : "Unable to load dashboard"}
        </h2>
        <p className="text-sm text-red-700 dark:text-red-400 mb-5">
          {error || "Something went wrong. Please try again."}
        </p>
        {onRetry && (
          <Button
            variant="danger"
            onClick={onRetry}
            icon={<RefreshCw className="w-4 h-4" />}
          >
            Retry
          </Button>
        )}
      </motion.div>
    </div>
  );
};

// Tip 5: Meaningful empty state — tells users WHY it's empty and what to do.
export const EmptyState = ({ message, icon: Icon = InboxIcon, action = null }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center py-12 px-4 text-center"
    >
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 dark:bg-slate-800">
        <Icon className="w-6 h-6 text-neutral-400 dark:text-slate-500" />
      </div>
      <p className="text-sm font-medium text-neutral-600 dark:text-slate-400 max-w-xs">
        {message || "No data available."}
      </p>
      {action && <div className="mt-4">{action}</div>}
    </motion.div>
  );
};

export default DashboardSkeleton;
