import { Download, RefreshCw, TrendingDown, Users, Activity, AlertCircle } from "lucide-react";
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
  RadialUrgency,
  ClinicalScatter,
} from "../components/dashboards";
import { useDashboardData } from "../hooks/useDashboardData";
import { useWorkspace } from "../context/WorkspaceProvider";
import { useAuth } from "../context/AuthProvider";
import { useI18n } from "../context/I18nProvider";

// Persona: Ministry of Health — National Level
// JTBD: "What is the national readmission picture, and where do I intervene?"
// Mental model: Policy maker. Map + ranking + AI recommendations.
// Device: Desktop, boardroom-ready.

export const MoHNationalDashboard = () => {
  const { scopeLabel } = useWorkspace();
  const { currentUser } = useAuth();
  const { language } = useI18n();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return language === "sw" ? "Habari za asubuhi" : "Good Morning";
    if (hour < 17) return language === "sw" ? "Habari za mchana" : "Good Afternoon";
    return language === "sw" ? "Habari za jioni" : "Good Evening";
  };

  const firstName = currentUser?.fullName?.split(" ")[0] || "";
  const personalizedTitle = `${getGreeting()}, ${firstName}`;
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
      isBento={true}
      title={personalizedTitle}
      subtitle={`Tanzania Readmission Intelligence Platform — ${scopeLabel.title}`}
      headerActions={
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Inference Cycle</span>
            <span className="text-xs font-bold text-slate-900 dark:text-white tabular-nums">{lastRefresh.toLocaleTimeString()}</span>
          </div>
          <button
            onClick={refresh}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 hover:text-teal-600 transition-all hover:scale-105"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button className="flex items-center gap-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-5 py-2.5 text-sm font-black transition-all hover:translate-y-[-2px] shadow-lg shadow-slate-200 dark:shadow-none">
            <Download className="w-4 h-4" />
            Export Data
          </button>
        </div>
      }
    >
      {/* Strategic KPIs (Bento Top) */}
      <div className="col-span-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          key="readmission"
          label="National Rate"
          value={`${metrics.readmissionRate.toFixed(1)}%`}
          trend="2.3%"
          trendDirection="down"
          icon={TrendingDown}
          footer="Target: 7.5%"
          variant={readmissionVariant}
          sparklineData={[12, 11.5, 10.8, 10.2, 9.8, 9.5, 8.9]}
        />
        <KPICard
          key="facilities"
          label="Digitization"
          value={`${Math.round((metrics.activeFacilities / metrics.totalFacilities) * 100)}%`}
          icon={Activity}
          footer={`${metrics.activeFacilities} Live Facilities`}
          variant="info"
          sparklineData={[30, 35, 45, 50, 65, 70, 85]}
        />
        <KPICard
          key="high_risk"
          label="Escalations"
          value={metrics.highRiskCount.toLocaleString()}
          icon={AlertCircle}
          footer="Active Hotspots"
          variant="warning"
          sparklineData={[50, 60, 45, 70, 65, 80, 75]}
        />
        <KPICard
          key="lives"
          label="Clinical Impact"
          value={metrics.livesSaved.toLocaleString()}
          trend="12%"
          trendDirection="up"
          icon={Users}
          footer="Est. Lives Saved"
          variant="success"
          sparklineData={[10, 25, 45, 60, 85, 110, 140]}
        />
      </div>

      {/* Primary Intelligence Area (Bento Left) */}
      <div className="col-span-12 lg:col-span-8 space-y-6">
        <DashboardSection
          title="Regional Performance Map"
          subtitle="Spatial distribution of readmission clusters"
        >
          <TanzaniaRegionalMap data={regionalData?.regions || []} />
        </DashboardSection>

        <DashboardSection
          title="Facility Benchmarking"
          subtitle="Outliers and gold-standard providers"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1.5 h-4 bg-emerald-500 rounded-full" />
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Precision Leaders</h3>
              </div>
              <FacilityRankingTable facilities={facilityRankings?.top || []} variant="success" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1.5 h-4 bg-rose-500 rounded-full" />
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Support Required</h3>
              </div>
              <FacilityRankingTable facilities={facilityRankings?.bottom || []} variant="danger" />
            </div>
          </div>
        </DashboardSection>
      </div>

      {/* Strategic Sidebar (Bento Right) */}
      <div className="col-span-12 lg:col-span-4 space-y-6">
        <DashboardSection
          title="Target Calculus"
          subtitle="Progress towards 7.5% milestone"
        >
          <div className="flex justify-center py-8">
            <RadialUrgency 
              value={metrics.readmissionRate > 0 ? Math.round((7.5 / metrics.readmissionRate) * 100) : 0} 
              variant={readmissionVariant}
              label="Milestone"
            />
          </div>
          <div className="mt-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Population Risk Density</p>
             <ClinicalScatter data={Array.from({ length: Math.round(metrics.highRiskCount / 100) })} color="rose" />
             <p className="text-[9px] font-bold text-slate-400 mt-3 italic text-center">Each dot represents ~100 high-risk clinical events.</p>
          </div>
        </DashboardSection>

        <DashboardSection
          title="AI Recommendations"
          subtitle="Policy intervention vectors"
        >
          {(policyRecs?.recommendations || []).length ? (
            <div className="space-y-3">
              {(policyRecs?.recommendations || []).map((rec, idx) => (
                <PolicyRecommendation key={idx} {...rec} />
              ))}
            </div>
          ) : (
            <EmptyState message="Calculating policy trajectories..." />
          )}
        </DashboardSection>
      </div>
    </DashboardLayout>
  );
};

export default MoHNationalDashboard;
