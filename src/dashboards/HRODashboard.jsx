import { AlertTriangle, Database, ShieldCheck } from "lucide-react";
import { DashboardSkeleton, ErrorState, KPICard, PolicyRecommendation } from "../components/dashboards";
import { useDashboardData } from "../hooks/useDashboardData";

export const HRODashboard = ({ facilityId = "" }) => {
  const facilityQuery = facilityId ? `?facilityId=${encodeURIComponent(facilityId)}` : "";
  const { data: qualityData, loading, error, refresh } = useDashboardData(`/analytics/quality${facilityQuery}`, 180000);
  const { data: fairnessData } = useDashboardData(`/analytics/fairness${facilityQuery}`, 180000);

  if (loading && !qualityData) {
    return <DashboardSkeleton cards={3} />;
  }

  if (error && !qualityData) {
    return <ErrorState error={error} onRetry={refresh} />;
  }

  const quality = qualityData?.quality || {};
  const fairness = fairnessData?.fairness || {};

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-neutral-900">Data Quality Dashboard</h1>
        <p className="text-neutral-600 mt-1">Health records completeness, consistency, and fairness oversight</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KPICard
          title="Critical Field Completeness"
          value={`${Math.round(Number(quality.criticalFieldCompleteness || 0) * 100)}%`}
          icon={Database}
        />
        <KPICard title="Patient Records" value={Number(quality.patientCount || 0).toLocaleString()} icon={ShieldCheck} />
        <KPICard title="Fairness Variance" value={`${Number(fairness.variance || 0).toFixed(1)}`} icon={AlertTriangle} />
      </div>

      <div className="bg-white rounded-xl border border-neutral-200 p-6">
        <h2 className="text-xl font-bold mb-4">Data Stewardship Actions</h2>
        <div className="space-y-3">
          <PolicyRecommendation
            title="Completeness Enforcement"
            message="Prioritize records with missing contact details and key labs before discharge review."
            action="Run Data Quality Sweep"
            priority={quality.qualityStatus === "alert" ? "high" : "medium"}
          />
          <PolicyRecommendation
            title="Fairness Monitoring"
            message="Review group-level prediction differences and confirm no structural bias in data capture."
            action="Open Fairness Report"
            priority={fairness.fairnessStatus === "alert" ? "high" : "medium"}
          />
        </div>
      </div>
    </div>
  );
};

export default HRODashboard;
