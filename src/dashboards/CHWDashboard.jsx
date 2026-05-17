import { AlertCircle, CheckCircle2, Lock, MapPin, Navigation, Phone, Users } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import {
  DashboardSkeleton,
  EmptyState,
  ErrorState,
  KPICard,
  DashboardLayout,
  DashboardSection,
} from "../components/dashboards";
import { useDashboardData } from "../hooks/useDashboardData";
import { markFollowUpComplete } from "../services/apiClient";

// Persona: Community Health Worker
// JTBD: "Who do I visit today, and how do I get there?"
// Mental model: Field agent with a route map. Navigation + phone are primary actions.
// Device: Mobile phone, often outdoors, low-bandwidth.

function RiskPill({ tier }) {
  const styles = {
    VeryHigh: "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300",
    High: "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300",
    Medium: "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
    Low: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${
        styles[tier] ?? styles.Low
      }`}
    >
      {tier} Risk
    </span>
  );
}

function PriorityTopBar({ priority }) {
  return (
    <div
      className={`h-1 rounded-t-xl w-full ${
        priority === "high" ? "bg-rose-500" : priority === "medium" ? "bg-amber-500" : "bg-emerald-500"
      }`}
    />
  );
}

function VisitCard({ visit, index, onNavigate, onCall, chwId, onCompleted }) {
  const patient = visit.patient || {};
  const hasGps = Boolean(patient.latitude && patient.longitude);
  const hasPhone = Boolean(patient.phone);
  const isHighPriority = visit.priority === "high";
  const [completing, setCompleting] = useState(false);
  const [done, setDone] = useState(false);

  const handleComplete = async () => {
    if (!chwId || !visit.id || done || completing) return;
    setCompleting(true);
    try {
      await markFollowUpComplete(chwId, visit.id);
      setDone(true);
      if (typeof onCompleted === "function") onCompleted(visit.id);
    } catch {
      // silently ignore — the visit will remain visible
    } finally {
      setCompleting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="rounded-xl border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm"
    >
      {/* Priority top bar — visual urgency at a glance */}
      <PriorityTopBar priority={visit.priority} />

      <div className="p-4">
        {/* Row 1: Sequence + Patient + Risk */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-start gap-3 min-w-0">
            {/* Visit number — route order matters for CHW */}
            <span className="shrink-0 flex items-center justify-center h-8 w-8 rounded-full bg-teal-50 dark:bg-teal-950/50 text-sm font-bold text-teal-700 dark:text-teal-300">
              {index + 1}
            </span>
            <div className="min-w-0">
              <p className="font-semibold text-neutral-900 dark:text-slate-100 truncate">
                {patient.name || "Unknown patient"}
              </p>
              <p className="text-xs text-neutral-400 dark:text-slate-500">{patient.id || "-"}</p>
            </div>
          </div>
          <RiskPill tier={patient.riskTier || "Low"} />
        </div>

        {/* Row 2: Area / location text */}
        {(patient.address || patient.area) && (
          <p className="text-sm text-neutral-500 dark:text-slate-400 flex items-center gap-1.5 mb-3">
            <MapPin className="w-3.5 h-3.5 shrink-0 text-teal-500" />
            {patient.address || patient.area}
          </p>
        )}

        {/* Row 3: Primary action (Navigate) + Secondary (Call) */}
        {(hasGps || hasPhone) ? (
          <div className="flex items-center gap-2">
            {hasGps && (
              // Navigate is DOMINANT — this is the CHW's #1 action
              <button
                onClick={() => onNavigate(patient.latitude, patient.longitude)}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white py-2.5 text-sm font-semibold transition-colors"
              >
                <Navigation className="w-4 h-4" />
                Navigate
              </button>
            )}
            {hasPhone && (
              // Call is secondary — smaller, outline
              <button
                onClick={() => onCall(patient.phone)}
                className={`flex items-center justify-center gap-2 rounded-lg border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 py-2.5 text-sm font-semibold transition-colors ${hasGps ? "px-4" : "flex-1"}`}
              >
                <Phone className="w-4 h-4" />
                {!hasGps ? "Call patient" : "Call"}
              </button>
            )}
          </div>
        ) : (
          <p className="text-xs text-neutral-500 dark:text-slate-400 flex items-center gap-1.5 py-2">
            <Lock className="w-3.5 h-3.5" />
            Contact and routing details are protected in the CHW workspace.
          </p>
        )}

        {isHighPriority && (
          <p className="mt-2.5 text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            High priority — complete before other visits
          </p>
        )}

        {chwId && (
          <button
            onClick={handleComplete}
            disabled={done || completing}
            className={`mt-3 w-full flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold transition-colors ${
              done
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 cursor-default"
                : "border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 hover:text-emerald-700 hover:border-emerald-300"
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            {done ? "Marked complete" : completing ? "Saving…" : "Mark complete"}
          </button>
        )}
      </div>
    </motion.div>
  );
}

