import React from "react";
import { motion } from "framer-motion";

function formatTimeAgo(timestamp) {
  const inputDate = new Date(timestamp || Date.now());
  if (Number.isNaN(inputDate.getTime())) {
    return "Moments ago";
  }

  const seconds = Math.max(0, Math.round((Date.now() - inputDate.getTime()) / 1000));
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hr ago`;
  return `${Math.floor(seconds / 86400)} day${seconds >= 172800 ? "s" : ""} ago`;
}

const RecentActivity = ({ activities = [] }) => {
  return (
    <section className="rounded-[28px] border border-white/60 bg-white/90 p-4 shadow-trip backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/75 sm:p-6">
      <div className="mb-5 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-700 dark:text-sky-300">
            Live workflow feed
          </p>
          <h2 className="mt-1 text-xl font-bold text-slate-950 dark:text-slate-100">
            Recent activity
          </h2>
        </div>
        <span className="rounded-full bg-slate-900/5 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-white/5 dark:text-slate-300">
          {activities.length} items
        </span>
      </div>

      <div className="space-y-3">
        {activities.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
            No recent activity has been captured yet.
          </div>
        )}

        {activities.map((activity, index) => {
          const Icon = activity.icon;
          return (
            <motion.div
              key={`${activity.type}-${activity.title}-${index}`}
              initial={{ opacity: 0, x: -18 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="relative flex items-start gap-3 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/80"
            >
              {index !== activities.length - 1 && (
                <span className="absolute left-[1.62rem] top-12 h-[calc(100%+0.75rem)] w-px bg-slate-200 dark:bg-slate-800" />
              )}
              <div className={`mt-0.5 rounded-2xl p-3 ${activity.surfaceClass || "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {activity.tagLabel && (
                      <span className="rounded-full bg-slate-900/5 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:bg-white/5 dark:text-slate-300">
                        {activity.tagLabel}
                      </span>
                    )}
                    <p className="text-sm font-semibold text-slate-950 dark:text-slate-100">
                      {activity.title}
                    </p>
                  </div>
                  <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
                    {formatTimeAgo(activity.timestamp)}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  {activity.description}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
};

export default RecentActivity;
