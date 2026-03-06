import { useMemo, useState } from "react";
import { Activity, AlertTriangle, CheckCircle, Users } from "lucide-react";
import { DashboardSkeleton, EmptyState, ErrorState, KPICard, PatientListTable } from "../components/dashboards";
import { useDashboardData } from "../hooks/useDashboardData";

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
        <h1 className="text-3xl font-bold text-neutral-900">My Patients</h1>
        <p className="text-neutral-600 mt-1">Clinical decision support - prioritized by risk</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KPICard title="Total Patients" value={myPatients.length} icon={Users} footer="Currently assigned to you" />
        <KPICard
          title="High Risk"
          value={highRiskCount}
          icon={AlertTriangle}
          footer="Requires immediate attention"
          onClick={() => setViewFilter("high-risk")}
        />
        <KPICard
          title="Ready for Discharge"
          value={dischargeReadyCount}
          icon={CheckCircle}
          footer="Clinical criteria met"
          onClick={() => setViewFilter("discharge-ready")}
        />
        <KPICard title="Pending Actions" value={pendingActionsCount} icon={Activity} footer="Tasks requiring completion" />
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setViewFilter("all")}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            viewFilter === "all"
              ? "bg-teal-600 text-white"
              : "bg-white border border-neutral-300 text-neutral-700 hover:bg-neutral-50"
          }`}
        >
          All Patients
        </button>
        <button
          onClick={() => setViewFilter("high-risk")}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            viewFilter === "high-risk"
              ? "bg-red-600 text-white"
              : "bg-white border border-neutral-300 text-neutral-700 hover:bg-neutral-50"
          }`}
        >
          High Risk Only
        </button>
        <button
          onClick={() => setViewFilter("discharge-ready")}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            viewFilter === "discharge-ready"
              ? "bg-green-600 text-white"
              : "bg-white border border-neutral-300 text-neutral-700 hover:bg-neutral-50"
          }`}
        >
          Discharge Ready
        </button>
      </div>

      <div className="bg-white rounded-xl border border-neutral-200 p-6">
        <h2 className="text-xl font-bold mb-4">
          {viewFilter === "high-risk" && "High-Risk Patients"}
          {viewFilter === "discharge-ready" && "Ready for Discharge"}
          {viewFilter === "all" && "All My Patients"}
        </h2>

        {prioritizedPatients.length ? (
          <PatientListTable
            patients={prioritizedPatients}
            onRowClick={onOpenPatient}
            onStartDischarge={onStartDischarge}
          />
        ) : (
          <EmptyState message="No patients match this filter." />
        )}
      </div>

      <div className="bg-white rounded-xl border border-neutral-200 p-6">
        <h2 className="text-xl font-bold mb-4">Recent Risk Predictions</h2>
        <div className="space-y-2">
          {(recentPredictions?.predictions || []).map((prediction) => (
            <div
              key={prediction.id}
              className="flex items-center justify-between rounded-lg border border-neutral-200 p-3"
            >
              <div>
                <p className="font-medium text-neutral-900">Patient {prediction.patientId}</p>
                <p className="text-xs text-neutral-500">
                  {prediction.generatedAt ? new Date(prediction.generatedAt).toLocaleString("sw-TZ") : "-"}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-neutral-900">{prediction.score}</p>
                <p className="text-xs text-neutral-600">{prediction.tier}</p>
              </div>
            </div>
          ))}
          {!(recentPredictions?.predictions || []).length ? (
            <p className="text-sm text-neutral-500">No recent predictions available.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default ClinicianDashboard;
