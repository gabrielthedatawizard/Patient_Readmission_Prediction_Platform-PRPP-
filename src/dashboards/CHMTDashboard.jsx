import { Building2, ClipboardList, TrendingUp, Users } from "lucide-react";
import { DashboardSkeleton, EmptyState, ErrorState, FacilityRankingTable, KPICard } from "../components/dashboards";
import { useDashboardData } from "../hooks/useDashboardData";
import { useWorkspace } from "../context/WorkspaceProvider";

export const CHMTDashboard = ({ district = "" }) => {
  const { currentScope, scopeLabel } = useWorkspace();
  const { data: kpis, loading, error, refresh } = useDashboardData(
    "/analytics/national/kpis?days=30",
    240000,
  );
  const { data: facilities } = useDashboardData("/analytics/facility-rankings?days=30", 240000);

  if (loading && !kpis) {
    return <DashboardSkeleton cards={3} />;
  }
  if (error && !kpis) {
    return <ErrorState error={error} onRetry={refresh} />;
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-neutral-900">District Dashboard</h1>
        <p className="text-neutral-600 mt-1">
          Council Health Management Team - {currentScope.district || district || scopeLabel.title}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Readmission" value={`${Number(kpis?.readmissionRate || 0).toFixed(1)}%`} icon={TrendingUp} />
        <KPICard title="High-Risk Cases" value={Number(kpis?.highRiskCount || 0).toLocaleString()} icon={Users} />
        <KPICard title="Facilities" value={String(kpis?.activeFacilities || 0)} icon={Building2} />
        <KPICard title="Intervention Rate" value={`${Number(kpis?.interventionRate || 0).toFixed(1)}%`} icon={ClipboardList} />
      </div>

      <div className="bg-white rounded-xl border border-neutral-200 p-6">
        <h2 className="text-xl font-bold mb-4">Facility Performance in District</h2>
        {(facilities?.all || []).length ? (
          <FacilityRankingTable facilities={facilities?.all || []} />
        ) : (
          <EmptyState
            message={`No facility performance data is visible for ${
              currentScope.district || district || scopeLabel.title
            }. Import a hierarchy snapshot or switch to a district with reporting facilities.`}
          />
        )}
      </div>
    </div>
  );
};

export default CHMTDashboard;
