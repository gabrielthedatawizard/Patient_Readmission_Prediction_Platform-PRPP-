import { Building2, MapPin, TrendingDown, Users } from "lucide-react";
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

// Persona: Regional Health Management Team
// JTBD: "How is my region performing vs. others?"
// Mental model: Score card reviewer. Ranked list + trend.

export const RHMTDashboard = ({ region = "" }) => {
  const { currentScope, scopeLabel } = useWorkspace();
  const { data: kpis, loading, error, refresh } = useDashboardData(
    "/analytics/national/kpis?days=30",
    240000,
  );
  const { data: rankings } = useDashboardData("/analytics/facility-rankings?days=30", 240000);

  if (loading && !kpis) return <DashboardSkeleton cards={3} />;
  if (error && !kpis) return <ErrorState error={error} onRetry={refresh} />;

  const regionName = currentScope.regionName || region || currentScope.regionCode || scopeLabel.title;
  const readmissionRate = Number(kpis?.readmissionRate || 0);
  const readmissionVariant = readmissionRate > 12 ? "danger" : readmissionRate > 8 ? "warning" : "success";

  return (
    <DashboardLayout
      title="Regional Dashboard"
      subtitle={`Regional Health Management Team — ${regionName}`}
      headerActions={
        <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 dark:bg-teal-950/50 px-3 py-1.5 text-xs font-semibold text-teal-700 dark:text-teal-300">
          <MapPin className="w-3.5 h-3.5" />
          {regionName}
        </span>
      }
      kpis={[
        <KPICard
          key="readmission"
          title="Regional Readmission"
          value={`${readmissionRate.toFixed(1)}%`}
          trend={{ value: 1.2, direction: "down", isGood: true }}
          icon={TrendingDown}
          footer={readmissionRate > 8 ? "Above national target" : "Within target"}
          variant={readmissionVariant}
        />,
        <KPICard
          key="patients"
          title="Patients in Scope"
          value={Number(kpis?.totalPatients || 0).toLocaleString()}
          icon={Users}
          footer="30-day rolling window"
          variant="default"
        />,
        <KPICard
          key="facilities"
          title="Facilities Reporting"
          value={String(kpis?.activeFacilities || 0)}
          subtitle={`of ${kpis?.totalFacilities || 0}`}
          icon={Building2}
          footer={`${kpis?.totalFacilities ? Math.round((Number(kpis?.activeFacilities || 0) / Number(kpis?.totalFacilities)) * 100) : 0}% adoption`}
          variant="info"
        />,
      ]}
    >
      <DashboardSection
        title="Regional Facility Ranking"
        subtitle={`${(rankings?.all || []).length} facilities in ranking`}
        headerActions={
          <MapPin className="w-5 h-5 text-teal-600 dark:text-teal-400" />
        }
      >
        {(rankings?.all || []).length ? (
          <FacilityRankingTable facilities={rankings?.all || []} />
        ) : (
          <EmptyState
            message={`No facility ranking data is visible for ${regionName}. Import a hierarchy snapshot or switch to a scope with reporting facilities.`}
          />
        )}
      </DashboardSection>
    </DashboardLayout>
  );
};

export default RHMTDashboard;
