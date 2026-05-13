import { AlertTriangle, Database, ShieldCheck } from "lucide-react";
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

// Persona: Health Records Officer
// JTBD: "Is our data complete enough to trust AI predictions?"
// Mental model: Data auditor. Completeness % is the primary signal.

export const HRODashboard = ({ facilityId = "" }) => {
  const facilityQuery = facilityId ? `?facilityId=${encodeURIComponent(facilityId)}` : "";
  const { data: qualityData, loading, error, refresh } = useDashboardData(`/analytics/quality${facilityQuery}`, 180000);
  const { data: fairnessData } = useDashboardData(`/analytics/fairness${facilityQuery}`, 180000);

  if (loading && !qualityData) return <DashboardSkeleton cards={3} />;
  if (error && !qualityData) return <ErrorState error={error} onRetry={refresh} />;

  const quality = qualityData?.quality || {};
  const fairness = fairnessData?.fairness || {};

  const completeness = Math.round(Number(quality.criticalFieldCompleteness || 0) * 100);
  const fairnessVariance = Number(fairness.variance || 0);

  // Tip 1: Semantic variants driven by data quality thresholds
  const completenessVariant = completeness >= 90 ? "success" : completeness >= 75 ? "warning" : "danger";
  const fairnessVariant = fairnessVariance > 10 ? "danger" : fairnessVariance > 5 ? "warning" : "success";

  return (
    <DashboardLayout
      title="Data Quality Dashboard"
      subtitle="Health records completeness, consistency, and fairness oversight"
      kpis={[
        <KPICard
          key="completeness"
          title="Critical Field Completeness"
          value={`${completeness}%`}
          icon={Database}
          footer={completeness >= 90 ? "Within target" : "Below 90% target — action required"}
          variant={completenessVariant}
        />,
        <KPICard
          key="records"
          title="Patient Records"
          value={Number(quality.patientCount || 0).toLocaleString()}
          icon={ShieldCheck}
          footer="Total records in scope"
          variant="default"
        />,
        <KPICard
          key="fairness"
          title="Fairness Variance"
          value={`${fairnessVariance.toFixed(1)}`}
          icon={AlertTriangle}
          footer={fairnessVariance > 10 ? "Variance exceeds threshold" : "Within acceptable range"}
          variant={fairnessVariant}
        />,
      ]}
    >
      <DashboardSection
        title="Data Stewardship Actions"
        subtitle="Priority actions to improve prediction reliability"
      >
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
          {completeness < 75 && (
            <PolicyRecommendation
              title="Critical: Completeness Below 75%"
              message={`Current completeness is ${completeness}%. Predictions may be unreliable until critical fields are populated across ward admissions.`}
              action="Review Missing Fields"
              priority="high"
            />
          )}
        </div>
      </DashboardSection>

      {!quality.patientCount && (
        <EmptyState message="No quality data is available. Ensure the analytics pipeline is connected and processing records." />
      )}
    </DashboardLayout>
  );
};

export default HRODashboard;
