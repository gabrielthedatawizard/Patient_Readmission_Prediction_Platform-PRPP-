import React from "react";
import { Database, Layers, MapPin, RotateCcw, Sparkles } from "lucide-react";
import { useWorkspace } from "../../context/WorkspaceProvider";

function ScopeSelect({ label, value, onChange, options, placeholder, disabled }) {
  if (!options.length && !value) {
    return null;
  }

  return (
    <label className="min-w-0">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </span>
      <select
        value={value || ""}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 shadow-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100 disabled:cursor-not-allowed disabled:bg-slate-50"
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function WorkspaceScopeBar() {
  const {
    canBrowseHierarchy,
    canSwitchOperationalMode,
    currentScope,
    scopeLabel,
    regionOptions,
    districtOptions,
    facilityOptions,
    facilityDirectoryCount,
    setScopeSelection,
    setOperationalMode,
    resetScope,
  } = useWorkspace();

  if (!canBrowseHierarchy && !canSwitchOperationalMode) {
    return null;
  }

  return (
    <div className="mb-6 overflow-hidden rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-lg shadow-cyan-100/60 backdrop-blur-sm">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-teal-100 bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">
              <Layers className="h-3.5 w-3.5" />
              {scopeLabel.badge}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
              <Database className="h-3.5 w-3.5" />
              {currentScope.facilitySource === "dhis2_demo"
                ? "DHIS2 Demo"
                : currentScope.facilitySource === "dhis2_live"
                  ? "DHIS2 Live"
                  : "Local Seeded"}
            </span>
            {canSwitchOperationalMode ? (
              <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${
                currentScope.operationalMode === "sandbox"
                  ? "border-amber-200 bg-amber-50 text-amber-700"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700"
              }`}>
                <Sparkles className="h-3.5 w-3.5" />
                {currentScope.operationalMode === "sandbox" ? "Sandbox mode" : "Normal mode"}
              </span>
            ) : null}
          </div>

          <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-950">
            {scopeLabel.title}
          </h2>
          <p className="mt-1 text-sm leading-7 text-slate-600">
            {scopeLabel.subtitle}. Facilities visible in this scope:{" "}
            <span className="font-semibold text-slate-900">{facilityDirectoryCount}</span>
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {canSwitchOperationalMode ? (
            <label className="min-w-[180px]">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Operational mode
              </span>
              <select
                value={currentScope.operationalMode || "normal"}
                onChange={(event) => setOperationalMode(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 shadow-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              >
                <option value="normal">Normal</option>
                <option value="sandbox">Sandbox</option>
              </select>
            </label>
          ) : null}
          <button
            type="button"
            onClick={resetScope}
            className="inline-flex items-center gap-2 self-end rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <RotateCcw className="h-4 w-4" />
            Reset scope
          </button>
        </div>
      </div>

      {canBrowseHierarchy ? (
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <ScopeSelect
            label="Region"
            value={currentScope.regionCode || ""}
            onChange={(value) =>
              setScopeSelection({
                regionCode: value,
              })
            }
            options={regionOptions}
            placeholder="All accessible regions"
          />
          <ScopeSelect
            label="District"
            value={currentScope.district || ""}
            onChange={(value) =>
              setScopeSelection({
                district: value,
              })
            }
            options={districtOptions}
            placeholder="All districts in scope"
            disabled={!currentScope.regionCode && !districtOptions.length}
          />
          <ScopeSelect
            label="Facility"
            value={currentScope.facilityId || ""}
            onChange={(value) =>
              setScopeSelection({
                facilityId: value,
              })
            }
            options={facilityOptions}
            placeholder="All facilities in scope"
            disabled={!facilityOptions.length}
          />
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          <div className="flex items-start gap-3">
            <MapPin className="mt-0.5 h-4 w-4 text-slate-500" />
            <p>
              This role is pinned to its assigned workspace scope. Facility navigation is kept read-only to avoid widening access beyond the current duty station.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
