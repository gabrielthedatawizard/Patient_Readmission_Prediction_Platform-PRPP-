import { Download, Map, RefreshCw, TrendingDown, Users, Activity, AlertCircle } from "lucide-react";
import {
  KPICard,
  TanzaniaRegionalMap,
  FacilityRankingTable,
  PolicyRecommendation,
  DashboardSkeleton,
  ErrorState,
} from "../components/dashboards";
import { useDashboardData } from "../hooks/useDashboardData";
import { useWorkspace } from "../context/WorkspaceProvider";

export const MoHNationalDashboard = () => {
  const { scopeLabel } = useWorkspace();
  const { data: kpis, loading, error, lastRefresh, refresh } = useDashboardData(
    "/analytics/national/kpis?days=30",
    300000,
  );
  const { data: regionalData } = useDashboardData("/analytics/regional-performance?days=30", 300000);
  const { data: facilityRankings } = useDashboardData("/analytics/facility-rankings?days=30", 300000);
  const { data: policyRecs } = useDashboardData("/analytics/policy-recommendations?days=30", 300000);

  if (loading && !kpis) {
    return <DashboardSkeleton />;
  }

  if (error && !kpis) {
    return <ErrorState error={error} onRetry={refresh} />;
  }

  const metrics = {
    readmissionRate: Number(kpis?.readmissionRate || 0),
    activeFacilities: Number(kpis?.activeFacilities || 0),
    totalFacilities: Number(kpis?.totalFacilities || 0),
    highRiskCount: Number(kpis?.highRiskCount || 0),
    livesSaved: Number(kpis?.livesSaved || 0),
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">National Dashboard</h1>
          <p className="text-neutral-600 mt-1">
            Tanzania Readmission Intelligence Platform - {scopeLabel.title}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={refresh}
            className="flex items-center gap-2 px-4 py-2 border border-neutral-300 rounded-lg hover:bg-neutral-50"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700">
            <Download className="w-4 h-4" />
            Export Report
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="National Readmission Rate"
          value={`${metrics.readmissionRate.toFixed(1)}%`}
          trend={{ value: 2.3, direction: "down", isGood: true }}
          icon={TrendingDown}
          footer="Target: 7.5% by Dec 2026"
        />
        <KPICard
          title="Facilities Using TRIP"
          value={`${metrics.activeFacilities} / ${metrics.totalFacilities}`}
          subtitle={`${metrics.totalFacilities ? Math.round((metrics.activeFacilities / metrics.totalFacilities) * 100) : 0}% adoption`}
          icon={Activity}
          footer="Across all regions"
        />
        <KPICard
          title="High-Risk Patients (30 days)"
          value={metrics.highRiskCount.toLocaleString()}
          icon={AlertCircle}
          footer="Nationwide, requiring intervention"
        />
        <KPICard
          title="Lives Saved (Estimated)"
          value={metrics.livesSaved.toLocaleString()}
          trend={{ value: 12, direction: "up", isGood: true }}
          icon={Users}
          footer="Since Jan 2026"
        />
      </div>

      <div className="bg-white rounded-xl border border-neutral-200 p-6">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Map className="w-6 h-6 text-teal-600" />
          Regional Performance Map
        </h2>
        <TanzaniaRegionalMap data={regionalData?.regions || []} />
      </div>

      <div className="bg-white rounded-xl border border-neutral-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Top and Bottom Performing Facilities</h2>
          <button className="text-teal-600 hover:text-teal-700 text-sm font-medium">View Full Report</button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold text-green-700 mb-3">Best Performing (Lowest Readmission Rates)</h3>
            <FacilityRankingTable facilities={facilityRankings?.top || []} variant="success" />
          </div>
          <div>
            <h3 className="font-semibold text-red-700 mb-3">Needs Support (Highest Readmission Rates)</h3>
            <FacilityRankingTable facilities={facilityRankings?.bottom || []} variant="danger" />
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-teal-50 to-blue-50 rounded-xl border border-teal-200 p-6">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Activity className="w-6 h-6 text-teal-600" />
          AI-Generated Policy Recommendations
        </h2>
        <div className="space-y-4">
          {(policyRecs?.recommendations || []).map((rec, idx) => (
            <PolicyRecommendation key={`${rec.title || "rec"}-${idx}`} {...rec} />
          ))}
          {!(policyRecs?.recommendations || []).length ? (
            <p className="text-sm text-neutral-600">No policy recommendations available right now.</p>
          ) : null}
        </div>
      </div>

      <div className="text-sm text-neutral-500 text-center">Last updated: {lastRefresh.toLocaleString("sw-TZ")}</div>
    </div>
  );
};

export default MoHNationalDashboard;
