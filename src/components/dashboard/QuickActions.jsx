import React from "react";
import { motion } from "framer-motion";

const QuickActions = ({ actions = [] }) => {
  return (
    <section className="rounded-[28px] border border-white/60 bg-white/90 p-4 shadow-trip backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/75 sm:p-6">
      <div className="mb-5 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-700 dark:text-teal-300">
            Workflow shortcuts
          </p>
          <h2 className="mt-1 text-xl font-bold text-slate-950 dark:text-slate-100">
            Quick actions
          </h2>
        </div>
        <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700 dark:bg-teal-950/40 dark:text-teal-300">
          {actions.length} actions
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {actions.map((action, index) => {
          const Icon = action.icon;
          return (
            <motion.button
              key={action.id || action.label}
              type="button"
              whileHover={{ y: -4, scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 340, damping: 24, delay: index * 0.03 }}
              onClick={action.onClick}
              className="group relative overflow-hidden rounded-[24px] border border-slate-200 bg-white p-4 text-left shadow-sm transition-all hover:shadow-lg dark:border-slate-800 dark:bg-slate-900"
            >
              <div className={`absolute inset-x-0 top-0 h-1 ${action.accentClass || "bg-teal-500"}`} />
              <div className="absolute right-4 top-4 rounded-full bg-slate-900/5 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:bg-white/5 dark:text-slate-300">
                {action.tag || "Action"}
              </div>
              <div className="absolute -right-8 -top-10 h-24 w-24 rounded-full bg-slate-100/70 blur-2xl transition-transform duration-500 group-hover:scale-125 dark:bg-slate-800/70" />
              <div className={`relative inline-flex rounded-2xl p-3 text-white shadow-md ${action.colorClass || "bg-gradient-to-br from-teal-500 to-cyan-500"}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="relative mt-4 flex items-end justify-between gap-3">
                <p className="text-sm font-semibold text-slate-950 dark:text-slate-100">
                  {action.label}
                </p>
                <span className="text-2xl font-bold tracking-tight text-slate-950 dark:text-slate-100">
                  {action.metric || ""}
                </span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                {action.description}
              </p>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
};

export default QuickActions;
