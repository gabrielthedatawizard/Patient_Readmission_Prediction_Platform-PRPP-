import { useMemo, useState } from "react";
import { Activity, AlertTriangle, CheckCircle, Users } from "lucide-react";
import {
  DashboardSkeleton,
  EmptyState,
  ErrorState,
  FilterPills,
  KPICard,
  PatientListTable,
  DashboardLayout,
  DashboardSection,
} from "../components/dashboards";
import { useDashboardData } from "../hooks/useDashboardData";
import { useI18n } from "../context/I18nProvider";

function normalizePatientPrediction(patient) {
  const prediction = patient.prediction || patient.latestPrediction || null;
  return {
    ...patient,
    prediction,
    riskScore: prediction?.score ?? patient.riskScore ?? 0,
    riskTier: prediction?.tier ?? patient.riskTier ?? "Low",
    dischargeReady: Boolean(patient.dischargeReady || Number(prediction?.score || 0) < 40),
    pendingTasks: Number(patient.pendingTasks || 0),
  };
}

export const ClinicianDashboard = ({ clinicianId, onOpenPatient, onStartDischarge }) => {
  const { language } = useI18n();
  const [viewFilter, setViewFilter] = useState("all");

  const { data: patientsResponse, loading, error, refresh } = useDashboardData(
    `/patients?assignedTo=${encodeURIComponent(clinicianId || "self")}&include=predictions,tasks`,
    120000,
  );
  const { data: recentPredictions } = useDashboardData(
    `/predictions/recent?clinicianId=${encodeURIComponent(clinicianId || "self")}&limit=10`,
    120000,
  );

  const myPatients = useMemo(
    () => (patientsResponse?.patients || []).map((patient) => normalizePatientPrediction(patient)),
    [patientsResponse?.patients],
  );

  const prioritizedPatients = useMemo(() => {
    const sorted = [...myPatients].sort((a, b) => Number(b.riskScore || 0) - Number(a.riskScore || 0));
    return sorted.filter((patient) => {
      if (viewFilter === "high-risk") return patient.riskTier === "High";
      if (viewFilter === "discharge-ready") return patient.dischargeReady;
      return true;
    });
  }, [myPatients, viewFilter]);

  const highRiskCount = myPatients.filter((p) => p.riskTier === "High").length;
  const dischargeReadyCount = myPatients.filter((p) => p.dischargeReady).length;
  const pendingActionsCount = myPatients.reduce((sum, p) => sum + Number(p.pendingTasks || 0), 0);

  if (loading && !myPatients.length) return <DashboardSkeleton />;
  if (error && !myPatients.length) return <ErrorState error={error} onRetry={refresh} />;

  // Tip 6: Filter pill config with counts + semantic active colors
  const filterOptions = [
    {
      value: "all",
      label: language === "sw" ? "Wagonjwa wote" : "All patients",
      count: myPatients.length,
      activeClass: "bg-teal-600 text-white shadow-sm shadow-teal-600/30",
    },
    {
      value: "high-risk",
      label: language === "sw" ? "Hatari kubwa" : "High risk",
      count: highRiskCount,
      icon: AlertTriangle,
      activeClass: "bg-rose-600 text-white shadow-sm shadow-rose-600/30",
    },
    {
      value: "discharge-ready",
      label: language === "sw" ? "Tayari kuondoka" : "Discharge ready",
      count: dischargeReadyCount,
      icon: CheckCircle,
      activeClass: "bg-emerald-600 text-white shadow-sm shadow-emerald-600/30",
    },
  ];

  const sectionTitle =
    viewFilter === "high-risk"
      ? language === "sw" ? "Wagonjwa wa hatari kubwa" : "High-risk patients"
      : viewFilter === "discharge-ready"
      ? language === "sw" ? "Tayari kuondoka" : "Ready for discharge"
      : language === "sw" ? "Wagonjwa wangu wote" : "All my patients";

  return (
    <DashboardLayout
      isBento={true}
      title={language === "sw" ? "Wagonjwa" : "My Ward"}
      subtitle={
        language === "sw"
          ? "Utabiri wa hatari na usimamizi wa wagonjwa."
          : "AI-driven risk inference and workflow management."
      }
    >
      {/* Primary KPI Row */}
      <div className="col-span-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          key="total"
          label={language === "sw" ? "Jumla" : "Census"}
          value={myPatients.length}
          icon={Users}
          footer={language === "sw" ? "Leo" : "Live Census"}
          variant="default"
          sparklineData={[40, 42, 38, 45, 50, 48, 52]}
        />
        <KPICard
          key="high_risk"
          label={language === "sw" ? "Hatari" : "High Risk"}
          value={highRiskCount}
          icon={AlertTriangle}
          footer={language === "sw" ? "Haraka" : "Urgent Review"}
          variant="danger"
          sparklineData={[10, 15, 8, 20, 25, 22, 19]}
        />
        <KPICard
          key="ready_discharge"
          label={language === "sw" ? "Kuondoka" : "Discharge"}
          value={dischargeReadyCount}
          icon={CheckCircle}
          footer={language === "sw" ? "Tayari" : "Stable Flow"}
          variant="success"
          sparklineData={[5, 8, 12, 10, 15, 14, 18]}
        />
        <KPICard
          key="pending_actions"
          label={language === "sw" ? "Kazi" : "Actions"}
          value={pendingActionsCount}
          icon={Activity}
          footer={language === "sw" ? "Zilizobaki" : "Blockers"}
          variant="warning"
          sparklineData={[30, 25, 35, 20, 15, 18, 12]}
        />
      </div>

      {/* Main Focus Area (Bento Column 1) */}
      <div className="col-span-12 lg:col-span-8 space-y-6">
        <div className="flex items-center justify-between">
          <FilterPills options={filterOptions} value={viewFilter} onChange={setViewFilter} />
        </div>

        <DashboardSection
          title={sectionTitle}
          subtitle={`${prioritizedPatients.length} ${language === "sw" ? "Matokeo" : "Signals"}`}
        >
          {prioritizedPatients.length ? (
            <PatientListTable
              patients={prioritizedPatients}
              onRowClick={onOpenPatient}
              onStartDischarge={onStartDischarge}
            />
          ) : (
            <EmptyState
              message={
                language === "sw"
                  ? "Hakuna wagonjwa hapa."
                  : "No signals in this view."
              }
            />
          )}
        </DashboardSection>
      </div>

      {/* Predictive Insights (Bento Column 2) */}
      <div className="col-span-12 lg:col-span-4 space-y-6">
        <DashboardSection
          title={language === "sw" ? "Utabiri" : "Predictions"}
          subtitle="Real-time inference stream"
        >
          <div className="space-y-3">
            {(recentPredictions?.predictions || []).map((prediction) => {
              const score = Number(prediction.score || 0);
              const isHigh = score >= 70;
              const isMed = score >= 40 && score < 70;
              const barColor = isHigh
                ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]"
                : isMed
                ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]"
                : "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]";

              return (
                <div
                  key={prediction.id}
                  className="group relative flex items-center justify-between rounded-2xl border border-slate-100 dark:border-slate-800 p-4 transition-all hover:bg-slate-50 dark:hover:bg-slate-800/40 hover:border-slate-200 dark:hover:border-slate-700"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tighter">
                      PAT-{prediction.patientId}
                    </p>
                    <p className="text-[10px] font-bold text-slate-400 mt-1">
                      {prediction.generatedAt
                        ? new Date(prediction.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : "-"}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-lg font-black tabular-nums text-slate-900 dark:text-white leading-none">
                      {score}%
                    </span>
                    <div className="w-12 h-1 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${barColor} transition-all duration-1000`}
                        style={{ width: `${Math.min(score, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </DashboardSection>
      </div>
    </DashboardLayout>
  );
};

export default ClinicianDashboard;
