import React, { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../context/AuthProvider";
import { usePatient } from "../context/PatientProvider";
import RiskScoreDisplay from "../components/common/RiskScoreDisplay";
import Badge from "../components/common/Badge";
import ShapExplanation from "../components/prediction/ShapExplanation";
import { canAccessWorkspaceFeature } from "../services/roleAccess";

const TIER_BADGE = {
  veryhigh: "critical",
  high: "danger",
  medium: "warning",
  low: "success",
};

/**
 * Stripped down, iframe-friendly SMART-on-FHIR view.
 * Designed purely for embedding into GoTHoMIS or other Tanzanian EMRs.
 */
const SmartFhirEmbed = () => {
  const { id } = useParams();
  const { userRole } = useAuth();
  const {
    patients,
    selectedPatient,
    setSelectedPatient,
    isDataLoading,
    dataError
  } = usePatient();

  const patient = patients.find(p => p.id === id) || (selectedPatient?.id === id ? selectedPatient : null);

  useEffect(() => {
    // Only fetch/set if we have access to patient details globally
    if (!canAccessWorkspaceFeature(userRole, "patientDetail")) return;
    if (patient?.id && patient.id !== selectedPatient?.id) {
      setSelectedPatient(patient);
    }
  }, [patient, selectedPatient?.id, setSelectedPatient, userRole]);

  if (isDataLoading && !patient) {
    return <div className="p-4 text-slate-500 animate-pulse text-sm">Loading Clinical AI Context...</div>;
  }

  if (dataError && !patient) {
    return <div className="p-4 text-rose-500 text-sm font-semibold">{dataError}</div>;
  }

  if (!patient) {
    return <div className="p-4 text-slate-500 text-sm">Patient record not found or inaccessible.</div>;
  }

  const riskTierVariant = TIER_BADGE[String(patient.riskTier || "").toLowerCase().replace(/[^a-z]/g, "")] || "success";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B1B3D] text-slate-900 dark:text-slate-100 font-sans p-4 sm:p-6 overflow-x-hidden selection:bg-cyan-500/30 transition-colors duration-700">
      
      {/* Patient Header (Premium Glassmorphic) */}
      <div className="relative mb-8 mt-2">
        <div className="relative z-10 p-6 rounded-[2rem] bg-white/60 dark:bg-[#121E3D]/80 backdrop-blur-2xl border border-white/80 dark:border-white/10 shadow-lg shadow-cyan-100/20 dark:shadow-[#0B1B3D]/50 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between overflow-hidden">
          {/* Subtle glow layer behind the header */}
          <div className="absolute -left-20 -top-20 w-64 h-64 bg-cyan-400/20 dark:bg-cyan-500/10 blur-[64px] rounded-full pointer-events-none" />
          
          <div className="relative z-10 flex flex-col gap-1.5">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
              {patient.name}
            </h1>
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 dark:text-slate-300">
                <span className="w-2 h-2 rounded-full bg-cyan-500 dark:bg-[#00B8D9]" />
                MRN-{patient.mrn}
              </span>
              <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
              <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                {patient.age} Yrs • {patient.gender}
              </span>
              <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
              <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-white/5 px-2.5 py-0.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
                {patient.ward}
              </span>
            </div>
          </div>

          <div className="relative z-10 shrink-0">
             <Badge variant={riskTierVariant} className="px-4 py-1.5 text-sm font-bold shadow-sm">
               {patient.riskTier} RISK
             </Badge>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-6">
        {/* Core Prediction (Futuristic Card) */}
        <div className="relative p-7 rounded-[2rem] bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-xl shadow-slate-200/50 dark:shadow-none transition-all duration-300 hover:shadow-2xl hover:shadow-cyan-100/50 dark:hover:shadow-[#00B8D9]/10 group">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-50/50 to-transparent dark:from-[#00B8D9]/5 dark:to-transparent rounded-[2rem] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
          
          <div className="relative z-10 mb-8">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mb-1">
              Readmission AI
            </p>
            <h2 className="text-xl font-bold text-slate-950 dark:text-white">30-Day Risk Profile</h2>
          </div>
          
          <div className="relative z-10 flex justify-center items-center py-4">
             <RiskScoreDisplay
               score={patient.riskScore}
               tier={patient.riskTier}
               confidence={patient.riskConfidence}
               showConfidence
               size="lg"
             />
          </div>
        </div>

        {/* Explainability (SHAP) */}
        <div className="relative p-7 rounded-[2rem] bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-xl shadow-slate-200/50 dark:shadow-none transition-all duration-300">
          <div className="relative z-10 mb-8">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mb-1">
              Diagnostic Weights
            </p>
            <h2 className="text-xl font-bold text-slate-950 dark:text-white">Clinical Drivers</h2>
            <p className="text-sm mt-2 text-slate-500 dark:text-slate-400">
              The top factors driving this risk prediction, based on recent EMR and integration payloads.
            </p>
          </div>
          <div className="relative z-10">
            <ShapExplanation factors={patient.riskFactors || []} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SmartFhirEmbed;
