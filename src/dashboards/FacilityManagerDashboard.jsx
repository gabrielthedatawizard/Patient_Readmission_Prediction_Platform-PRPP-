import { Activity, AlertTriangle, ClipboardCheck, Users } from "lucide-react";
import {
  DashboardSkeleton,
  ErrorState,
  KPICard,
  PolicyRecommendation,
  DashboardLayout,
  DashboardSection,
  EmptyState,
} from "../components/dashboards";
import { useDashboardData } from "../hooks/useDashboardData";

// Persona: Facility Manager
// JTBD: "Is my facility performing within targets, and what needs escalation?"
// Mental model: Operations controller. Benchmark + trend = context.

export const FacilityManagerDashboard = ({ facilityId = "" }) => {
  const facilityQuery = facilityId ? `?facilityId=${encodeURIComponent(facilityId)}&days=30` : "?days=30";
  const { data: kpis, loading, error, refresh } = useDashboardData(`/analytics/dashboard${facilityQuery}`, 180000);
  const { data: anomalies } = useDashboardData(
    `/analytics/anomalies${facilityId ? `?facilityId=${encodeURIComponent(facilityId)}` : ""}`,
    180000,
  );

  if (loading && !kpis) return <DashboardSkeleton cards={4} />;
  if (error && !kpis) return <ErrorState error={error} onRetry={refresh} />;

  const anomaliesList = anomalies?.anomalies || [];
  const highAnomalies = anomaliesList.filter((a) => a.severity === "high");

  const readmissionRate = Number(kpis?.readmissionRate || 0);
  const interventionRate = Number(kpis?.interventionRate || 0);

  // Tip 1: Semantic variants based on operational thresholds
  const readmissionVariant = readmissionRate > 12 ? "danger" : readmissionRate > 8 ? "warning" : "success";
  const interventionVariant = interventionRate > 80 ? "success" : interventionRate > 60 ? "warning" : "danger";

  return (
    <DashboardLayout
      title="Facility Operations"
      subtitle="Operational performance and care quality monitoring — last 30 days"
      kpis={[
        <KPICard
          key="readmission"
          title="Readmission Rate"
          value={`${readmissionRate.toFixed(1)}%`}
          icon={Activity}
          footer={readmissionRate > 8 ? "Above national target of 7.5%" : "Within national target"}
          variant={readmissionVariant}
        />,
        <KPICard
          key="high_risk"
          title="High-Risk Patients"
          value={Number(kpis?.highRiskCount || 0).toLocaleString()}
          icon={AlertTriangle}
          footer="Requiring active intervention"
          variant="warning"
        />,
        <KPICard
          key="intervention"
          title="Intervention Completion"
          value={`${interventionRate.toFixed(1)}%`}
          icon={ClipboardCheck}
          footer={interventionRate > 80 ? "On target" : "Below 80% completion target"}
          variant={interventionVariant}
        />,
        <KPICard
          key="patients"
          title="Patients in Window"
          value={Number(kpis?.totalPatients || 0).toLocaleString()}
          icon={Users}
          footer="30-day rolling window"
          variant="default"
        />,
      ]}
    >
      {/* Critical signal: show escalation count prominently if any */}
      {highAnomalies.length > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/20 px-4 py-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
          <p className="text-sm font-semibold text-rose-800 dark:text-rose-300">
            {highAnomalies.length} critical escalation{highAnomalies.length > 1 ? "s" : ""} require immediate attention.
          </p>
        </div>
      )}

      <DashboardSection
        title="Escalations & Actions"
        subtitle={anomaliesList.length ? `${anomaliesList.length} active signal${anomaliesList.length > 1 ? "s" : ""}` : "No active escalations"}
      >
        {anomaliesList.length ? (
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
          </div>
        ) : (
          <EmptyState message="No active escalations. All operational signals are within normal range." />
        )}
      </DashboardSection>
    </DashboardLayout>
  );
};

export default FacilityManagerDashboard;
