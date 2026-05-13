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

/**
 * Patient Detail Component
 * Upgraded to "Precision Clinical" design language.
 * Persona Focus: Clinician / Nurse
 */

const PatientDetail = ({
  patient,
  onBack,
  onStartDischarge,
  canOverridePrediction = false,
  onPredictionOverridden,
}) => {
  if (!patient) return null;

  // Formatting helpers
  const formatDate = (date) => new Date(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  // Risk sorting
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
    patient.riskTier?.toLowerCase() === "high"
      ? "danger"
      : patient.riskTier?.toLowerCase() === "medium"
      ? "warning"
      : "success";

  return (
    <DashboardLayout
      title={patient.name}
      subtitle={`MRN: ${patient.mrn} • ${patient.age}Y • ${patient.gender} • Ward: ${patient.ward} ${patient.bed ? `• Bed: ${patient.bed}` : ""}`}
      headerActions={
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={onBack}
            icon={<ArrowLeft className="w-4 h-4" />}
          >
            All Patients
          </Button>
          {onStartDischarge && (
            <Button
              variant="primary"
              onClick={onStartDischarge}
              icon={<FileText className="w-4 h-4" />}
            >
              Start Discharge
            </Button>
          )}
        </div>
      }
    >
      {/* Top Priority Grid: Risk + Quick Context */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Risk Analysis Card */}
        <DashboardSection
          title="Risk Analysis"
          subtitle="AI-driven readmission probability"
          headerActions={<Badge variant={riskTierVariant}>{patient.riskTier} Risk</Badge>}
        >
          <div className="flex flex-col items-center py-4">
            <RiskScoreDisplay
              score={patient.riskScore}
              tier={patient.riskTier}
              confidence={patient.riskConfidence}
              showConfidence
              size="lg"
            />
            <div className="mt-6 w-full p-4 rounded-xl bg-neutral-50 dark:bg-slate-800/50 border border-neutral-100 dark:border-slate-800">
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-widest flex items-center gap-2 mb-2">
                <Shield className="w-3.5 h-3.5 text-teal-600" />
                Inference Context
              </p>
              <p className="text-xs text-neutral-600 dark:text-slate-400 leading-relaxed">
                Calibration: <span className="font-semibold text-neutral-900 dark:text-slate-200">TRIP-v14.2</span>
                <br />
                Model Confidence: <span className="font-semibold text-neutral-900 dark:text-slate-200">{(patient.riskConfidence * 100).toFixed(0)}%</span>
                <br />
                Last Inferred: <span className="font-semibold text-neutral-900 dark:text-slate-200">Today</span>
              </p>
            </div>
          </div>
        </DashboardSection>

        {/* Factors Breakdown */}
        <DashboardSection
          title="Top Contributors"
          subtitle="Variables driving the current score"
          className="xl:col-span-3"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Risk Drivers */}
            <div>
              <p className="text-xs font-bold text-rose-600 uppercase tracking-widest flex items-center gap-2 mb-4">
                <AlertCircle className="w-3.5 h-3.5" />
                Risk Drivers
              </p>
              <div className="space-y-4">
                {negativeFactors.slice(0, 4).map((f, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="text-neutral-700 dark:text-slate-300 font-medium">{f.factor}</span>
                      <span className="text-rose-600 font-bold tabular-nums">+{Math.round(f.weight * 100)}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-neutral-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-rose-500 rounded-full transition-all duration-700"
                        style={{ width: `${Math.min(100, f.weight * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Protective Factors */}
            <div>
              <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest flex items-center gap-2 mb-4">
                <CheckCircle className="w-3.5 h-3.5" />
                Protective Factors
              </p>
              <div className="space-y-4">
                {positiveFactors.slice(0, 4).map((f, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="text-neutral-700 dark:text-slate-300 font-medium">{f.factor}</span>
                      <span className="text-emerald-600 font-bold tabular-nums">{Math.round(f.weight * 100)}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-neutral-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                        style={{ width: `${Math.min(100, Math.abs(f.weight) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-neutral-100 dark:border-slate-800">
            <ShapExplanation factors={sortedRiskFactors.slice(0, 5)} />
          </div>
        </DashboardSection>
      </div>

      {/* Clinical Body Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Medical Snapshot */}
        <DashboardSection
          title="Clinical Baseline"
          subtitle="Active diagnoses and recent admissions"
          icon={Stethoscope}
        >
          <div className="space-y-6">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-neutral-400 mb-3">Diagnoses</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="primary">{patient.diagnosis.primary}</Badge>
                {patient.diagnosis.secondary?.map((dx, i) => (
                  <Badge key={i} variant="default">{dx}</Badge>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-widest text-neutral-400 mb-3">Admissions Timeline</p>
              <div className="space-y-4">
                {clinicalHistory.map((h, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-2.5 h-2.5 rounded-full ring-4 ring-offset-2 ${h.status === "active" ? "bg-teal-500 ring-teal-100" : "bg-neutral-300 ring-neutral-50"}`} />
                      {i < clinicalHistory.length - 1 && <div className="w-0.5 h-full bg-neutral-100 mt-1" />}
                    </div>
                    <div className="pb-4">
                      <p className="text-sm font-bold text-neutral-900 dark:text-slate-100">{h.event}</p>
                      <p className="text-xs text-neutral-500 mb-1">{formatDate(h.date)} • {h.diagnosis}</p>
                      {h.readmittedAfter && (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-50 text-[10px] font-bold text-rose-700 border border-rose-100">
                          Readmitted in {h.readmittedAfter}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DashboardSection>

        {/* Vitals Grid */}
        <DashboardSection
          title="Vitals & Laboratory"
          subtitle="Latest telemetry from primary care unit"
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            {[
              { label: "BP", value: patient.vitals?.bloodPressure, icon: Heart, unit: "mmHg", variant: "default" },
              { label: "Pulse", value: patient.vitals?.heartRate, icon: Activity, unit: "bpm", variant: "default" },
              { label: "SpO2", value: patient.vitals?.oxygenSaturation, unit: "%", variant: "success" },
              { label: "Temp", value: patient.vitals?.temperature, unit: "°C", variant: "warning" },
            ].map((v, i) => (
              <div key={i} className="p-3 rounded-xl border border-neutral-100 dark:border-slate-800 bg-neutral-50/50 dark:bg-slate-800/30">
                <p className="text-[10px] font-semibold text-neutral-500 uppercase">{v.label}</p>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-lg font-bold text-neutral-900 dark:text-slate-100 tabular-nums">{v.value}</span>
                  <span className="text-[10px] text-neutral-400 font-medium">{v.unit}</span>
                </div>
              </div>
            ))}
          </div>

          <p className="text-[10px] uppercase tracking-widest text-neutral-400 mb-3">Key Laboratory Targets</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Object.entries(patient.labs || {}).map(([key, val]) => (
              val !== null && key !== "lastUpdated" && (
                <div key={key} className="flex items-center justify-between p-3 rounded-lg bg-neutral-50 dark:bg-slate-800/30">
                  <span className="text-xs text-neutral-600 dark:text-slate-400 capitalize">{key.replace(/([A-Z])/g, " $1")}</span>
                  <span className="text-sm font-bold text-neutral-900 dark:text-slate-200 tabular-nums">{val}</span>
                </div>
              )
            ))}
          </div>
        </DashboardSection>
      </div>

      {/* Intervention & History Rows */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <DashboardSection title="Recommended Interventions" subtitle="Priority actions to mitigate readmission risk" className="xl:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { title: "High Intensity Follow-up", desc: "Schedule phone calls at day 2, 7, and 14 post-discharge.", icon: Phone, color: "teal" },
              { title: "Medication Titration", desc: "Consult pharmacist for gold-standard heart failure regimen.", icon: Pill, color: "rose" },
              { title: "Community Health Linkage", desc: "Assign CHW for home visit within 48 hours.", icon: MapPin, color: "sky" },
              { title: "Family Education", desc: "Conduct 15-min warning signs training in Swahili.", icon: Heart, color: "amber" },
            ].map((action, i) => (
              <div key={i} className={`flex items-start gap-3 p-4 rounded-xl border border-neutral-100 dark:border-slate-800 hover:shadow-md transition-shadow group cursor-default`}>
                <div className={`p-2 rounded-lg bg-gradient-to-br from-neutral-100 to-neutral-200 dark:from-slate-800 dark:to-slate-700`}>
                  <action.icon className="w-5 h-5 text-neutral-600 dark:text-slate-300" />
                </div>
                <div>
                  <p className="text-sm font-bold text-neutral-900 dark:text-slate-100 mb-1">{action.title}</p>
                  <p className="text-xs text-neutral-500 dark:text-slate-400 leading-relaxed">{action.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </DashboardSection>

        <DashboardSection title="Social Barriers" subtitle="Non-clinical readmission drivers">
          <div className="space-y-4">
            {[
              { label: "Living Situation", val: patient.socialHistory?.livingSituation || "Unknown", icon: Database },
              { label: "Transport Security", val: patient.socialHistory?.transportation || "Unreliable", icon: MapPin },
              { label: "Connectivity", val: patient.socialHistory?.phoneAccess ? "Has Phone" : "No Phone", icon: PhoneCall },
            ].map((s, i) => (
              <div key={i} className="flex items-center gap-3">
                <s.icon className="w-4 h-4 text-neutral-400" />
                <div>
                  <p className="text-[10px] text-neutral-400 uppercase tracking-widest">{s.label}</p>
                  <p className="text-sm font-semibold text-neutral-800 dark:text-slate-200">{s.val}</p>
                </div>
              </div>
            ))}
          </div>
        </DashboardSection>
      </div>

      <DashboardSection title="Prediction History" subtitle="Inference longitudinal track">
        <PredictionHistory
          patientId={patient.id}
          canOverride={canOverridePrediction}
          onPredictionOverridden={onPredictionOverridden}
        />
      </DashboardSection>
    </DashboardLayout>
  );
};

export default PatientDetail;
