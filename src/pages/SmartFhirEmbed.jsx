import React, { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthProvider";
import { usePatient } from "../../context/PatientProvider";
import RiskScoreDisplay from "../common/RiskScoreDisplay";
import Badge from "../common/Badge";
import ShapExplanation from "../prediction/ShapExplanation";
import { canAccessWorkspaceFeature } from "../../services/roleAccess";

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
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B1B3D] text-slate-900 dark:text-slate-100 font-sans p-4 sm:p-6 overflow-x-hidden">
      
      {/* Patient Header (Minimalist) */}
      <div className="flex flex-col gap-1 mb-6">
        <h1 className="text-xl font-black">{patient.name}</h1>
        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
          MRN-{patient.mrn} • {patient.age}Y • {patient.gender} • {patient.ward}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Core Prediction */}
        <div className="p-6 rounded-[2rem] bg-white dark:bg-slate-900 shadow-sm border border-slate-200/60 dark:border-slate-800">
          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Readmission AI</p>
              <h2 className="text-lg font-black mt-1">30-Day Risk</h2>
            </div>
            <Badge variant={riskTierVariant}>{patient.riskTier} RISK</Badge>
          </div>
          
          <div className="flex justify-center">
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
        <div className="p-6 rounded-[2rem] bg-white dark:bg-slate-900 shadow-sm border border-slate-200/60 dark:border-slate-800">
          <div className="mb-6">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Diagnostic Weights</p>
            <h2 className="text-lg font-black mt-1">Key Drivers</h2>
          </div>
          <ShapExplanation factors={patient.riskFactors || []} />
        </div>
      </div>
    </div>
  );
};

export default SmartFhirEmbed;
