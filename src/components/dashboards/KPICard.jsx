import React from "react";
import { motion } from "framer-motion";

/**
 * Precision Clinical 2.0 - High Performance KPI Card
 */

export const KPICard = ({ 
  label, 
  value, 
  icon: Icon, 
  trend, 
  trendDirection = 'up',
  variant = 'default',
  sparklineData = [30, 40, 35, 50, 45, 60, 55],
  footer,
  onClick
}) => {
  const styles = {
    danger: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/50',
    warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900/50',
    success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50',
    info: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-200 dark:border-sky-900/50',
    default: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
  };

  const accentStyles = {
    danger: 'bg-rose-500',
    warning: 'bg-amber-500',
    success: 'bg-emerald-500',
    info: 'bg-sky-500',
    default: 'bg-slate-400'
  };

  return (
    <motion.div 
      whileHover={onClick ? { scale: 1.02 } : {}}
      onClick={onClick}
      className={`relative group p-6 rounded-[2rem] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 transition-all duration-500 hover:shadow-[0_20px_50px_rgba(0,0,0,0.05)] dark:hover:shadow-none hover:-translate-y-1.5 overflow-hidden ${onClick ? 'cursor-pointer' : ''}`}
    >
      {/* Background Sparkline Trace */}
      <div className="absolute bottom-0 left-0 right-0 h-16 opacity-[0.1] dark:opacity-20 pointer-events-none group-hover:opacity-20 transition-opacity">
        <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
          <path 
            d={`M0,100 ${sparklineData.map((d, i) => `L${(i / (sparklineData.length - 1)) * 100},${100 - d}`).join(' ')} L100,100 Z`}
            className={`fill-current ${accentStyles[variant]} transition-all duration-1000`}
          />
        </svg>
      </div>

      <div className="relative flex items-start justify-between mb-6">
        <div className={`p-4 rounded-2xl ${styles[variant]} transition-transform duration-300 group-hover:scale-110 shadow-sm border border-current/10`}>
          {Icon && <Icon className="w-6 h-6 stroke-[2.5px]" />}
        </div>
        
        {trend && (
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tabular-nums ${
            trendDirection === 'up' 
              ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30' 
              : 'bg-rose-50 text-rose-600 dark:bg-rose-950/30'
          }`}>
            {trendDirection === 'up' ? '↑' : '↓'} {trend}
          </div>
        )}
      </div>

      <div className="relative">
        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.25em] mb-1.5 truncate">
          {label}
        </p>
        <div className="flex items-baseline gap-2">
          <h3 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter tabular-nums">
            {value}
          </h3>
          <div className={`w-2 h-2 rounded-full animate-pulse shadow-[0_0_10px_currentColor] ${accentStyles[variant]}`} />
        </div>
      </div>

      {footer && (
        <div className="relative mt-6 pt-4 border-t border-slate-50 dark:border-slate-800/50 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider truncate">
          {footer}
        </div>
      )}
    </motion.div>
  );
};

export default KPICard;
