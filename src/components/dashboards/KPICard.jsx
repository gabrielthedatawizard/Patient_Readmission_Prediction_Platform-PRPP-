import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { TrendingDown, TrendingUp, ArrowUpRight } from "lucide-react";

// Tip 2: Animated number count-up — makes data feel alive and authoritative
function useCountUp(target, duration = 900) {
  const [display, setDisplay] = useState(0);
  const frameRef = useRef(null);

  useEffect(() => {
    const numericTarget = Number(target);
    if (isNaN(numericTarget)) {
      setDisplay(target);
      return;
    }
    const startTime = performance.now();
    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic for natural deceleration
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * numericTarget));
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };
    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, duration]);

  return display;
}

// Tip 1: Semantic accent colors per card type — visual hierarchy at a glance
const ACCENT_PALETTE = {
  default: {
    bar: "bg-teal-500",
    icon: "bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400",
    ring: "shadow-teal-500/20",
  },
  danger: {
    bar: "bg-rose-500",
    icon: "bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400",
    ring: "shadow-rose-500/20",
  },
  warning: {
    bar: "bg-amber-500",
    icon: "bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400",
    ring: "shadow-amber-500/20",
  },
  success: {
    bar: "bg-emerald-500",
    icon: "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400",
    ring: "shadow-emerald-500/20",
  },
  info: {
    bar: "bg-sky-500",
    icon: "bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400",
    ring: "shadow-sky-500/20",
  },
};

export const KPICard = ({
  title,
  value,
  subtitle,
  trend,
  icon: Icon,
  footer,
  comparison,
  onClick,
  variant = "default",
  className = "",
}) => {
  const palette = ACCENT_PALETTE[variant] ?? ACCENT_PALETTE.default;
  const isTrendUp = trend?.direction === "up";
  const TrendIcon = isTrendUp ? TrendingUp : TrendingDown;
  const trendIsGood = trend?.isGood ?? false;
  const trendColor = trendIsGood
    ? "text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-950/50"
    : "text-rose-700 bg-rose-50 dark:text-rose-300 dark:bg-rose-950/50";

  const animatedValue = useCountUp(value);
  const displayValue = typeof value === "number" ? animatedValue : value;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      whileHover={onClick ? { y: -4, transition: { duration: 0.2 } } : {}}
      onClick={onClick}
      className={[
        // Tip 1: Left accent bar gives instant semantic meaning before reading text
        "relative overflow-hidden rounded-xl border border-neutral-200/80 dark:border-slate-800",
        "bg-white dark:bg-slate-900",
        "p-5 pl-7",               // extra-left padding to clear the accent bar
        "shadow-sm",
        onClick
          ? `cursor-pointer hover:shadow-lg hover:shadow-neutral-200/60 dark:hover:shadow-slate-900/80 hover:border-neutral-300 dark:hover:border-slate-700 transition-all duration-200`
          : "",
        className,
      ].join(" ")}
    >
      {/* Semantic left accent bar — the #1 trick from best dashboards (Linear, Vercel, Retool) */}
      <span className={`absolute inset-y-0 left-0 w-1 rounded-l-xl ${palette.bar}`} />

      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500 dark:text-slate-400 truncate">
            {title}
          </p>
          {subtitle && (
            <p className="text-xs text-neutral-400 dark:text-slate-500 mt-0.5 truncate">{subtitle}</p>
          )}
        </div>
        {Icon && (
          <div className={`shrink-0 p-2.5 rounded-lg ${palette.icon} shadow-sm ${palette.ring}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      {/* Tip 2: Animated count-up value */}
      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-[2rem] leading-none font-bold tracking-tight text-neutral-900 dark:text-slate-50 tabular-nums">
          {displayValue}
        </span>
        {trend && (
          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${trendColor}`}>
            <TrendIcon className="w-3.5 h-3.5" />
            {Math.abs(Number(trend.value || 0))}%
          </span>
        )}
      </div>

      {comparison && (
        <div className="mb-3 space-y-1 border-t border-neutral-100 dark:border-slate-800 pt-2">
          {comparison.national !== undefined && (
            <p className="text-xs text-neutral-500 dark:text-slate-400">
              National:{" "}
              <span className="font-semibold text-neutral-700 dark:text-slate-200">
                {comparison.national}%
              </span>
            </p>
          )}
          {comparison.target !== undefined && (
            <p className="text-xs text-neutral-500 dark:text-slate-400">
              Target:{" "}
              <span className="font-semibold text-neutral-700 dark:text-slate-200">
                {comparison.target}%
              </span>
            </p>
          )}
          {comparison.percentile !== undefined && (
            <p className="text-xs text-neutral-500 dark:text-slate-400">
              Rank:{" "}
              <span className="font-semibold text-neutral-700 dark:text-slate-200">
                {comparison.percentile}th percentile
              </span>
            </p>
          )}
        </div>
      )}

      {footer && (
        <p className="text-xs text-neutral-400 dark:text-slate-500 flex items-center gap-1 mt-1">
          <span className="truncate">{footer}</span>
          {onClick && <ArrowUpRight className="w-3 h-3 shrink-0 text-neutral-400" />}
        </p>
      )}
    </motion.div>
  );
};

export default KPICard;
