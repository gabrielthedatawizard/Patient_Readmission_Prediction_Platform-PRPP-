import { AlertCircle, Lock, Navigation, Phone, Users } from "lucide-react";
import { DashboardSkeleton, EmptyState, ErrorState, KPICard } from "../components/dashboards";
import { useDashboardData } from "../hooks/useDashboardData";

export const CHWDashboard = ({ chwId }) => {
  const { data, loading, error, refresh } = useDashboardData(`/chw/${encodeURIComponent(chwId || "self")}/visits`, 120000);

  if (loading && !data) {
    return <DashboardSkeleton cards={3} />;
  }
  if (error && !data) {
    return <ErrorState error={error} onRetry={refresh} />;
  }

  const todayVisits = data?.today || [];
  const overdueVisits = data?.overdue || [];

  const openMaps = (latitude, longitude) => {
    const destination = latitude && longitude ? `${latitude},${longitude}` : "Tanzania";
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`, "_blank");
  };

  const callPatient = (phone) => {
    if (!phone) {
      return;
    }
    window.location.href = `tel:${phone}`;
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-neutral-900">Community Follow-up Dashboard</h1>
        <p className="text-neutral-600 mt-1">Daily home-visit plans and escalation signals</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KPICard title="Visits Today" value={todayVisits.length} icon={Users} />
        <KPICard title="Overdue Visits" value={overdueVisits.length} icon={AlertCircle} />
        <KPICard
          title="High Priority"
          value={todayVisits.filter((visit) => visit.priority === "high").length}
          icon={AlertCircle}
        />
      </div>

      {overdueVisits.length ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {overdueVisits.length} visit(s) are overdue and need immediate action.
        </div>
      ) : null}

      <div className="bg-white rounded-xl border border-neutral-200 p-6">
        <h2 className="text-xl font-bold mb-4">Today's Visit Plan</h2>

        {todayVisits.length ? (
          <div className="space-y-3">
            {todayVisits.map((visit) => (
              <div key={visit.id} className="p-4 rounded-lg border border-neutral-200">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <p className="font-semibold text-neutral-900">{visit.patient?.name || "Unknown patient"}</p>
                    <p className="text-xs text-neutral-600">{visit.patient?.id || "-"}</p>
                  </div>
                  <span
                    className={`px-2 py-1 rounded text-xs font-semibold ${
                      visit.priority === "high" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {visit.priority || "medium"}
                  </span>
                </div>

                <p className="text-sm text-neutral-700 mb-3">
                  Risk Tier: <span className="font-semibold">{visit.patient?.riskTier || "Low"}</span>
                </p>

                {visit.patient?.phone || (visit.patient?.latitude && visit.patient?.longitude) ? (
                  <div className="flex items-center gap-2">
                    {visit.patient?.latitude && visit.patient?.longitude ? (
                      <button
                        onClick={() => openMaps(visit.patient?.latitude, visit.patient?.longitude)}
                        className="px-3 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 text-sm flex items-center gap-2"
                      >
                        <Navigation className="w-4 h-4" />
                        Navigate
                      </button>
                    ) : null}
                    {visit.patient?.phone ? (
                      <button
                        onClick={() => callPatient(visit.patient?.phone)}
                        className="px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm flex items-center gap-2"
                      >
                        <Phone className="w-4 h-4" />
                        Call
                      </button>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-sm text-neutral-600 flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    Contact and routing details are protected in the CHW workspace.
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState message="No visits scheduled for today." />
        )}
      </div>
    </div>
  );
};

export default CHWDashboard;
