import { useMemo, useState } from "react";
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
} from "../components/dashboards";
import {
  useMlMonitoringBundleQuery,
  useTrainingDatasetExportMutation,
} from "../hooks/useAnalytics";
import { trackEvent } from "../services/analytics";

function formatPercent(value, digits = 1) {
  return `${(Number(value || 0) * 100).toFixed(digits)}%`;
}

function runtimeStatus(monitoring = {}) {
  if (!monitoring || !Object.keys(monitoring).length) {
    return {
      label: "Unavailable",
      detail: "Live monitoring telemetry is not available yet. Review integrations and offline status.",
    };
  }

  const fallbackRate = Number(monitoring.fallbackRate || 0);
  const coverage = Number(monitoring.predictionCoverage || 0);

  if (fallbackRate >= 0.25 || coverage < 0.7) {
    return {
      label: "Degraded",
      detail: "Model delivery or integration needs attention.",
    };
  }

  if (fallbackRate >= 0.1 || coverage < 0.85) {
    return {
      label: "Watch",
      detail: "Monitor calibration and fallback behavior closely.",
    };
  }

  return {
    label: "Healthy",
    detail: "Prediction coverage and fallback behavior are within target.",
  };
}

function sortBreakdownEntries(breakdown = {}) {
  return Object.entries(breakdown || {}).sort((left, right) => Number(right[1] || 0) - Number(left[1] || 0));
}

