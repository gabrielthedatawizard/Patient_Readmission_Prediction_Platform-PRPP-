import { Activity, BarChart3, ShieldCheck, Cpu } from "lucide-react";
import { DashboardSkeleton, ErrorState, KPICard, PolicyRecommendation } from "../components/dashboards";
import { useDashboardData } from "../hooks/useDashboardData";

export const MLEngineerDashboard = () => {
  const { data: qualityData, loading, error, refresh } = useDashboardData("/analytics/quality", 120000);
  const { data: fairnessData } = useDashboardData("/analytics/fairness", 120000);
  const { data: anomaliesData } = useDashboardData("/analytics/anomalies", 120000);

  if (loading && !qualityData) {
    return <DashboardSkeleton cards={4} />;
  }

  if (error && !qualityData) {
    return <ErrorState error={error} onRetry={refresh} />;
  }

  const quality = qualityData?.quality || {};
  const fairness = fairnessData?.fairness || {};
  const anomalies = anomaliesData?.anomalies || [];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-neutral-900">ML Operations Dashboard</h1>
        <p className="text-neutral-600 mt-1">Model quality, fairness, anomaly detection, and platform monitoring</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Data Completeness"
          value={`${Math.round(Number(quality.criticalFieldCompleteness || 0) * 100)}%`}
          icon={BarChart3}
        />
        <KPICard title="Fairness Variance" value={`${Number(fairness.variance || 0).toFixed(1)}`} icon={ShieldCheck} />
        <KPICard title="Anomalies" value={anomalies.length} icon={Activity} />
        <KPICard title="Model Runtime" value="Healthy" icon={Cpu} />
      </div>

      <div className="bg-white rounded-xl border border-neutral-200 p-6">
        <h2 className="text-xl font-bold mb-4">ML Engineering Priorities</h2>
        <div className="space-y-3">
          {anomalies.map((anomaly, idx) => (
            <PolicyRecommendation
              key={`${anomaly.type || "anomaly"}-${idx}`}
              title={anomaly.type || "Anomaly"}
              message={anomaly.message}
              action={anomaly.action}
              priority={anomaly.severity === "high" ? "high" : "medium"}
            />
          ))}
          {!anomalies.length ? (
            <PolicyRecommendation
              title="Stability"
              message="No active anomalies detected. Continue monitoring calibration and fallback rates."
              action="Review weekly model report"
              priority="low"
            />
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default MLEngineerDashboard;
