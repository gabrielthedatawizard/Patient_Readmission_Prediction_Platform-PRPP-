import React from "react";
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle,
  Clock,
  Database,
  FileText,
  Heart,
  Info,
  MapPin,
  Phone,
  PhoneCall,
  Pill,
  RotateCcw,
  Shield,
  Stethoscope,
  Target,
  User,
} from "lucide-react";
import Badge from "../common/Badge";
import Button from "../common/Button";
import RiskScoreDisplay from "../common/RiskScoreDisplay";
import ShapExplanation from "../prediction/ShapExplanation";
import PredictionHistory from "../prediction/PredictionHistory";
import { DashboardLayout, DashboardSection } from "../dashboards";
import { useReadmissionEventsQuery } from "../../hooks/useTrip";

/**
 * Patient Detail Component
 * Upgraded to "Precision Clinical" design language.
 * Persona Focus: Clinician / Nurse
 */

const TIER_BADGE_VARIANT = {
  veryhigh: "critical",
  high: "danger",
  medium: "warning",
  low: "success",
};

const PatientDetail = ({
  patient,
  onBack,
  onStartDischarge,
  canOverridePrediction = false,
  onPredictionOverridden,
}) => {
  const { data: readmissionEvents = [], isLoading: eventsLoading } =
    useReadmissionEventsQuery(patient?.id);

  if (!patient) return null;

  const formatDate = (date) => new Date(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const sortedRiskFactors = [...(patient.riskFactors || [])].sort(
    (a, b) => Math.abs(b.weight) - Math.abs(a.weight)
  );
  const positiveFactors = sortedRiskFactors.filter((f) => f.weight < 0);
  const negativeFactors = sortedRiskFactors.filter((f) => f.weight > 0);

  const clinicalHistory = patient.priorAdmissions > 0
    ? [
        {
          date: patient.admissionDate,
          event: "Current Admission",
          diagnosis: patient.diagnosis.primary,
          status: "active",
        },
        {
          date: patient.priorAdmissionDates[0] || "2024-09-15",
          event: "Previous Admission",
          diagnosis: "Heart Failure Exacerbation",
          status: "completed",
          readmittedAfter: "18 days",
        },
      ]
    : [
        {
          date: patient.admissionDate,
          event: "Current Admission",
          diagnosis: patient.diagnosis.primary,
          status: "active",
        },
      ];

  const riskTierVariant =
    TIER_BADGE_VARIANT[String(patient.riskTier || "").toLowerCase().replace(/[^a-z]/g, "")] ||
    "success";

  return (
    <DashboardLayout
      isBento={true}
      title={patient.name}
      subtitle={`MRN-${patient.mrn} • ${patient.age}Y • ${patient.gender} • ${patient.ward}`}
      headerActions={
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={onBack}
            className="rounded-xl"
            icon={<ArrowLeft className="w-4 h-4" />}
          >
            Escalation List
          </Button>
          {onStartDischarge && (
            <Button
              variant="primary"
              onClick={onStartDischarge}
              className="bg-emerald-600 rounded-xl"
              icon={<FileText className="w-4 h-4" />}
            >
              Close Encounter
            </Button>
          )}
        </div>
      }
    >
      {/* Top Priority: AI Risk Model (Bento Column) */}
      <div className="col-span-12 xl:col-span-4 space-y-6">
        <DashboardSection
          title="AI Risk Inference"
          subtitle="Probability Calibration"
          action={<Badge variant={riskTierVariant}>{patient.riskTier} PRIORITY</Badge>}
        >
          <div className="flex flex-col items-center">
            <RiskScoreDisplay
              score={patient.riskScore}
              tier={patient.riskTier}
              confidence={patient.riskConfidence}
              showConfidence
              size="lg"
            />
            <div className="mt-8 w-full p-5 rounded-[2rem] bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-1.5 h-6 bg-teal-500 rounded-full" />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Contextual Data</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase">Engine</p>
                  <p className="text-sm font-black text-slate-900 dark:text-white">v14.2 PRO</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase">Confidence</p>
                  <p className="text-sm font-black text-slate-900 dark:text-white">{(patient.riskConfidence * 100).toFixed(0)}%</p>
                </div>
              </div>
            </div>
          </div>
        </DashboardSection>

        <DashboardSection title="Social Barriers" subtitle="Environmental signals">
          <div className="grid grid-cols-1 gap-4">
            {[
              { label: "Home Status", val: patient.socialHistory?.livingSituation || "Isolated", icon: Database },
              { label: "Transit", val: patient.socialHistory?.transportation || "Unreliable", icon: MapPin },
            ].map((s, i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50/50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800">
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 text-teal-600 shadow-sm">
                  <s.icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase trekking-widest">{s.label}</p>
                  <p className="text-sm font-black text-slate-800 dark:text-slate-200">{s.val}</p>
                </div>
              </div>
            ))}
          </div>
        </DashboardSection>
      </div>

      {/* Narrative & Metrics (Bento Column) */}
      <div className="col-span-12 xl:col-span-8 space-y-6">
        <DashboardSection
          title="Driver Analysis"
          subtitle="Dynamic weighting of contributing signals"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 py-4">
            {/* Risk Drivers */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-2">
                <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest">Escalation Drivers</p>
                <div className="h-[1px] flex-1 bg-rose-100 dark:bg-rose-900/30" />
              </div>
              <div className="space-y-5">
                {negativeFactors.slice(0, 3).map((f, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="text-slate-900 dark:text-slate-300 font-bold">{f.factor}</span>
                      <span className="text-rose-600 font-black tabular-nums">+{Math.round(f.weight * 100)}%</span>
                    </div>
                    <div className="h-1 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-rose-500 rounded-full shadow-[0_0_8px_rgba(244,63,94,0.4)]"
                        style={{ width: `${Math.min(100, f.weight * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Protective Factors */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-2">
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Stability Weights</p>
                <div className="h-[1px] flex-1 bg-emerald-100 dark:bg-emerald-900/30" />
              </div>
              <div className="space-y-5">
                {positiveFactors.slice(0, 3).map((f, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="text-slate-900 dark:text-slate-300 font-bold">{f.factor}</span>
                      <span className="text-emerald-600 font-black tabular-nums">{Math.round(f.weight * 100)}%</span>
                    </div>
                    <div className="h-1 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.4)]"
                        style={{ width: `${Math.min(100, Math.abs(f.weight) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DashboardSection>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <DashboardSection
            title="Telemetry Hub"
            subtitle="Real-time clinical signals"
          >
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "BP", value: patient.vitals?.bloodPressure, icon: Heart, unit: "mmHg" },
                { label: "Pulse", value: patient.vitals?.heartRate, icon: Activity, unit: "bpm" },
                { label: "SpO2", value: patient.vitals?.oxygenSaturation, unit: "%" },
                { label: "Temp", value: patient.vitals?.temperature, unit: "°C" },
              ].map((v, i) => (
                <div key={i} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                  <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-tighter">{v.label}</p>
                  <div className="flex items-baseline gap-1 mt-2">
                    <span className="text-2xl font-black text-slate-900 dark:text-white tabular-nums leading-none">{v.value}</span>
                    <span className="text-[9px] text-slate-400 font-bold">{v.unit}</span>
                  </div>
                </div>
              ))}
            </div>
          </DashboardSection>

          <DashboardSection
            title="Laboratory DNA"
            subtitle="Critical biochemistry"
          >
            <div className="space-y-3">
              {Object.entries(patient.labs || {}).map(([key, val]) => (
                val !== null && key !== "lastUpdated" && (
                  <div key={key} className="flex items-center justify-between p-3 rounded-xl bg-slate-50/50 dark:bg-slate-800/20 border border-slate-100/50 dark:border-slate-800">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 capitalize">{key.replace(/([A-Z])/g, " $1")}</span>
                    <span className="text-sm font-black text-slate-900 dark:text-slate-100 tabular-nums">{val}</span>
                  </div>
                )
              ))}
            </div>
          </DashboardSection>
        </div>

        <DashboardSection title="Decision Support" subtitle="Risk mitigation tactics">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { title: "Intensive Follow-up", icon: Phone, variant: "sky" },
              { title: "Med Titration", icon: Pill, variant: "rose" },
              { title: "CHW Linkage", icon: MapPin, variant: "teal" },
              { title: "Home Training", icon: Heart, variant: "amber" },
            ].map((action, i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-[1.5rem] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:border-teal-500 hover:shadow-xl hover:shadow-teal-500/5 transition-all cursor-pointer group">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 group-hover:text-teal-600 group-hover:bg-teal-50 dark:group-hover:bg-teal-950/30 transition-colors">
                  <action.icon className="w-5 h-5" />
                </div>
                <p className="text-sm font-black text-slate-900 dark:text-white tracking-tight">{action.title}</p>
              </div>
            ))}
          </div>
        </DashboardSection>

        <DashboardSection
          title="Readmission History"
          subtitle="Confirmed post-discharge events"
          action={
            readmissionEvents.length > 0 ? (
              <Badge variant="danger">{readmissionEvents.length} event{readmissionEvents.length !== 1 ? "s" : ""}</Badge>
            ) : null
          }
        >
          {eventsLoading ? (
            <div className="flex items-center gap-2 py-4 text-slate-400 text-sm">
              <Clock className="w-4 h-4 animate-spin" />
              Loading history…
            </div>
          ) : readmissionEvents.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-slate-400">
              <CheckCircle className="w-8 h-8 text-emerald-400" />
              <p className="text-sm font-semibold">No readmission events recorded</p>
            </div>
          ) : (
            <div className="space-y-3">
              {readmissionEvents.map((event, i) => (
                <div
                  key={event.id || i}
                  className="flex items-start gap-4 p-4 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30"
                >
                  <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-950/50 text-rose-600 shrink-0 mt-0.5">
                    <RotateCcw className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <p className="text-sm font-black text-slate-900 dark:text-white">
                        {formatDate(event.detectedAt || event.createdAt)}
                      </p>
                      <div className="flex items-center gap-2">
                        {event.within30Days && (
                          <Badge variant="danger" size="sm">Within 30 days</Badge>
                        )}
                        {event.source && (
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{event.source}</span>
                        )}
                      </div>
                    </div>
                    {event.priorFacilityName && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Prior facility: {event.priorFacilityName}
                      </p>
                    )}
                    {event.daysSinceDischarge !== null && event.daysSinceDischarge !== undefined && (
                      <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold mt-0.5">
                        {event.daysSinceDischarge} days after discharge
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </DashboardSection>
      </div>
    </DashboardLayout>
  );
};

export default PatientDetail;
