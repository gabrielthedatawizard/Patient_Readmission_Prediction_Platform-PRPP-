import React from "react";
import { motion } from "framer-motion";
import { useI18n } from "../../context/I18nProvider";

function formatTimeAgo(timestamp, t) {
  const inputDate = new Date(timestamp || Date.now());
  if (Number.isNaN(inputDate.getTime())) {
    return t("momentsAgo");
  }

  const seconds = Math.max(0, Math.round((Date.now() - inputDate.getTime()) / 1000));
  if (seconds < 60) return t("justNow");
  if (seconds < 3600) return `${Math.floor(seconds / 60)} ${t("minAgo")}`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} ${t("hrAgo")}`;

  const days = Math.floor(seconds / 86400);
  return `${days} ${days > 1 ? t("daysAgo") : t("dayAgo")}`;
}

const RecentActivity = ({ activities = [] }) => {
  const { language, t } = useI18n();

  return (
    <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-700">
            {language === "sw" ? "Mtiririko wa kazi mubashara" : "Live workflow feed"}
          </p>
          <h2 className="mt-1 text-2xl font-bold text-slate-950">
            {language === "sw" ? "Shughuli za karibuni" : "Recent activity"}
          </h2>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
          {activities.length} {language === "sw" ? "vipengele" : "items"}
        </span>
      </div>

      <div className="space-y-3">
        {activities.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
            {language === "sw"
              ? "Hakuna shughuli za karibuni zilizorekodiwa bado."
              : "No recent activity has been captured yet."}
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
              className={`flex items-start gap-4 rounded-2xl border p-4 shadow-sm ${activity.containerClass || "border-slate-200 bg-white"}`}
            >
              <div className={`mt-0.5 rounded-2xl p-3 ${activity.iconWrapClass || "bg-slate-100 text-slate-700"}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {activity.tagLabel && (
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${activity.tagClass || "bg-slate-100 text-slate-600"}`}>
                        {activity.tagLabel}
                      </span>
                    )}
                    <p className="text-base font-semibold text-slate-950">
                      {activity.title}
                    </p>
                  </div>
                  <span className={`text-xs font-semibold ${activity.timeClass || "text-slate-500"}`}>
                    {formatTimeAgo(activity.timestamp, t)}
                  </span>
                </div>
                <p className="mt-1 text-sm leading-6 text-slate-700">
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
