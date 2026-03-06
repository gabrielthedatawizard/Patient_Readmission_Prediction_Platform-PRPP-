import { Activity, AlertTriangle, ClipboardCheck, Users } from "lucide-react";
import { DashboardSkeleton, ErrorState, KPICard, PolicyRecommendation } from "../components/dashboards";
import { useDashboardData } from "../hooks/useDashboardData";

export const FacilityManagerDashboard = ({ facilityId = "" }) => {
  const facilityQuery = facilityId ? `?facilityId=${encodeURIComponent(facilityId)}&days=30` : "?days=30";
  const { data: kpis, loading, error, refresh } = useDashboardData(`/analytics/dashboard${facilityQuery}`, 180000);
  const { data: anomalies } = useDashboardData(`/analytics/anomalies${facilityId ? `?facilityId=${encodeURIComponent(facilityId)}` : ""}`, 180000);

  if (loading && !kpis) {
    return <DashboardSkeleton cards={4} />;
  }
  if (error && !kpis) {
    return <ErrorState error={error} onRetry={refresh} />;
  }

  const anomaliesList = anomalies?.anomalies || [];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-neutral-900">Facility Operations Dashboard</h1>
        <p className="text-neutral-600 mt-1">Operational performance and care quality monitoring</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Readmission Rate" value={`${Number(kpis?.readmissionRate || 0).toFixed(1)}%`} icon={Activity} />
        <KPICard title="High-Risk Patients" value={Number(kpis?.highRiskCount || 0).toLocaleString()} icon={AlertTriangle} />
        <KPICard title="Intervention Completion" value={`${Number(kpis?.interventionRate || 0).toFixed(1)}%`} icon={ClipboardCheck} />
        <KPICard title="Patients in Window" value={Number(kpis?.totalPatients || 0).toLocaleString()} icon={Users} />
      </div>

      <div className="bg-white rounded-xl border border-neutral-200 p-6">
        <h2 className="text-xl font-bold mb-4">Escalations and Actions</h2>
        <div className="space-y-3">
          {anomaliesList.map((item, idx) => (
            <PolicyRecommendation
              key={`${item.type || "anomaly"}-${idx}`}
              title={item.type || "Signal"}
              message={item.message}
              action={item.action}
              priority={item.severity === "high" ? "high" : "medium"}
            />
          ))}
          {!anomaliesList.length ? <p className="text-sm text-neutral-600">No active escalations.</p> : null}
        </div>
      </div>
    </div>
  );
};

export default FacilityManagerDashboard;