function buildRecommendations({ anomalies = [], monitoring = {}, quality = {}, fairness = {} }) {
  const recommendations = anomalies.map((anomaly, index) => ({
    id: `${anomaly.type || "anomaly"}-${index}`,
    title: anomaly.type || "Operational anomaly",
    message: anomaly.message,
    action: anomaly.action,
    priority: anomaly.severity === "high" ? "high" : "medium",
  }));

  const fallbackRate = Number(monitoring.fallbackRate || 0);
  if (fallbackRate >= 0.15) {
    recommendations.push({
      id: "fallback-rate",
      title: "High fallback usage",
      message: `Rule-based fallback is serving ${formatPercent(fallbackRate, 0)} of predictions.`,
      action: "Verify ML service health, timeout behavior, and Vercel runtime configuration.",
      priority: "high",
    });
  }

  const completeness = Number(monitoring.averageFeatureCompleteness || quality.criticalFieldCompleteness || 0);
  if (completeness < 0.8) {
    recommendations.push({
      id: "feature-completeness",
      title: "Training signal quality is weak",
      message: `Average feature completeness is ${formatPercent(completeness, 0)}.`,
      action: "Increase structured labs, vitals, and social barrier capture in discharge and admission workflows.",
      priority: "high",
    });
  }

  const predictionCoverage = Number(monitoring.predictionCoverage || 0);
  if (predictionCoverage < 0.85) {
    recommendations.push({
      id: "prediction-coverage",
      title: "Prediction coverage below target",
      message: `Only ${formatPercent(predictionCoverage, 0)} of eligible visits have a stored prediction.`,
      action: "Audit encounter creation and enforce score generation at discharge completion.",
      priority: "medium",
    });
  }

  const fairnessVariance = Number(fairness.variance || 0);
  if (fairnessVariance > 10) {
    recommendations.push({
      id: "fairness-variance",
      title: "Fairness variance needs review",
      message: `Observed monitored variance is ${fairnessVariance.toFixed(1)} points.`,
      action: "Review subgroup feature completeness and compare score distribution by monitored cohort.",
      priority: "medium",
    });
  }

  if (!recommendations.length) {
    recommendations.push({
      id: "stability",
      title: "Stability",
      message: "No active anomalies detected. Continue monitoring export quality and refresh the calibrated artifact weekly.",
      action: "Export labelled dataset and review model calibration trend.",
      priority: "low",
    });
  }

  return recommendations;
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

export const MLEngineerDashboard = () => {
  const navigate = useNavigate();
  const { scopeLabel, currentScope } = useWorkspace();
  const monitoringQuery = useMlMonitoringBundleQuery();
  const [isExporting, setIsExporting] = useState("");
  const [exportError, setExportError] = useState("");
  const exportMutation = useTrainingDatasetExportMutation();

  const monitoringData = monitoringQuery.data?.monitoring || null;
  const monitoring = useMemo(() => monitoringData || {}, [monitoringData]);
  const quality = useMemo(
    () => monitoringQuery.data?.quality?.quality || {},
    [monitoringQuery.data?.quality?.quality],
  );
  const fairness = useMemo(
    () => monitoringQuery.data?.fairness?.fairness || {},
    [monitoringQuery.data?.fairness?.fairness],
  );
  const anomalies = useMemo(
    () => monitoringQuery.data?.anomalies || [],
    [monitoringQuery.data?.anomalies],
  );
  const queryIssues = monitoringQuery.data?.issues || monitoringQuery.error?.issues || [];
  const runtime = runtimeStatus(monitoring);
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
    } catch (error) {
      setExportError(error?.message || "Dataset export failed.");
    } finally {
      setIsExporting("");
    }
  };

  if (monitoringQuery.isLoading && !monitoringData) {
    return <DashboardSkeleton cards={5} />;
  }

  if (monitoringQuery.error && !monitoringData) {
    return (
      <div className="space-y-6 p-6">
        <ErrorState error={monitoringQuery.error.message} onRetry={refreshAll} />
        <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Operational fallback</h2>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            Monitoring feeds are unavailable right now. You can still review connectivity,
            DHIS2 status, offline sync readiness, and other operational signals from the
            workspace settings page.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => navigate("/settings")}>
              Open settings
            </Button>
            <Button
              variant="ghost"
              icon={<RefreshCw className="w-4 h-4" />}
              onClick={refreshAll}
            >
              Retry monitoring
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">ML Operations Dashboard</h1>
          <p className="text-neutral-600 mt-1">
            {scopeLabel.title} • {currentScope.operationalMode === "sandbox" ? "Sandbox model workspace" : "Model health, data readiness, fallback behavior, and training export operations"}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
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
            Export Labelled CSV
          </Button>
          <Button
            variant="secondary"
            icon={<Database className="w-4 h-4" />}
            loading={isExporting === "json:all"}
            onClick={() => handleExport({ format: "json", labelledOnly: false })}
          >
            Export JSON Snapshot
          </Button>
        </div>
      </div>

      {exportError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {exportError}
        </div>
      ) : null}

      {queryIssues.length ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-700" />
              <div>
                <h2 className="text-sm font-semibold text-amber-900">
                  Some monitoring feeds are unavailable
                </h2>
                <p className="mt-1 text-sm text-amber-800">
                  {queryIssues.map((issue) => issue.source).join(", ")} are not responding
                  cleanly. The dashboard is showing the operational data that could still be
                  recovered.
                </p>
              </div>
            </div>
            <Button variant="secondary" onClick={() => navigate("/settings")}>
              Review integrations
            </Button>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        <KPICard
          title="Prediction Coverage"
          value={formatPercent(monitoring.predictionCoverage, 0)}
          icon={Cpu}
          footer={`${Number(monitoring.visitCount || 0).toLocaleString()} visits monitored`}
        />
        <KPICard
          title="Fallback Rate"
          value={formatPercent(monitoring.fallbackRate, 0)}
          icon={AlertTriangle}
          footer={`${methods.find(([method]) => method === "rules")?.[1] || 0} fallback predictions`}
        />
        <KPICard
          title="Feature Completeness"
          value={formatPercent(monitoring.averageFeatureCompleteness || quality.criticalFieldCompleteness, 0)}
          icon={BarChart3}
          footer="Average across critical model inputs"
        />
        <KPICard
          title="30d Readmission Rate"
          value={formatPercent(monitoring.readmissionRate30d, 0)}
          icon={Activity}
          footer={`${Number(monitoring.labelledCount || 0).toLocaleString()} labelled visits`}
        />
        <KPICard title="Runtime Status" value={runtime.label} icon={ShieldCheck} footer={runtime.detail} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white rounded-xl border border-neutral-200 p-6">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <h2 className="text-xl font-bold text-neutral-900">Model Governance Snapshot</h2>
              <p className="text-sm text-neutral-600 mt-1">
                Live indicators for export quality, fairness, and prediction delivery
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-wide text-neutral-500">Generated</p>
              <p className="text-sm font-semibold text-neutral-900">
                {monitoring.generatedAt ? new Date(monitoring.generatedAt).toLocaleString() : "Unavailable"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="rounded-lg border border-neutral-200 p-4">
              <p className="text-sm font-semibold text-neutral-900 mb-3">Critical Field Coverage</p>
              {criticalCoverage.length ? (
                <div className="space-y-3">
                  {criticalCoverage.map(([field, value]) => (
                    <div key={field}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-neutral-700">{field}</span>
                        <span className="font-semibold text-neutral-900">{formatPercent(value, 0)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-neutral-100 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-teal-500 to-emerald-500"
                          style={{ width: `${Math.max(0, Math.min(100, Number(value || 0) * 100))}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState message="No critical-field coverage data available." />
              )}
            </div>

            <div className="rounded-lg border border-neutral-200 p-4">
              <p className="text-sm font-semibold text-neutral-900 mb-3">Model and Method Mix</p>
              <div className="space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-neutral-500 mb-2">Model Versions</p>
                  <div className="space-y-2">
                    {modelVersions.length ? (
                      modelVersions.slice(0, 4).map(([label, count]) => (
                        <div key={label} className="flex items-center justify-between text-sm">
                          <span className="text-neutral-700">{label}</span>
                          <span className="font-semibold text-neutral-900">{Number(count).toLocaleString()}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-neutral-500">No model version data yet.</p>
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wide text-neutral-500 mb-2">Inference Methods</p>
                  <div className="flex flex-wrap gap-2">
                    {methods.length ? (
                      methods.map(([label, count]) => (
                        <span
                          key={label}
                          className="inline-flex items-center gap-2 rounded-full bg-neutral-100 px-3 py-1 text-sm text-neutral-700"
                        >
                          <span className="font-semibold">{label}</span>
                          <span>{Number(count).toLocaleString()}</span>
                        </span>
                      ))
                    ) : (
                      <p className="text-sm text-neutral-500">No method telemetry yet.</p>
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wide text-neutral-500 mb-2">Tier Distribution</p>
                  <div className="flex flex-wrap gap-2">
                    {tiers.length ? (
                      tiers.map(([label, count]) => (
                        <span
                          key={label}
                          className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1 text-sm text-teal-700"
                        >
                          <span className="font-semibold">{label}</span>
                          <span>{Number(count).toLocaleString()}</span>
                        </span>
                      ))
                    ) : (
                      <p className="text-sm text-neutral-500">No tier breakdown available.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="rounded-lg bg-neutral-50 border border-neutral-200 p-4">
              <p className="text-neutral-500">Fairness Variance</p>
              <p className="text-2xl font-bold text-neutral-900 mt-1">{Number(fairness.variance || 0).toFixed(1)}</p>
              <p className="text-neutral-600 mt-2">Variance across monitored fairness groups.</p>
            </div>
            <div className="rounded-lg bg-neutral-50 border border-neutral-200 p-4">
              <p className="text-neutral-500">Average Predicted Probability</p>
              <p className="text-2xl font-bold text-neutral-900 mt-1">{formatPercent(monitoring.averagePredictionProbability, 0)}</p>
              <p className="text-neutral-600 mt-2">Average risk probability across stored predictions.</p>
            </div>
            <div className="rounded-lg bg-neutral-50 border border-neutral-200 p-4">
              <p className="text-neutral-500">Dataset Scope</p>
              <p className="text-2xl font-bold text-neutral-900 mt-1">{Number(monitoring.patientCount || 0).toLocaleString()}</p>
              <p className="text-neutral-600 mt-2">Patients contributing to the monitoring snapshot.</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-neutral-200 p-6">
          <h2 className="text-xl font-bold mb-4 text-neutral-900">ML Engineering Priorities</h2>
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
        </div>
      </div>
    </div>
  );
};

export default MLEngineerDashboard;
