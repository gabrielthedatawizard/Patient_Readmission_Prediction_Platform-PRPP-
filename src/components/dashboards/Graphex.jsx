import React from "react";
import { motion } from "framer-motion";

/**
 * Graphex - Premium Clinical Visualization Library
 */

export const RadialUrgency = ({ 
  value, 
  max = 100, 
  label, 
  variant = "default",
  size = 200 
}) => {
  const safeValue = isNaN(value) ? 0 : Math.max(0, Math.min(max, value));
  const radius = (size / 2) - 10;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (safeValue / max) * circumference;

  const colors = {
    danger: "text-rose-500",
    warning: "text-amber-500",
    success: "text-emerald-500",
    info: "text-sky-500",
    default: "text-teal-500"
  };

  return (
    <div className="flex flex-col items-center justify-center relative group" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth="8"
          fill="transparent"
          className="text-slate-100 dark:text-slate-800"
        />
        {/* Active Progress */}
        <motion.circle
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth="10"
          strokeDasharray={circumference}
          strokeLinecap="round"
          fill="transparent"
          className={`${colors[variant]} drop-shadow-[0_0_8px_rgba(0,0,0,0.1)]`}
        />
      </svg>
      
      <div className="absolute flex flex-col items-center">
        <span className="text-4xl font-black text-slate-900 dark:text-white tabular-nums tracking-tighter">
          {Math.round(safeValue)}%
        </span>
        {label && (
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
            {label}
          </span>
        )}
      </div>
    </div>
  );
};

export const ClinicalScatter = ({ data = [], color = "teal" }) => {
  return (
    <div className="grid grid-cols-10 gap-1.5 p-4 bg-slate-50/50 dark:bg-slate-900/30 rounded-2xl border border-slate-100 dark:border-slate-800">
      {Array.from({ length: 100 }).map((_, i) => {
        const isActive = i < data.length;
        const opacity = isActive ? "opacity-100 scale-100" : "opacity-10 scale-50";
        const colorClass = isActive ? `bg-${color}-500 shadow-[0_0_8px_rgba(0,0,0,0.2)]` : "bg-slate-300 dark:bg-slate-700";
        
        return (
          <motion.div
            key={i}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: i * 0.005 }}
            className={`w-2.5 h-2.5 rounded-full transition-all duration-500 ${opacity} ${colorClass}`}
          />
        );
      })}
    </div>
  );
};

export const TrendFlow = ({ data = [], height = 150 }) => {
  if (!data || data.length < 2) return null;
  const points = data.map((d, i) => `${(i / (data.length - 1)) * 100},${100 - d}`).join(" ");
  
  return (
    <div className="relative w-full" style={{ height }}>
      <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
        <defs>
          <linearGradient id="flowGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.2" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        
        {/* Fill Area */}
        <motion.path
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          d={`M0,100 L${points} L100,100 Z`}
          className="text-teal-500 fill-[url(#flowGradient)]"
        />
        
        {/* Line Stroke */}
        <motion.path
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 2, ease: "easeInOut" }}
          d={`M0,${100 - data[0]} L${points}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-teal-500 drop-shadow-[0_4px_8px_rgba(20,184,166,0.3)]"
        />
      </svg>
    </div>
  );
};
