import { Building2, MapPin, TrendingDown, Users } from "lucide-react";
import { DashboardSkeleton, ErrorState, FacilityRankingTable, KPICard } from "../components/dashboards";
import { useDashboardData } from "../hooks/useDashboardData";

export const RHMTDashboard = ({ region = "" }) => {
  const regionQuery = region ? `&region=${encodeURIComponent(region)}` : "";
  const { data: kpis, loading, error, refresh } = useDashboardData(
    `/analytics/national/kpis?days=30${regionQuery}`,
    240000,
  );
  const { data: rankings } = useDashboardData(`/analytics/facility-rankings?days=30${regionQuery}`, 240000);

  if (loading && !kpis) {
    return <DashboardSkeleton cards={3} />;
  }
  if (error && !kpis) {
    return <ErrorState error={error} onRetry={refresh} />;
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-neutral-900">Regional Dashboard</h1>
        <p className="text-neutral-600 mt-1">Regional Health Management Team view {region ? `- ${region}` : ""}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KPICard
          title="Regional Readmission"
          value={`${Number(kpis?.readmissionRate || 0).toFixed(1)}%`}
          trend={{ value: 1.2, direction: "down", isGood: true }}
          icon={TrendingDown}
        />
        <KPICard title="Patients in Scope" value={Number(kpis?.totalPatients || 0).toLocaleString()} icon={Users} />
        <KPICard
          title="Facilities Reporting"
          value={String(kpis?.activeFacilities || 0)}
          subtitle={`of ${kpis?.totalFacilities || 0}`}
          icon={Building2}
        />
      </div>

      <div className="bg-white rounded-xl border border-neutral-200 p-6">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-teal-600" />
          Regional Facility Ranking
        </h2>
        <FacilityRankingTable facilities={rankings?.all || []} />
      </div>
    </div>
  );
};

export default RHMTDashboard;
