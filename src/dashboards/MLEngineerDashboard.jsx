import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Cpu,
  Database,
  Download,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import Button from "../components/common/Button";
import { useWorkspace } from "../context/WorkspaceProvider";
import {
  DashboardSkeleton,
  EmptyState,
  ErrorState,
  KPICard,
  PolicyRecommendation,
  DashboardLayout,
  DashboardSection,
} from "../components/dashboards";
import {
  useMlMonitoringBundleQuery,
  useTrainingDatasetExportMutation,
} from "../hooks/useAnalytics";
import { trackEvent } from "../services/analytics";
import { requestJson } from "../services/apiClient";

// Persona: ML Engineer
// JTBD: "Is the model healthy? What's failing and where?"
// Mental model: SRE operator. Status lights + metrics.

function formatPercent(value, digits = 1) {
  return `${(Number(value || 0) * 100).toFixed(digits)}%`;
}

function runtimeStatus(monitoring = {}, runtime = {}) {
  if (runtime?.enabled === false) return { label: "Disabled", variant: "default", detail: runtime.message || "ML predictions are disabled in this environment." };
  if (runtime?.status === "fallback_only") return { label: "Fallback only", variant: "warning", detail: runtime.message || "Predictions are currently served by the local rules fallback." };
  if (runtime?.status === "down") return { label: "Unavailable", variant: "danger", detail: runtime.message || "ML runtime is unavailable." };
  if (runtime?.status === "degraded") return { label: "Degraded", variant: "danger", detail: runtime.message || "External ML is unhealthy and fallback protection is active." };

  if (!monitoring || !Object.keys(monitoring).length) {
    return { label: "Unavailable", variant: "default", detail: "Live monitoring telemetry is not available yet." };
  }

  const fallbackRate = Number(monitoring.fallbackRate || 0);
  const coverage = Number(monitoring.predictionCoverage || 0);

  if (fallbackRate >= 0.25 || coverage < 0.7) return { label: "Degraded", variant: "danger", detail: "Model delivery or integration needs attention." };
  if (fallbackRate >= 0.1 || coverage < 0.85) return { label: "Watch", variant: "warning", detail: "Monitor calibration and fallback behavior closely." };
  return { label: "Healthy", variant: "success", detail: "Prediction coverage and fallback behavior are within target." };
}

function sortBreakdownEntries(breakdown = {}) {
  return Object.entries(breakdown || {}).sort((l, r) => Number(r[1] || 0) - Number(l[1] || 0));
}

