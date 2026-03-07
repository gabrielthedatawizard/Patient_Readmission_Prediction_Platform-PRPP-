import React from "react";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { useI18n } from "../../context/I18nProvider";

const QuickActions = ({ actions = [] }) => {
  const { language } = useI18n();

  return (
    <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-teal-700">
            {language === "sw" ? "Njia za haraka za kazi" : "Workflow shortcuts"}
          </p>
          <h2 className="mt-1 text-2xl font-bold text-slate-950">
            {language === "sw" ? "Hatua za haraka" : "Quick actions"}
          </h2>
        </div>
        <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800">
          {actions.length} {language === "sw" ? "hatua" : "actions"}
        </span>
      </div>

      <div className="space-y-3">
        {actions.map((action, index) => {
          const Icon = action.icon;
          return (
            <motion.button
              key={action.id || action.label}
              type="button"
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 340, damping: 24, delay: index * 0.03 }}
              onClick={action.onClick}
              className="group flex w-full items-center gap-4 rounded-[20px] border border-slate-200 bg-white px-4 py-4 text-left shadow-sm transition-all hover:border-slate-300 hover:shadow-md"
            >
              <div className={`h-12 w-12 shrink-0 rounded-2xl p-3 text-white shadow-sm ${action.colorClass || "bg-gradient-to-br from-teal-500 to-cyan-500"}`}>
                <Icon className="h-6 w-6" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-base font-semibold text-slate-950">
                    {action.label}
                  </p>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                    {action.tag || (language === "sw" ? "Hatua" : "Action")}
                  </span>
                </div>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  {action.description}
                </p>
              </div>

              <div className="ml-auto flex shrink-0 items-center gap-3">
                <span className="rounded-2xl bg-slate-100 px-3 py-2 text-base font-bold text-slate-900">
                  {action.metric || "--"}
                </span>
                <ChevronRight className="h-5 w-5 text-slate-400 transition-transform group-hover:translate-x-0.5" />
              </div>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
};

export default QuickActions;
