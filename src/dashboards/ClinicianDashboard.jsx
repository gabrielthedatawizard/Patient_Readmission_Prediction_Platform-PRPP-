import { useMemo, useState } from "react";
import { Activity, AlertTriangle, CheckCircle, Users } from "lucide-react";
import {
  DashboardSkeleton,
  EmptyState,
  ErrorState,
  KPICard,
  PatientListTable,
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
      if (viewFilter === "high-risk") {
        return patient.riskTier === "High";
      }
      if (viewFilter === "discharge-ready") {
        return patient.dischargeReady;
      }
      return true;
    });
  }, [myPatients, viewFilter]);

  const highRiskCount = myPatients.filter((patient) => patient.riskTier === "High").length;
  const dischargeReadyCount = myPatients.filter((patient) => patient.dischargeReady).length;
  const pendingActionsCount = myPatients.reduce((sum, patient) => sum + Number(patient.pendingTasks || 0), 0);

  if (loading && !myPatients.length) {
    return <DashboardSkeleton />;
  }

  if (error && !myPatients.length) {
    return <ErrorState error={error} onRetry={refresh} />;
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-neutral-900">
          {language === "sw" ? "Wagonjwa wangu" : "My patients"}
        </h1>
        <p className="mt-1 text-neutral-600">
          {language === "sw"
            ? "Msaada wa maamuzi ya kliniki uliopangwa kwa hatari."
            : "Clinical decision support prioritized by risk."}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <KPICard
          title={language === "sw" ? "Wagonjwa wote" : "Total patients"}
          value={myPatients.length}
          icon={Users}
          footer={language === "sw" ? "Waliokabidhiwa kwako sasa" : "Currently assigned to you"}
        />
        <KPICard
          title={language === "sw" ? "Hatari kubwa" : "High risk"}
          value={highRiskCount}
          icon={AlertTriangle}
          footer={language === "sw" ? "Wanahitaji uangalizi wa haraka" : "Requires immediate attention"}
          onClick={() => setViewFilter("high-risk")}
        />
        <KPICard
          title={language === "sw" ? "Tayari kuondoka" : "Ready for discharge"}
          value={dischargeReadyCount}
          icon={CheckCircle}
          footer={language === "sw" ? "Vigezo vya kliniki vimetimia" : "Clinical criteria met"}
          onClick={() => setViewFilter("discharge-ready")}
        />
        <KPICard
          title={language === "sw" ? "Hatua zinazosubiri" : "Pending actions"}
          value={pendingActionsCount}
          icon={Activity}
          footer={language === "sw" ? "Kazi zinazohitaji ukamilishaji" : "Tasks requiring completion"}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setViewFilter("all")}
          className={`rounded-lg px-4 py-2 font-medium transition-colors ${
            viewFilter === "all"
              ? "bg-teal-600 text-white"
              : "border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50"
          }`}
        >
          {language === "sw" ? "Wagonjwa wote" : "All patients"}
        </button>
        <button
          onClick={() => setViewFilter("high-risk")}
          className={`rounded-lg px-4 py-2 font-medium transition-colors ${
            viewFilter === "high-risk"
              ? "bg-red-600 text-white"
              : "border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50"
          }`}
        >
          {language === "sw" ? "Hatari kubwa tu" : "High risk only"}
        </button>
        <button
          onClick={() => setViewFilter("discharge-ready")}
          className={`rounded-lg px-4 py-2 font-medium transition-colors ${
            viewFilter === "discharge-ready"
              ? "bg-green-600 text-white"
              : "border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50"
          }`}
        >
          {language === "sw" ? "Tayari kuondoka" : "Discharge ready"}
        </button>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-bold text-neutral-900">
          {viewFilter === "high-risk" && (language === "sw" ? "Wagonjwa wa hatari kubwa" : "High-risk patients")}
          {viewFilter === "discharge-ready" && (language === "sw" ? "Tayari kuondoka" : "Ready for discharge")}
          {viewFilter === "all" && (language === "sw" ? "Wagonjwa wangu wote" : "All my patients")}
        </h2>

        {prioritizedPatients.length ? (
          <PatientListTable
            patients={prioritizedPatients}
            onRowClick={onOpenPatient}
            onStartDischarge={onStartDischarge}
          />
        ) : (
          <EmptyState message={language === "sw" ? "Hakuna wagonjwa wanaolingana na kichujio hiki." : "No patients match this filter."} />
        )}
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-bold text-neutral-900">
          {language === "sw" ? "Utabiri wa hatari wa karibuni" : "Recent risk predictions"}
        </h2>
        <div className="space-y-2">
          {(recentPredictions?.predictions || []).map((prediction) => (
            <div
              key={prediction.id}
              className="flex items-center justify-between rounded-xl border border-neutral-200 p-3"
            >
              <div>
                <p className="font-medium text-neutral-900">
                  {(language === "sw" ? "Mgonjwa" : "Patient")} {prediction.patientId}
                </p>
                <p className="text-xs text-neutral-500">
                  {prediction.generatedAt
                    ? new Date(prediction.generatedAt).toLocaleString(language === "sw" ? "sw-TZ" : "en-US")
                    : "-"}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-neutral-900">{prediction.score}</p>
                <p className="text-xs text-neutral-600">{prediction.tier}</p>
              </div>
            </div>
          ))}
          {!(recentPredictions?.predictions || []).length ? (
            <p className="text-sm text-neutral-500">
              {language === "sw" ? "Hakuna utabiri wa karibuni uliopo." : "No recent predictions available."}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default ClinicianDashboard;