function buildRecommendations({ anomalies = [], monitoring = {}, quality = {}, fairness = {} }) {
  const recs = anomalies.map((a, i) => ({
    id: `${a.type || "anomaly"}-${i}`,
    title: a.type || "Operational anomaly",
    message: a.message,
    action: a.action,
    priority: a.severity === "high" ? "high" : "medium",
  }));

  const fallbackRate = Number(monitoring.fallbackRate || 0);
  if (fallbackRate >= 0.15) {
    recs.push({ id: "fallback-rate", title: "High fallback usage", message: `Rule-based fallback is serving ${formatPercent(fallbackRate, 0)} of predictions.`, action: "Verify ML service health, timeout behavior, and runtime configuration.", priority: "high" });
  }

  const completeness = Number(monitoring.averageFeatureCompleteness || quality.criticalFieldCompleteness || 0);
  if (completeness < 0.8) {
    recs.push({ id: "feature-completeness", title: "Training signal quality is weak", message: `Average feature completeness is ${formatPercent(completeness, 0)}.`, action: "Increase structured labs, vitals, and social barrier capture.", priority: "high" });
  }

  const coverage = Number(monitoring.predictionCoverage || 0);
  if (coverage < 0.85) {
    recs.push({ id: "prediction-coverage", title: "Prediction coverage below target", message: `Only ${formatPercent(coverage, 0)} of eligible visits have a stored prediction.`, action: "Audit encounter creation and enforce score generation.", priority: "medium" });
  }

  const fairnessVariance = Number(fairness.variance || 0);
  if (fairnessVariance > 10) {
    recs.push({ id: "fairness-variance", title: "Fairness variance needs review", message: `Observed variance is ${fairnessVariance.toFixed(1)} points.`, action: "Review subgroup feature completeness and compare score distribution.", priority: "medium" });
  }

  if (!recs.length) {
    recs.push({ id: "stability", title: "Stability", message: "No active anomalies detected. Continue monitoring.", action: "Export labelled dataset and review model calibration trend.", priority: "low" });
  }

  return recs;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Mini progress bar for field coverage visualization
function CoverageBar({ label, value }) {
  const pct = Math.max(0, Math.min(100, Number(value || 0) * 100));
  const color = pct >= 90 ? "from-emerald-500 to-emerald-400" : pct >= 70 ? "from-amber-500 to-amber-400" : "from-rose-500 to-rose-400";
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="text-neutral-600 dark:text-slate-400 truncate">{label}</span>
        <span className="font-semibold text-neutral-900 dark:text-slate-100 tabular-nums">{formatPercent(value, 0)}</span>
      </div>
      <div className="h-1.5 rounded-full bg-neutral-100 dark:bg-slate-800 overflow-hidden">
        <div className={`h-full rounded-full bg-gradient-to-r ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export const MLEngineerDashboard = () => {
  const navigate = useNavigate();
  const { scopeLabel, currentScope } = useWorkspace();
  const monitoringQuery = useMlMonitoringBundleQuery();
  const healthQuery = useQuery({
    queryKey: ["trip", "system", "health"],
    queryFn: () => requestJson("/health"),
    staleTime: 60 * 1000,
  });
  const [isExporting, setIsExporting] = useState("");
  const [exportError, setExportError] = useState("");
  const exportMutation = useTrainingDatasetExportMutation();

  const monitoringData = monitoringQuery.data?.monitoring || null;
  const monitoring = useMemo(() => monitoringData || {}, [monitoringData]);
  const quality = useMemo(() => monitoringQuery.data?.quality?.quality || {}, [monitoringQuery.data?.quality?.quality]);
  const fairness = useMemo(() => monitoringQuery.data?.fairness?.fairness || {}, [monitoringQuery.data?.fairness?.fairness]);
  const anomalies = useMemo(() => monitoringQuery.data?.anomalies || [], [monitoringQuery.data?.anomalies]);
  const mlRuntime = healthQuery.data?.services?.ml || null;
  const queryIssues = monitoringQuery.data?.issues || monitoringQuery.error?.issues || [];
  const runtime = runtimeStatus(monitoring, mlRuntime);
  const modelVersions = sortBreakdownEntries(monitoring.modelVersionBreakdown);
  const methods = sortBreakdownEntries(monitoring.methodBreakdown);
  const tiers = sortBreakdownEntries(monitoring.tierBreakdown);
  const criticalCoverage = Object.entries(monitoring.criticalFieldCoverage || {});
  const recommendations = useMemo(
    () => buildRecommendations({ anomalies, monitoring, quality, fairness }),
    [anomalies, monitoring, quality, fairness],
  );

  const refreshAll = () => monitoringQuery.refetch();

  const handleExport = async ({ format, labelledOnly }) => {
    const exportKey = `${format}:${labelledOnly ? "labelled" : "all"}`;
    setIsExporting(exportKey);
    setExportError("");
    try {
      const { blob } = await exportMutation.mutateAsync({ format, labelledOnly });
      const stamp = new Date().toISOString().slice(0, 10);
      const suffix = labelledOnly ? "labelled" : "all";
      downloadBlob(blob, `trip-training-dataset-${suffix}-${stamp}.${format}`);
      trackEvent("Export", "MLTrainingDataset", `${format}:${suffix}`);
    } catch (err) {
      setExportError(err?.message || "Dataset export failed.");
    } finally {
      setIsExporting("");
    }
  };

  if (monitoringQuery.isLoading && !monitoringData) return <DashboardSkeleton cards={5} />;

  if (monitoringQuery.error && !monitoringData) {
    return (
      <DashboardLayout title="ML Operations" subtitle="Model health, data readiness, and training export">
        <ErrorState error={monitoringQuery.error.message} onRetry={refreshAll} />
        <DashboardSection title="Operational fallback">
          <p className="text-sm leading-7 text-neutral-600 dark:text-slate-400">
            Monitoring feeds are unavailable right now. You can still review connectivity,
            DHIS2 status, offline sync readiness, and other operational signals from the
            workspace settings page.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => navigate("/settings")}>Open settings</Button>
            <Button variant="ghost" icon={<RefreshCw className="w-4 h-4" />} onClick={refreshAll}>Retry monitoring</Button>
          </div>
        </DashboardSection>
      </DashboardLayout>
    );
  }

  // Semantic variants for KPI cards based on operational thresholds
  const coverageValue = Number(monitoring.predictionCoverage || 0);
  const fallbackValue = Number(monitoring.fallbackRate || 0);
  const completenessValue = Number(monitoring.averageFeatureCompleteness || quality.criticalFieldCompleteness || 0);
  const coverageVariant = coverageValue >= 0.85 ? "success" : coverageValue >= 0.7 ? "warning" : "danger";
  const fallbackVariant = fallbackValue < 0.1 ? "success" : fallbackValue < 0.25 ? "warning" : "danger";
  const completenessVariant = completenessValue >= 0.8 ? "success" : completenessValue >= 0.6 ? "warning" : "danger";

  return (
    <DashboardLayout
      title="ML Operations"
      subtitle={`${scopeLabel.title} | ${currentScope.operationalMode === "sandbox" ? "Sandbox model workspace" : "Model health, data readiness, fallback behavior, and training export"}`}
      headerActions={
        <div className="flex flex-wrap gap-2">
          <Button
            variant="ghost"
            icon={<RefreshCw className={`w-4 h-4 ${monitoringQuery.isFetching ? "animate-spin" : ""}`} />}
            onClick={refreshAll}
            loading={monitoringQuery.isFetching}
          >
            Refresh
          </Button>
          <Button
            variant="secondary"
            icon={<Download className="w-4 h-4" />}
            loading={isExporting === "csv:labelled"}
            onClick={() => handleExport({ format: "csv", labelledOnly: true })}
          >
            Export CSV
          </Button>
          <Button
            variant="secondary"
            icon={<Database className="w-4 h-4" />}
            loading={isExporting === "json:all"}
            onClick={() => handleExport({ format: "json", labelledOnly: false })}
          >
            Export JSON
          </Button>
        </div>
      }
      kpis={[
        <KPICard key="coverage" title="Prediction Coverage" value={formatPercent(monitoring.predictionCoverage, 0)} icon={Cpu} footer={`${Number(monitoring.visitCount || 0).toLocaleString()} visits`} variant={coverageVariant} />,
        <KPICard key="fallback" title="Fallback Rate" value={formatPercent(monitoring.fallbackRate, 0)} icon={AlertTriangle} footer={`${methods.find(([m]) => m === "rules")?.[1] || 0} fallback predictions`} variant={fallbackVariant} />,
        <KPICard key="completeness" title="Feature Completeness" value={formatPercent(completenessValue, 0)} icon={BarChart3} footer="Avg across critical inputs" variant={completenessVariant} />,
        <KPICard key="readmission" title="30d Readmission" value={formatPercent(monitoring.readmissionRate30d, 0)} icon={Activity} footer={`${Number(monitoring.labelledCount || 0).toLocaleString()} labelled`} variant="default" />,
        <KPICard key="runtime" title="Runtime Status" value={runtime.label} icon={ShieldCheck} footer={runtime.detail} variant={runtime.variant} />,
      ]}
    >
      {/* Export error banner */}
      {exportError && (
        <div className="rounded-lg border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/20 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
          {exportError}
        </div>
      )}

      {/* Partial-data warning */}
      {queryIssues.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/20 px-4 py-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">Some monitoring feeds are unavailable</p>
            <p className="mt-0.5 text-sm text-amber-700 dark:text-amber-300">
              {queryIssues.map((i) => i.source).join(", ")} are not responding cleanly.
            </p>
          </div>
          <Button variant="secondary" onClick={() => navigate("/settings")} className="shrink-0">Review</Button>
        </div>
      )}

      {/* Runtime mode panel */}
      {mlRuntime && (
        <DashboardSection title="Runtime Mode" subtitle={mlRuntime.message || "ML runtime status from the live health endpoint."}>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center rounded-full bg-neutral-100 dark:bg-slate-800 px-3 py-1.5 text-sm font-semibold text-neutral-700 dark:text-slate-300">
              Requested: {mlRuntime.requestedMode || "auto"}
            </span>
            <span className="inline-flex items-center rounded-full bg-teal-50 dark:bg-teal-950/50 px-3 py-1.5 text-sm font-semibold text-teal-700 dark:text-teal-300">
              Effective: {mlRuntime.runtimeMode || mlRuntime.status || "unknown"}
            </span>
          </div>
        </DashboardSection>
      )}

      {/* Model Governance — 2/3 + 1/3 layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <DashboardSection
            title="Model Governance Snapshot"
            subtitle="Live indicators for export quality, fairness, and prediction delivery"
            headerActions={
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-widest text-neutral-400 dark:text-slate-500">Generated</p>
                <p className="text-xs font-semibold text-neutral-700 dark:text-slate-300">
                  {monitoring.generatedAt ? new Date(monitoring.generatedAt).toLocaleString() : "—"}
                </p>
              </div>
            }
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* Critical Field Coverage */}
              <div className="rounded-lg border border-neutral-200 dark:border-slate-800 p-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500 dark:text-slate-400 mb-3">Critical Field Coverage</p>
                {criticalCoverage.length ? (
                  <div className="space-y-3">
                    {criticalCoverage.map(([field, value]) => (
                      <CoverageBar key={field} label={field} value={value} />
                    ))}
                  </div>
                ) : (
                  <EmptyState message="No critical-field coverage data available." />
                )}
              </div>

              {/* Model & Method Mix */}
              <div className="rounded-lg border border-neutral-200 dark:border-slate-800 p-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500 dark:text-slate-400 mb-3">Model & Method Mix</p>
                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-neutral-400 dark:text-slate-500 mb-2">Model Versions</p>
                    <div className="space-y-1.5">
                      {modelVersions.length ? modelVersions.slice(0, 4).map(([label, count]) => (
                        <div key={label} className="flex items-center justify-between text-sm">
                          <span className="text-neutral-600 dark:text-slate-400">{label}</span>
                          <span className="font-semibold text-neutral-900 dark:text-slate-100 tabular-nums">{Number(count).toLocaleString()}</span>
                        </div>
                      )) : <p className="text-sm text-neutral-400 dark:text-slate-500">No model version data yet.</p>}
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-neutral-400 dark:text-slate-500 mb-2">Inference Methods</p>
                    <div className="flex flex-wrap gap-1.5">
                      {methods.length ? methods.map(([label, count]) => (
                        <span key={label} className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 dark:bg-slate-800 px-2.5 py-1 text-xs text-neutral-700 dark:text-slate-300">
                          <span className="font-semibold">{label}</span>
                          <span className="tabular-nums">{Number(count).toLocaleString()}</span>
                        </span>
                      )) : <p className="text-sm text-neutral-400 dark:text-slate-500">No telemetry yet.</p>}
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-neutral-400 dark:text-slate-500 mb-2">Tier Distribution</p>
                    <div className="flex flex-wrap gap-1.5">
                      {tiers.length ? tiers.map(([label, count]) => (
                        <span key={label} className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 dark:bg-teal-950/50 px-2.5 py-1 text-xs text-teal-700 dark:text-teal-300">
                          <span className="font-semibold">{label}</span>
                          <span className="tabular-nums">{Number(count).toLocaleString()}</span>
                        </span>
                      )) : <p className="text-sm text-neutral-400 dark:text-slate-500">No tier breakdown.</p>}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom stats row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { label: "Fairness Variance", value: Number(fairness.variance || 0).toFixed(1), desc: "Variance across monitored groups" },
                { label: "Avg Predicted Probability", value: formatPercent(monitoring.averagePredictionProbability, 0), desc: "Average risk probability" },
                { label: "Dataset Scope", value: Number(monitoring.patientCount || 0).toLocaleString(), desc: "Patients in monitoring snapshot" },
              ].map((item) => (
                <div key={item.label} className="rounded-lg border border-neutral-200 dark:border-slate-800 bg-neutral-50 dark:bg-slate-800/50 p-4">
                  <p className="text-[10px] uppercase tracking-widest text-neutral-400 dark:text-slate-500">{item.label}</p>
                  <p className="text-2xl font-bold text-neutral-900 dark:text-slate-100 mt-1 tabular-nums">{item.value}</p>
                  <p className="text-xs text-neutral-500 dark:text-slate-400 mt-1.5">{item.desc}</p>
                </div>
              ))}
            </div>
          </DashboardSection>
        </div>

        {/* Recommendations sidebar */}
        <DashboardSection title="ML Engineering Priorities">
          <div className="space-y-3">
            {recommendations.map((item) => (
              <PolicyRecommendation
                key={item.id}
                title={item.title}
                message={item.message}
                action={item.action}
                priority={item.priority}
              />
            ))}
          </div>
        </DashboardSection>
      </div>
    </DashboardLayout>
  );
};

export default MLEngineerDashboard;
