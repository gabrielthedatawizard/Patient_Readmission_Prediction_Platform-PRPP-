import React from "react";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";

/**
 * Precision Clinical 2.0 - Dashboard Infrastructure
 */

export const DashboardLayout = ({ 
  children, 
  title, 
  subtitle, 
  headerActions,
  isBento = false 
}) => {
  return (
    <div className="min-h-screen bg-white dark:bg-[#020617] text-slate-900 dark:text-slate-100 selection:bg-teal-500/30 font-sans transition-colors duration-500">
      {/* Schematic Background Depth - HUD Grid */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.1] overflow-hidden">
        <svg width="100%" height="100%" className="absolute inset-0">
          <pattern id="medical-grid" width="100" height="100" patternUnits="userSpaceOnUse">
            <path d="M 100 0 L 0 0 0 100" fill="none" stroke="currentColor" strokeWidth="0.5" />
            <circle cx="0" cy="0" r="1.5" fill="currentColor" />
          </pattern>
          <rect width="100%" height="100%" fill="url(#medical-grid)" />
        </svg>
      </div>

      <div className="relative max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-700">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div className="space-y-1">
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
              {title}
            </h1>
            {subtitle && (
              <p className="text-lg font-medium text-slate-500 dark:text-slate-400 max-w-2xl">
                {subtitle}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {headerActions}
          </div>
        </header>

        <main className={isBento ? "grid grid-cols-1 md:grid-cols-12 gap-6" : "space-y-8"}>
          {children}
        </main>
      </div>
    </div>
  );
};

export const DashboardSection = ({ title, subtitle, children, className = "", action }) => {
  return (
    <motion.section 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white dark:bg-slate-900/50 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm shadow-slate-200/50 dark:shadow-none transition-all duration-300 hover:border-slate-300 dark:hover:border-slate-700 ${className}`}
    >
      {(title || subtitle) && (
        <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
          <div>
            {title && <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">{title}</h2>}
            {subtitle && <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="p-8">
        {children}
      </div>
    </motion.section>
  );
};

export const FilterPills = ({ options, value, onChange }) => {
  return (
    <div className="flex flex-wrap items-center gap-3 p-1.5 bg-slate-100/50 dark:bg-slate-900/50 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-800">
      {options.map((opt) => {
        const isActive = value === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`
              inline-flex items-center gap-2 rounded-xl px-5 py-2 text-xs font-bold transition-all duration-300
              ${isActive
                ? `bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-md shadow-slate-200/50 dark:shadow-none scale-105`
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"}
            `}
          >
            {opt.icon && <opt.icon className={`w-4 h-4 ${isActive ? 'text-teal-500' : 'opacity-50'}`} />}
            {opt.label}
            {opt.count !== undefined && (
              <span className={`ml-1 px-1.5 py-0.5 rounded-lg text-[10px] font-black ${
                isActive ? 'bg-teal-50 dark:bg-teal-950 text-teal-600' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
              }`}>
                {opt.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
