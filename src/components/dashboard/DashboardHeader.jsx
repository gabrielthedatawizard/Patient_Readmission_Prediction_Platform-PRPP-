import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { Bell, Clock3, MapPin, Search, Settings2 } from "lucide-react";
import ThemeToggle from "../ThemeToggle";

const MOTIVATION_BY_ROLE = {
  clinician: "Risk insights are ready before discharge decisions are made.",
  nurse: "Every completed checklist step reduces avoidable harm.",
  pharmacist: "Medication clarity protects patients after they leave the ward.",
  chw: "Follow-up coordination keeps care active beyond the facility.",
  moh: "National visibility turns data into policy decisions.",
};

function getGreetingPrefix(language, hour) {
  if (language === "sw") {
    if (hour < 12) return "Habari za asubuhi";
    if (hour < 17) return "Habari za mchana";
    return "Habari za jioni";
  }

  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function getInitials(fullName) {
  return String(fullName || "TRIP User")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

const DashboardHeader = ({
  user,
  facility,
  language = "en",
  notificationCount = 0,
  onOpenNotifications,
  onOpenPatients,
  onOpenSettings,
}) => {
  const hour = new Date().getHours();
  const greetingPrefix = getGreetingPrefix(language, hour);
  const firstName = String(user?.fullName || "TRIP User").split(" ")[0];
  const motivation =
    MOTIVATION_BY_ROLE[user?.role] ||
    "Tanzania's care teams are making safer discharge decisions with every patient reviewed.";

  const todayLabel = useMemo(
    () =>
      new Intl.DateTimeFormat(language === "sw" ? "sw-TZ" : "en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      }).format(new Date()),
    [language],
  );

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="relative overflow-hidden rounded-[28px] border border-white/60 bg-white/90 p-4 shadow-trip backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/75 sm:p-6"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(13,148,136,0.16),_transparent_36%),radial-gradient(circle_at_bottom_left,_rgba(59,130,246,0.14),_transparent_34%)]" />
      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="relative">
            {user?.profilePicture ? (
              <img
                src={user.profilePicture}
                alt={user.fullName}
                className="h-14 w-14 rounded-2xl object-cover ring-2 ring-teal-500/70"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 via-cyan-500 to-sky-500 text-sm font-bold text-white shadow-lg shadow-cyan-500/20">
                {getInitials(user?.fullName)}
              </div>
            )}
            <span className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white bg-emerald-500 dark:border-slate-950" />
          </div>

          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-teal-700 dark:text-teal-300 sm:text-sm sm:tracking-[0.22em]">
              {todayLabel}
            </p>
            <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-950 dark:text-slate-100 sm:text-3xl">
              {greetingPrefix}, {firstName}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300 sm:text-base">
              {motivation}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-900/5 px-3 py-1.5 dark:bg-white/5">
                <MapPin className="h-3.5 w-3.5 text-teal-600 dark:text-teal-300" />
                {facility?.name || "TRIP Facility"}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-900/5 px-3 py-1.5 dark:bg-white/5">
                <Clock3 className="h-3.5 w-3.5 text-sky-600 dark:text-sky-300" />
                {facility?.region || "National view"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex w-full flex-col gap-3 lg:w-auto lg:items-end">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-start lg:justify-end">
            <button
              type="button"
              onClick={onOpenPatients}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-200 sm:w-auto"
            >
              <Search className="h-4 w-4 text-teal-600 dark:text-teal-300" />
              {language === "sw" ? "Tafuta mgonjwa" : "Find patient"}
            </button>
            <ThemeToggle className="self-start sm:self-auto" />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <button
              type="button"
              onClick={onOpenNotifications}
              className="group inline-flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/80"
            >
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  Notifications
                </p>
                <p className="mt-1 text-lg font-bold text-slate-950 dark:text-slate-100">
                  {notificationCount}
                </p>
              </div>
              <div className="relative rounded-xl bg-teal-50 p-3 text-teal-700 transition-colors group-hover:bg-teal-100 dark:bg-teal-950/50 dark:text-teal-300 dark:group-hover:bg-teal-950/70">
                <Bell className="h-5 w-5" />
                {notificationCount > 0 && (
                  <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-rose-500" />
                )}
              </div>
            </button>

            <button
              type="button"
              onClick={onOpenSettings}
              className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/80"
            >
              <div className="rounded-xl bg-slate-100 p-3 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                <Settings2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  Workspace
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-950 dark:text-slate-100">
                  Preferences and alerts
                </p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </motion.section>
  );
};

export default DashboardHeader;
