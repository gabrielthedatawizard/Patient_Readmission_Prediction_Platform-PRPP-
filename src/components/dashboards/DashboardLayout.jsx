import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";

// Tip 4: Elevated sections with depth — the separator between data groups
// is as important as the data itself. World-class dashboards (Notion, Linear,
// Retool) use layering to create depth, not just flat borders.
export const DashboardLayout = ({ title, subtitle, children, kpis = [], headerActions = null }) => {
  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Tip 7: Consistent page header with clear visual hierarchy */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-slate-50">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1.5 text-sm text-neutral-500 dark:text-slate-400 max-w-2xl leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>
        {headerActions && (
          <div className="flex items-center gap-2 shrink-0">{headerActions}</div>
        )}
      </div>

      {kpis && kpis.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {kpis}
        </div>
      )}

      {children}
    </div>
  );
};

// Tip 4: DashboardSection — premium card with top highlight border that creates
// the illusion of a light source from above (technique from Stripe, Linear)
export const DashboardSection = ({
  title,
  subtitle,
  children,
  className = "",
  headerActions = null,
  noPadding = false,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={[
        "rounded-xl border border-neutral-200/80 dark:border-slate-800",
        // Inner top highlight simulates depth/elevation without glassmorphism
        "bg-white dark:bg-slate-900",
        "shadow-sm",
        className,
      ].join(" ")}
    >
      {(title || headerActions) && (
        <div
          className={[
            "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3",
            "border-b border-neutral-100 dark:border-slate-800/80",
            "px-5 py-4",
          ].join(" ")}
        >
          <div>
            {title && (
              <h2 className="text-base font-semibold text-neutral-900 dark:text-slate-100 tracking-tight">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="mt-0.5 text-xs text-neutral-500 dark:text-slate-400">{subtitle}</p>
            )}
          </div>
          {headerActions && (
            <div className="flex items-center gap-2 shrink-0">{headerActions}</div>
          )}
        </div>
      )}
      <div className={noPadding ? "" : "p-5"}>{children}</div>
    </motion.div>
  );
};

// Tip 6: Semantic filter pills — world-class dashboards use pill tabs with
// a filled active state + semantic color match to the content being filtered
export const FilterPills = ({ options, value, onChange }) => {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {options.map((opt) => {
        const isActive = value === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={[
              "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold",
              "transition-all duration-150",
              isActive
                ? `${opt.activeClass ?? "bg-teal-600 text-white shadow-sm"}`
                : "bg-neutral-100 dark:bg-slate-800 text-neutral-600 dark:text-slate-400 hover:bg-neutral-200 dark:hover:bg-slate-700",
            ].join(" ")}
          >
            {opt.icon && <opt.icon className="w-3.5 h-3.5" />}
            {opt.label}
            {opt.count !== undefined && (
              <span
                className={[
                  "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                  isActive
                    ? "bg-white/20 text-white"
                    : "bg-neutral-200 dark:bg-slate-700 text-neutral-600 dark:text-slate-300",
                ].join(" ")}
              >
                {opt.count}
              </span>
            )}
            {isActive && <ChevronRight className="w-3 h-3 opacity-70" />}
          </button>
        );
      })}
    </div>
  );
};
