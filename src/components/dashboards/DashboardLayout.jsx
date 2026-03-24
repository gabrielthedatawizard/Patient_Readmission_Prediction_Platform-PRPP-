import React from 'react';

export const DashboardLayout = ({ title, subtitle, children, kpis = [], headerActions = null }) => {
  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-slate-100">{title}</h1>
          {subtitle && (
            <p className="mt-1 text-neutral-600 dark:text-slate-400">{subtitle}</p>
          )}
        </div>
        {headerActions && (
          <div className="flex items-center gap-2">
            {headerActions}
          </div>
        )}
      </div>

      {kpis && kpis.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4">
          {kpis}
        </div>
      )}

      {children}
    </div>
  );
};

export const DashboardSection = ({ title, children, className = "", headerActions = null }) => {
  return (
    <div className={`rounded-2xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm ${className}`}>
      {(title || headerActions) && (
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {title && <h2 className="text-xl font-bold text-neutral-900 dark:text-slate-100">{title}</h2>}
          {headerActions && <div className="flex items-center gap-2">{headerActions}</div>}
        </div>
      )}
      {children}
    </div>
  );
};
