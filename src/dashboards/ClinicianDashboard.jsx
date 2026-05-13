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
      title={language === "sw" ? "Wagonjwa wangu" : "My patients"}
      subtitle={
        language === "sw"
          ? "Msaada wa maamuzi ya kliniki uliopangwa kwa hatari."
          : "Clinical decision support prioritized by risk."
      }
      kpis={[
        // Tip 1: Semantic variants — color carries meaning, not decoration
        <KPICard
          key="total"
          title={language === "sw" ? "Wagonjwa wote" : "Total patients"}
          value={myPatients.length}
          icon={Users}
          footer={language === "sw" ? "Waliokabidhiwa kwako sasa" : "Currently assigned to you"}
          variant="default"
        />,
        <KPICard
          key="high_risk"
          title={language === "sw" ? "Hatari kubwa" : "High risk"}
          value={highRiskCount}
          icon={AlertTriangle}
          footer={language === "sw" ? "Wanahitaji uangalizi wa haraka" : "Requires immediate attention"}
          onClick={() => setViewFilter("high-risk")}
          variant="danger"
        />,
        <KPICard
          key="ready_discharge"
          title={language === "sw" ? "Tayari kuondoka" : "Ready for discharge"}
          value={dischargeReadyCount}
          icon={CheckCircle}
          footer={language === "sw" ? "Vigezo vya kliniki vimetimia" : "Clinical criteria met"}
          onClick={() => setViewFilter("discharge-ready")}
          variant="success"
        />,
        <KPICard
          key="pending_actions"
          title={language === "sw" ? "Hatua zinazosubiri" : "Pending actions"}
          value={pendingActionsCount}
          icon={Activity}
          footer={language === "sw" ? "Kazi zinazohitaji ukamilishaji" : "Tasks requiring completion"}
          variant="warning"
        />,
      ]}
    >
      {/* Tip 6: FilterPills with contextual count badges */}
      <FilterPills options={filterOptions} value={viewFilter} onChange={setViewFilter} />

      <DashboardSection
        title={sectionTitle}
        subtitle={`${prioritizedPatients.length} ${language === "sw" ? "wanaonyeshwa" : "shown"}`}
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
                ? "Hakuna wagonjwa wanaolingana na kichujio hiki."
                : "No patients match this filter."
            }
          />
        )}
      </DashboardSection>

      {/* Tip 5: Recent predictions with visual risk score bar */}
      <DashboardSection
        title={language === "sw" ? "Utabiri wa hatari wa karibuni" : "Recent risk predictions"}
      >
        <div className="space-y-2">
          {(recentPredictions?.predictions || []).map((prediction) => {
            const score = Number(prediction.score || 0);
            const isHigh = score >= 70;
            const isMed = score >= 40 && score < 70;
            const barColor = isHigh
              ? "bg-rose-500"
              : isMed
              ? "bg-amber-500"
              : "bg-emerald-500";
            const tierColor = isHigh
              ? "text-rose-700 dark:text-rose-400"
              : isMed
              ? "text-amber-700 dark:text-amber-400"
              : "text-emerald-700 dark:text-emerald-400";

            return (
              <div
                key={prediction.id}
                className="flex items-center justify-between rounded-lg border border-neutral-100 dark:border-slate-800 px-4 py-3 hover:bg-neutral-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-neutral-900 dark:text-slate-100 truncate">
                    {language === "sw" ? "Mgonjwa" : "Patient"} {prediction.patientId}
                  </p>
                  <p className="text-xs text-neutral-400 dark:text-slate-500 mt-0.5">
                    {prediction.generatedAt
                      ? new Date(prediction.generatedAt).toLocaleString(
                          language === "sw" ? "sw-TZ" : "en-US",
                        )
                      : "-"}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {/* Mini risk bar — visual at-a-glance score */}
                  <div className="hidden sm:block w-20 h-1.5 rounded-full bg-neutral-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${barColor} transition-all`}
                      style={{ width: `${Math.min(score, 100)}%` }}
                    />
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-neutral-900 dark:text-slate-100 tabular-nums">
                      {score}
                    </p>
                    <p className={`text-xs font-semibold ${tierColor}`}>{prediction.tier}</p>
                  </div>
                </div>
              </div>
            );
          })}
          {!(recentPredictions?.predictions || []).length && (
            <EmptyState
              message={
                language === "sw"
                  ? "Hakuna utabiri wa karibuni uliopo."
                  : "No recent predictions available."
              }
            />
          )}
        </div>
      </DashboardSection>
    </DashboardLayout>
  );
};

export default ClinicianDashboard;
