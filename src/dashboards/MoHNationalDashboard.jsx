import { Download, Map, RefreshCw, TrendingDown, Users, Activity, AlertCircle, Clock } from "lucide-react";
import {
  KPICard,
  TanzaniaRegionalMap,
  FacilityRankingTable,
  PolicyRecommendation,
  DashboardSkeleton,
  ErrorState,
  EmptyState,
  DashboardLayout,
  DashboardSection,
} from "../components/dashboards";
import { useDashboardData } from "../hooks/useDashboardData";
import { useWorkspace } from "../context/WorkspaceProvider";

// Persona: Ministry of Health — National Level
// JTBD: "What is the national readmission picture, and where do I intervene?"
// Mental model: Policy maker. Map + ranking + AI recommendations.
// Device: Desktop, boardroom-ready.

export const MoHNationalDashboard = () => {
  const { scopeLabel } = useWorkspace();
  const { data: kpis, loading, error, lastRefresh, refresh } = useDashboardData(
    "/analytics/national/kpis?days=30",
    300000,
  );
  const { data: regionalData } = useDashboardData("/analytics/regional-performance?days=30", 300000);
  const { data: facilityRankings } = useDashboardData("/analytics/facility-rankings?days=30", 300000);
  const { data: policyRecs } = useDashboardData("/analytics/policy-recommendations?days=30", 300000);

  if (loading && !kpis) return <DashboardSkeleton />;
  if (error && !kpis) return <ErrorState error={error} onRetry={refresh} />;

  const metrics = {
    readmissionRate: Number(kpis?.readmissionRate || 0),
    activeFacilities: Number(kpis?.activeFacilities || 0),
    totalFacilities: Number(kpis?.totalFacilities || 0),
    highRiskCount: Number(kpis?.highRiskCount || 0),
    livesSaved: Number(kpis?.livesSaved || 0),
  };

  const readmissionVariant = metrics.readmissionRate > 10 ? "danger" : metrics.readmissionRate > 7.5 ? "warning" : "success";

  return (
    <DashboardLayout
      title="National Dashboard"
      subtitle={`Tanzania Readmission Intelligence Platform — ${scopeLabel.title}`}
      headerActions={
        <div className="flex items-center gap-2 flex-wrap">
          {/* Last updated badge */}
          <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-neutral-500 dark:text-slate-400">
            <Clock className="w-3 h-3" />
            {lastRefresh.toLocaleString("sw-TZ")}
          </span>
          <button
            onClick={refresh}
            className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-medium text-neutral-700 dark:text-slate-200 shadow-sm hover:bg-neutral-50 dark:hover:bg-slate-700 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
          <button className="inline-flex items-center gap-2 rounded-lg bg-teal-600 hover:bg-teal-700 px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors">
            <Download className="w-3.5 h-3.5" />
            Export Report
          </button>
        </div>
      }
      kpis={[
        <KPICard
          key="readmission"
          title="National Readmission Rate"
          value={`${metrics.readmissionRate.toFixed(1)}%`}
          trend={{ value: 2.3, direction: "down", isGood: true }}
          icon={TrendingDown}
          footer="Target: 7.5% by Dec 2026"
          variant={readmissionVariant}
        />,
        <KPICard
          key="facilities"
          title="Facilities Using TRIP"
          value={`${metrics.activeFacilities} / ${metrics.totalFacilities}`}
          subtitle={`${metrics.totalFacilities ? Math.round((metrics.activeFacilities / metrics.totalFacilities) * 100) : 0}% adoption`}
          icon={Activity}
          footer="Across all regions"
          variant="info"
        />,
        <KPICard
          key="high_risk"
          title="High-Risk Patients (30d)"
          value={metrics.highRiskCount.toLocaleString()}
          icon={AlertCircle}
          footer="Nationwide, requiring intervention"
          variant="warning"
        />,
        <KPICard
          key="lives"
          title="Lives Saved (Est.)"
          value={metrics.livesSaved.toLocaleString()}
          trend={{ value: 12, direction: "up", isGood: true }}
          icon={Users}
          footer="Since Jan 2026"
          variant="success"
        />,
      ]}
    >
      {/* Regional Map */}
      <DashboardSection
        title="Regional Performance Map"
        headerActions={
          <Map className="w-5 h-5 text-teal-600 dark:text-teal-400" />
        }
      >
        <TanzaniaRegionalMap data={regionalData?.regions || []} />
      </DashboardSection>

      {/* Facility Rankings — top + bottom in visually differentiated columns */}
      <DashboardSection
        title="Top & Bottom Performing Facilities"
        headerActions={
          <button className="text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 text-xs font-semibold transition-colors">
            View Full Report
          </button>
        }
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-3">
              Best Performing (Lowest Readmission)
            </h3>
            <FacilityRankingTable facilities={facilityRankings?.top || []} variant="success" />
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-rose-600 dark:text-rose-400 mb-3">
              Needs Support (Highest Readmission)
            </h3>
            <FacilityRankingTable facilities={facilityRankings?.bottom || []} variant="danger" />
          </div>
        </div>
      </DashboardSection>

      {/* AI Policy Recommendations — no gradient background (forbidden per agent rules) */}
      <DashboardSection
        title="AI-Generated Policy Recommendations"
        headerActions={
          <Activity className="w-5 h-5 text-teal-600 dark:text-teal-400" />
        }
      >
        {(policyRecs?.recommendations || []).length ? (
          <div className="space-y-3">
            {(policyRecs?.recommendations || []).map((rec, idx) => (
              <PolicyRecommendation key={`${rec.title || "rec"}-${idx}`} {...rec} />
            ))}
          </div>
        ) : (
          <EmptyState message="No policy recommendations available right now." />
        )}
      </DashboardSection>
    </DashboardLayout>
  );
};

export default MoHNationalDashboard;
