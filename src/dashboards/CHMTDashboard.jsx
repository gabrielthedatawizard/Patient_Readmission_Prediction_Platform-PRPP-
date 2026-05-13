import { Building2, ClipboardList, MapPin, TrendingUp, Users } from "lucide-react";
import {
  DashboardSkeleton,
  EmptyState,
  ErrorState,
  FacilityRankingTable,
  KPICard,
  DashboardLayout,
  DashboardSection,
} from "../components/dashboards";
import { useDashboardData } from "../hooks/useDashboardData";
import { useWorkspace } from "../context/WorkspaceProvider";

// Persona: Council Health Management Team
// JTBD: "How is my district performing vs. targets, and which facilities need support?"
// Mental model: Score card reviewer. Ranked list + trend.

export const CHMTDashboard = ({ district = "" }) => {
  const { currentScope, scopeLabel } = useWorkspace();
  const { data: kpis, loading, error, refresh } = useDashboardData(
    "/analytics/national/kpis?days=30",
    240000,
  );
  const { data: facilities } = useDashboardData("/analytics/facility-rankings?days=30", 240000);

  if (loading && !kpis) return <DashboardSkeleton cards={4} />;
  if (error && !kpis) return <ErrorState error={error} onRetry={refresh} />;

  const readmissionRate = Number(kpis?.readmissionRate || 0);
  const interventionRate = Number(kpis?.interventionRate || 0);
  const readmissionVariant = readmissionRate > 12 ? "danger" : readmissionRate > 8 ? "warning" : "success";
  const interventionVariant = interventionRate > 80 ? "success" : interventionRate > 60 ? "warning" : "danger";

  const scopeName = currentScope.district || district || scopeLabel.title;

  return (
    <DashboardLayout
      title="District Dashboard"
      subtitle={`Council Health Management Team — ${scopeName}`}
      headerActions={
        <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 dark:bg-teal-950/50 px-3 py-1.5 text-xs font-semibold text-teal-700 dark:text-teal-300">
          <MapPin className="w-3.5 h-3.5" />
          {scopeName}
        </span>
      }
      kpis={[
        <KPICard
          key="readmission"
          title="Readmission Rate"
          value={`${readmissionRate.toFixed(1)}%`}
          icon={TrendingUp}
          footer={readmissionRate > 8 ? "Above national target" : "Within target"}
          variant={readmissionVariant}
        />,
        <KPICard
          key="high_risk"
          title="High-Risk Cases"
          value={Number(kpis?.highRiskCount || 0).toLocaleString()}
          icon={Users}
          footer="Across all facilities in district"
          variant="warning"
        />,
        <KPICard
          key="facilities"
          title="Facilities"
          value={String(kpis?.activeFacilities || 0)}
          icon={Building2}
          footer={`of ${kpis?.totalFacilities || 0} total`}
          variant="info"
        />,
        <KPICard
          key="intervention"
          title="Intervention Rate"
          value={`${interventionRate.toFixed(1)}%`}
          icon={ClipboardList}
          footer={interventionRate > 80 ? "On target" : "Below 80% target"}
          variant={interventionVariant}
        />,
      ]}
    >
      <DashboardSection
        title="Facility Performance in District"
        subtitle={`${(facilities?.all || []).length} facilities reporting`}
      >
        {(facilities?.all || []).length ? (
          <FacilityRankingTable facilities={facilities?.all || []} />
        ) : (
          <EmptyState
            message={`No facility performance data is visible for ${scopeName}. Import a hierarchy snapshot or switch to a district with reporting facilities.`}
          />
        )}
      </DashboardSection>
    </DashboardLayout>
  );
};

export default CHMTDashboard;