export const CHWDashboard = ({ chwId }) => {
  const resolvedCHWId = chwId || "self";
  const { data, loading, error, refresh } = useDashboardData(
    `/chw/${encodeURIComponent(resolvedCHWId)}/visits`,
    120000,
  );

  if (loading && !data) return <DashboardSkeleton cards={3} />;
  if (error && !data) return <ErrorState error={error} onRetry={refresh} />;

  const todayVisits = data?.today || [];
  const overdueVisits = data?.overdue || [];
  const highPriorityCount = (data?.highPriorityCount ?? todayVisits.filter((v) => v.priority === "high").length);

  const openMaps = (lat, lng) => {
    const destination = lat && lng ? `${lat},${lng}` : "Tanzania";
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`,
      "_blank",
    );
  };

  const callPatient = (phone) => {
    if (!phone) return;
    window.location.href = `tel:${phone}`;
  };

  return (
    <DashboardLayout
      title="Community Follow-up"
      subtitle="Daily home-visit plan and escalation signals"
      kpis={[
        <KPICard
          key="today"
          title="Visits Today"
          value={todayVisits.length}
          icon={Users}
          footer={`${highPriorityCount} high priority`}
          variant="default"
        />,
        <KPICard
          key="overdue"
          title="Overdue Visits"
          value={overdueVisits.length}
          icon={AlertCircle}
          footer={overdueVisits.length > 0 ? "Need immediate rescheduling" : "All visits on schedule"}
          variant={overdueVisits.length > 0 ? "danger" : "success"}
        />,
        <KPICard
          key="high"
          title="High Priority"
          value={highPriorityCount}
          icon={AlertCircle}
          footer="Visit first"
          variant={highPriorityCount > 0 ? "warning" : "success"}
        />,
      ]}
    >
      {/* Overdue visits: critical top-level banner (not buried in a card) */}
      {overdueVisits.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/20 px-4 py-3"
        >
          <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
          <p className="text-sm font-semibold text-rose-800 dark:text-rose-300">
            {overdueVisits.length} overdue visit{overdueVisits.length > 1 ? "s" : ""} — contact patients immediately or reassign.
          </p>
        </motion.div>
      )}

      {/* Today's visits — route-ordered, mobile-optimized */}
      <DashboardSection
        title="Today's Visit Plan"
        subtitle={`${todayVisits.length} visit${todayVisits.length !== 1 ? "s" : ""} scheduled • sorted by priority`}
      >
        {todayVisits.length ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {todayVisits
              .slice()
              .sort((a, b) => {
                const order = { high: 0, medium: 1, low: 2 };
                return (order[a.priority] ?? 1) - (order[b.priority] ?? 1);
              })
              .map((visit, i) => (
                <VisitCard
                  key={visit.id}
                  visit={visit}
                  index={i}
                  onNavigate={openMaps}
                  onCall={callPatient}
                  chwId={resolvedCHWId}
                  onCompleted={refresh}
                />
              ))}
          </div>
        ) : (
          <EmptyState message="No visits scheduled for today. Check back later or contact your supervisor." />
        )}
      </DashboardSection>

      {/* Overdue visits section */}
      {overdueVisits.length > 0 && (
        <DashboardSection
          title="Overdue Visits"
          subtitle="These patients should have been visited already"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {overdueVisits.map((visit, i) => (
              <VisitCard
                key={visit.id}
                visit={visit}
                index={i}
                onNavigate={openMaps}
                onCall={callPatient}
                chwId={chwId}
                onCompleted={refresh}
              />
            ))}
          </div>
        </DashboardSection>
      )}
    </DashboardLayout>
  );
};

export default CHWDashboard;
