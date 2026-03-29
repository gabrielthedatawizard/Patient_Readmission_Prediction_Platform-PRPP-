import React, { useState } from 'react';
import { 
  ArrowLeft, Stethoscope, Pill, MessageSquare, Calendar, 
  Home, FileText, Check, ArrowRight, AlertTriangle,
  User, Phone, MapPin, Clock, CheckCircle, Save, Loader2, Bot, Plus
} from 'lucide-react';
import Card from '../common/Card';
import Badge from '../common/Badge';
import Button from '../common/Button';
import { extractDischargeSummary, generatePrediction } from '../../services/mlService';
import { createPatientEncounter, updatePatient } from '../../services/apiClient';

/**
 * Discharge Workflow Component
 * 6-step discharge process for patient discharge planning
 */

function splitCsv(value) {
  return String(value || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function toOptionalNumber(value) {
  if (value === '' || value === null || value === undefined) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toDateInputValue(value) {
  const date = new Date(value || Date.now());
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toISOString().slice(0, 10);
}

function parseBloodPressure(value) {
  const parts = String(value || '')
    .split('/')
    .map((entry) => Number(entry.trim()))
    .filter((entry) => Number.isFinite(entry));

  return {
    systolic: parts[0] ?? null,
    diastolic: parts[1] ?? null
  };
}

function buildMedicationDraft(medication = {}) {
  return {
    name: medication.name || medication.label || '',
    dose: medication.dose || medication.strength || '',
    frequency: medication.frequency || '',
    route: medication.route || '',
    continue: medication.continue !== false,
    modified: Boolean(medication.modified),
    newDose: medication.newDose || '',
    notes: medication.notes || ''
  };
}

const DischargeWorkflow = ({ patient, onBack, onComplete }) => {
  const patientProfile = patient?.clinicalProfile || {};
  const initialBloodPressure = parseBloodPressure(patient?.vitals?.bloodPressure);
  const initialDiagnoses = [
    patient?.diagnosis?.primary,
    ...(Array.isArray(patient?.diagnosis?.secondary) ? patient.diagnosis.secondary : [])
  ].filter(Boolean);
  const initialMedications = Array.isArray(patient?.medications)
    ? patient.medications.map((medication) => buildMedicationDraft(medication))
    : [];
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isExtractingSummary, setIsExtractingSummary] = useState(false);
  const [predictionResult, setPredictionResult] = useState(null);
  const [savedEncounter, setSavedEncounter] = useState(null);
  const [predictionError, setPredictionError] = useState('');
  const [summaryError, setSummaryError] = useState('');
  const [summaryInsights, setSummaryInsights] = useState(null);
  const [formData, setFormData] = useState({
    // Step 0: Clinical Readiness
    clinicalChecks: {
      vitalsStable: false,
      painControlled: false,
      oralIntake: false,
      noInfection: false,
      labsAcceptable: false,
      teamApproval: false
    },
    // Step 1: Medication
    medications: initialMedications.length ? initialMedications : [buildMedicationDraft()],
    // Step 2: Education
    educationTopics: {
      warningSigns: false,
      selfCare: false,
      medications: false,
      followup: false,
      caregiverTraining: false
    },
    // Step 3: Follow-up
    followupPlan: {
      day3Call: true,
      day7Call: true,
      day14Call: patient?.riskTier === 'High' || patient?.riskTier === 'Medium',
      day30Call: patient?.riskTier === 'High',
      homeVisit: false,
      clinicVisit: true,
      clinicVisitDate: '',
      alternateContactNumber: ''
    },
    // Step 4: Referral
    referrals: {
      chwVisit: patient?.riskTier === 'High',
      nutritionCounseling: false,
      physiotherapy: false,
      socialWork: patient?.socialHistory?.phoneAccess === false
    },
    encounterData: {
      admissionDate: toDateInputValue(patient?.admissionDate),
      dischargeDate: toDateInputValue(new Date()),
      ward: patient?.ward || '',
      diagnosesText: initialDiagnoses.join(', '),
      dischargeDisposition: 'home',
      lengthOfStay: Number(patient?.lengthOfStay || patientProfile.lengthOfStayDays || 0) || '',
      egfr: patient?.labs?.egfr ?? patientProfile.egfr ?? '',
      hemoglobin: patient?.labs?.hemoglobin ?? patientProfile.hemoglobin ?? '',
      hba1c: patient?.labs?.hba1c ?? patientProfile.hba1c ?? '',
      bpSystolic: initialBloodPressure.systolic ?? patientProfile.bpSystolic ?? '',
      bpDiastolic: initialBloodPressure.diastolic ?? patientProfile.bpDiastolic ?? '',
      icuStayDays: patientProfile.icuStayDays ?? '',
      phoneAccess: patient?.socialHistory?.phoneAccess !== false,
      transportationDifficulty:
        patient?.socialHistory?.transportation === 'Limited' ||
        Boolean(patientProfile.transportationDifficulty),
      livesAlone:
        patient?.socialHistory?.livingSituation === 'Lives alone' || Boolean(patientProfile.livesAlone),
      address: patient?.address || '',
      primaryContactNumber: patient?.phone || ''
    },
    // Step 5: Summary
    dischargeNotes: ''
  });

  const updateEncounterData = (patch) => {
    setFormData((previous) => ({
      ...previous,
      encounterData: {
        ...previous.encounterData,
        ...patch
      }
    }));
  };

  const updateMedicationAt = (index, patch) => {
    setFormData((previous) => ({
      ...previous,
      medications: previous.medications.map((medication, medicationIndex) =>
        medicationIndex === index
          ? {
              ...medication,
              ...patch
            }
          : medication
      )
    }));
  };

  const addMedicationRow = () => {
    setFormData((previous) => ({
      ...previous,
      medications: [...previous.medications, buildMedicationDraft()]
    }));
  };

  const removeMedicationRow = (index) => {
    setFormData((previous) => ({
      ...previous,
      medications:
        previous.medications.length > 1
          ? previous.medications.filter((_, medicationIndex) => medicationIndex !== index)
          : [buildMedicationDraft()]
    }));
  };

  const buildEncounterPayload = () => {
    const diagnoses = splitCsv(formData.encounterData.diagnosesText);
    const fallbackDiagnoses = Array.isArray(summaryInsights?.entities?.diagnoses)
      ? summaryInsights.entities.diagnoses
      : [];
    const finalDiagnoses = diagnoses.length ? diagnoses : fallbackDiagnoses;
    const medications = formData.medications
      .filter((medication) => String(medication.name || '').trim())
      .map((medication) => ({
        name: String(medication.name || '').trim(),
        dose: String(medication.newDose || medication.dose || '').trim(),
        frequency: String(medication.frequency || '').trim(),
        route: String(medication.route || '').trim(),
        continue: medication.continue !== false,
        notes: String(medication.notes || '').trim()
      }));

    const summaryMedications = Array.isArray(summaryInsights?.entities?.medications)
      ? summaryInsights.entities.medications.map((medication) => ({ name: medication }))
      : [];
    const finalMedications = medications.length ? medications : summaryMedications;

    return {
      admissionDate: formData.encounterData.admissionDate || toDateInputValue(new Date()),
      dischargeDate: formData.encounterData.dischargeDate || undefined,
      diagnosis:
        finalDiagnoses[0] ||
        patient?.diagnosis?.primary ||
        patientProfile.primaryDiagnosis ||
        'Unknown',
      diagnoses: finalDiagnoses,
      medications: finalMedications,
      labResults: {
        egfr: toOptionalNumber(formData.encounterData.egfr),
        hemoglobin: toOptionalNumber(formData.encounterData.hemoglobin),
        hba1c: toOptionalNumber(formData.encounterData.hba1c)
      },
      vitalSigns: {
        bpSystolic: toOptionalNumber(formData.encounterData.bpSystolic),
        bpDiastolic: toOptionalNumber(formData.encounterData.bpDiastolic)
      },
      socialFactors: {
        phoneAccess: Boolean(formData.encounterData.phoneAccess),
        transportationDifficulty: Boolean(formData.encounterData.transportationDifficulty),
        livesAlone: Boolean(formData.encounterData.livesAlone),
        icuStayDays: toOptionalNumber(formData.encounterData.icuStayDays)
      },
      dischargeDisposition: formData.encounterData.dischargeDisposition || 'home',
      ward: formData.encounterData.ward || patient?.ward || 'General',
      lengthOfStay: toOptionalNumber(formData.encounterData.lengthOfStay) ?? 0
    };
  };

  const buildPredictionFeatures = (encounterPayload = buildEncounterPayload()) => ({
    age: Number(patient?.age || patientProfile.age || 0),
    gender: patient?.gender || patientProfile.gender || 'unknown',
    diagnosis: encounterPayload.diagnosis,
    diagnoses: encounterPayload.diagnoses,
    medications: encounterPayload.medications,
    lengthOfStay: Number(encounterPayload.lengthOfStay || 0),
    lengthOfStayDays: Number(encounterPayload.lengthOfStay || 0),
    priorAdmissions6mo: Number(patient?.priorAdmissions || patientProfile.priorAdmissions12m || 0),
    priorAdmissions12m: Number(patient?.priorAdmissions || patientProfile.priorAdmissions12m || 0),
    charlsonIndex: Number(patientProfile.charlsonIndex || 0),
    egfr: encounterPayload.labResults?.egfr ?? null,
    hemoglobin: encounterPayload.labResults?.hemoglobin ?? null,
    hba1c: encounterPayload.labResults?.hba1c ?? null,
    bpSystolic: encounterPayload.vitalSigns?.bpSystolic ?? null,
    bpDiastolic: encounterPayload.vitalSigns?.bpDiastolic ?? null,
    phoneAccess: encounterPayload.socialFactors?.phoneAccess,
    transportationDifficulty: encounterPayload.socialFactors?.transportationDifficulty,
    livesAlone: encounterPayload.socialFactors?.livesAlone,
    icuStayDays: encounterPayload.socialFactors?.icuStayDays ?? null
  });

  const buildPatientPatch = (encounterPayload) => ({
    phone: formData.encounterData.primaryContactNumber || patient?.phone || undefined,
    address: formData.encounterData.address || patient?.address || undefined,
    clinicalProfile: {
      ...patientProfile,
      primaryDiagnosis: encounterPayload.diagnosis,
      lengthOfStayDays: encounterPayload.lengthOfStay,
      egfr: encounterPayload.labResults?.egfr ?? undefined,
      hemoglobin: encounterPayload.labResults?.hemoglobin ?? undefined,
      hba1c: encounterPayload.labResults?.hba1c ?? undefined,
      bpSystolic: encounterPayload.vitalSigns?.bpSystolic ?? undefined,
      bpDiastolic: encounterPayload.vitalSigns?.bpDiastolic ?? undefined,
      icuStayDays: encounterPayload.socialFactors?.icuStayDays ?? undefined,
      phoneAccess: encounterPayload.socialFactors?.phoneAccess,
      transportationDifficulty: encounterPayload.socialFactors?.transportationDifficulty,
      livesAlone: encounterPayload.socialFactors?.livesAlone,
      medications: encounterPayload.medications
    }
  });

  const handleExtractSummary = async () => {
    if (!patient?.id || !String(formData.dischargeNotes || '').trim()) {
      return;
    }

    setIsExtractingSummary(true);
    setSummaryError('');

    try {
      const extraction = await extractDischargeSummary(patient.id, formData.dischargeNotes, {
        workflow: formData,
        prediction: predictionResult
      });
      setSummaryInsights(extraction);
    } catch (error) {
      setSummaryError(error?.message || 'Unable to extract discharge summary insights.');
    } finally {
      setIsExtractingSummary(false);
    }
  };

  const steps = [
    { id: 'clinical', label: 'Clinical Readiness', icon: Stethoscope },
    { id: 'medication', label: 'Medication', icon: Pill },
    { id: 'education', label: 'Patient Education', icon: MessageSquare },
    { id: 'followup', label: 'Follow-up Plan', icon: Calendar },
    { id: 'referral', label: 'Referral & Community', icon: Home },
    { id: 'summary', label: 'Discharge Summary', icon: FileText }
  ];

  const markStepComplete = (stepIndex) => {
    if (!completedSteps.includes(stepIndex)) {
      setCompletedSteps([...completedSteps, stepIndex]);
    }
  };

  const goToStep = (step) => {
    setCurrentStep(step);
  };

  const goNext = () => {
    markStepComplete(currentStep);
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const goPrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Step 0: Clinical Readiness
  const ClinicalReadinessStep = () => {
    const checks = [
      { key: 'vitalsStable', label: 'Vital signs stable for 24 hours' },
      { key: 'painControlled', label: 'Pain controlled on oral medications' },
      { key: 'oralIntake', label: 'Able to tolerate oral intake' },
      { key: 'noInfection', label: 'No active infections requiring IV therapy' },
      { key: 'labsAcceptable', label: 'Lab values within acceptable range' },
      { key: 'teamApproval', label: 'Clinical team approves discharge' }
    ];

    const allChecked = Object.values(formData.clinicalChecks).every(Boolean);

    return (
      <div className="space-y-4">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-900">Clinical Readiness Checklist</p>
              <p className="text-sm text-amber-700">
                Ensure all items are checked before proceeding with discharge planning.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {checks.map((check) => (
            <label 
              key={check.key} 
              className={`flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                formData.clinicalChecks[check.key]
                  ? 'bg-teal-50 border-teal-300'
                  : 'bg-white border-gray-200 hover:border-teal-200'
              }`}
            >
              <input
                type="checkbox"
                checked={formData.clinicalChecks[check.key]}
                onChange={(e) => {
                  setFormData({
                    ...formData,
                    clinicalChecks: {
                      ...formData.clinicalChecks,
                      [check.key]: e.target.checked
                    }
                  });
                }}
                className="w-5 h-5 text-teal-600 rounded focus:ring-teal-500"
              />
              <span className={`font-medium ${
                formData.clinicalChecks[check.key] ? 'text-teal-900' : 'text-gray-700'
              }`}>
                {check.label}
              </span>
              {formData.clinicalChecks[check.key] && (
                <CheckCircle className="w-5 h-5 text-teal-600 ml-auto" />
              )}
            </label>
          ))}
        </div>

        <div className="p-4 bg-white border-2 border-gray-200 rounded-lg space-y-4">
          <div>
            <p className="font-semibold text-gray-900">Clinical Signal Capture</p>
            <p className="text-sm text-gray-600">
              Capture the minimum structured data used by the predictive model before discharge.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[
              { key: 'egfr', label: 'eGFR', step: '0.1', placeholder: '60' },
              { key: 'hemoglobin', label: 'Hemoglobin', step: '0.1', placeholder: '11.2' },
              { key: 'hba1c', label: 'HbA1c', step: '0.1', placeholder: '7.4' },
              { key: 'bpSystolic', label: 'BP Systolic', step: '1', placeholder: '138' },
              { key: 'bpDiastolic', label: 'BP Diastolic', step: '1', placeholder: '82' },
              { key: 'icuStayDays', label: 'ICU Stay Days', step: '1', placeholder: '0' }
            ].map((field) => (
              <label key={field.key} className="block">
                <span className="block text-sm font-semibold text-gray-700 mb-2">
                  {field.label}
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  step={field.step}
                  placeholder={field.placeholder}
                  value={formData.encounterData[field.key]}
                  onChange={(e) => updateEncounterData({ [field.key]: e.target.value })}
                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-teal-500 outline-none"
                />
              </label>
            ))}
          </div>
        </div>

        {!allChecked && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">
              <AlertTriangle className="w-4 h-4 inline mr-2" />
              All clinical readiness criteria must be met before discharge.
            </p>
          </div>
        )}
      </div>
    );
  };

  // Step 1: Medication Reconciliation
  const MedicationStep = () => (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="font-semibold text-blue-900">Medication Reconciliation</p>
        <p className="text-sm text-blue-700">
          Review and confirm all medications for discharge. Mark any changes or new prescriptions.
        </p>
      </div>

      <div className="bg-white rounded-lg border-2 border-gray-200 overflow-x-auto">
        <table className="w-full min-w-[760px]" role="table" aria-label="Medication reconciliation">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left text-sm font-semibold text-gray-700 py-3 px-4">Medication</th>
              <th className="text-left text-sm font-semibold text-gray-700 py-3 px-4">Current Dose</th>
              <th className="text-left text-sm font-semibold text-gray-700 py-3 px-4">Frequency</th>
              <th className="text-center text-sm font-semibold text-gray-700 py-3 px-4">Continue</th>
              <th className="text-left text-sm font-semibold text-gray-700 py-3 px-4">Notes</th>
              <th className="text-right text-sm font-semibold text-gray-700 py-3 px-4">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {formData.medications.map((med, idx) => (
              <tr key={idx} className={med.continue ? '' : 'bg-gray-50'}>
                <td className="py-3 px-4">
                  <input
                    type="text"
                    value={med.name}
                    onChange={(e) => updateMedicationAt(idx, { name: e.target.value })}
                    placeholder="Medication name"
                    className="w-full text-sm border border-gray-200 rounded px-2 py-1"
                  />
                  <input
                    type="text"
                    value={med.route || ''}
                    onChange={(e) => updateMedicationAt(idx, { route: e.target.value })}
                    placeholder="Route"
                    className="w-full mt-2 text-xs border border-gray-200 rounded px-2 py-1"
                  />
                </td>
                <td className="py-3 px-4">
                  <input
                    type="text"
                    value={med.newDose || med.dose || ''}
                    onChange={(e) => updateMedicationAt(idx, { newDose: e.target.value, modified: true })}
                    placeholder="Dose"
                    className="w-full text-sm border border-gray-200 rounded px-2 py-1"
                  />
                </td>
                <td className="py-3 px-4">
                  <input
                    type="text"
                    value={med.frequency || ''}
                    onChange={(e) => updateMedicationAt(idx, { frequency: e.target.value })}
                    placeholder="Frequency"
                    className="w-full text-sm border border-gray-200 rounded px-2 py-1"
                  />
                </td>
                <td className="py-3 px-4 text-center">
                  <input
                    type="checkbox"
                    checked={med.continue}
                    onChange={(e) => updateMedicationAt(idx, { continue: e.target.checked })}
                    className="w-4 h-4 text-teal-600 rounded"
                  />
                </td>
                <td className="py-3 px-4">
                  <input
                    type="text"
                    placeholder="Add notes..."
                    value={med.notes || ''}
                    onChange={(e) => updateMedicationAt(idx, { notes: e.target.value })}
                    className="w-full text-sm border border-gray-200 rounded px-2 py-1"
                  />
                </td>
                <td className="py-3 px-4 text-right">
                  <button
                    type="button"
                    onClick={() => removeMedicationRow(idx)}
                    className="text-sm font-medium text-red-600 hover:text-red-700"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Adherence Alert */}
      {patient?.riskTier === 'High' && (
        <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-900">Adherence Risk Detected</p>
              <p className="text-sm text-amber-700">
                High-risk patient with multiple medications. Consider:
              </p>
              <ul className="text-sm text-amber-700 mt-2 ml-4 list-disc">
                <li>Pill organizer</li>
                <li>Simplified regimen</li>
                <li>Caregiver involvement</li>
                <li>Written instructions in Swahili</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      <Button variant="secondary" className="w-full" icon={<Plus className="w-4 h-4" />} onClick={addMedicationRow}>
        Add New Medication
      </Button>
    </div>
  );

  // Step 2: Patient Education
  const EducationStep = () => {
    const topics = [
      { key: 'warningSigns', label: 'Warning signs to watch for', icon: AlertTriangle },
      { key: 'selfCare', label: 'Self-care instructions', icon: User },
      { key: 'medications', label: 'Medication schedule and side effects', icon: Pill },
      { key: 'followup', label: 'Follow-up appointments', icon: Calendar },
      { key: 'caregiverTraining', label: 'Caregiver training provided', icon: Home }
    ];

    return (
      <div className="space-y-4">
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <p className="font-semibold text-purple-900">Patient Education Checklist</p>
          <p className="text-sm text-purple-700">
            Confirm all education topics have been covered with the patient and/or caregiver.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {topics.map((topic) => (
            <label 
              key={topic.key}
              className={`flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                formData.educationTopics[topic.key]
                  ? 'bg-purple-50 border-purple-300'
                  : 'bg-white border-gray-200 hover:border-purple-200'
              }`}
            >
              <input
                type="checkbox"
                checked={formData.educationTopics[topic.key]}
                onChange={(e) => {
                  setFormData({
                    ...formData,
                    educationTopics: {
                      ...formData.educationTopics,
                      [topic.key]: e.target.checked
                    }
                  });
                }}
                className="w-5 h-5 text-purple-600 rounded"
              />
              <topic.icon className={`w-5 h-5 ${
                formData.educationTopics[topic.key] ? 'text-purple-600' : 'text-gray-400'
              }`} />
              <span className={`font-medium ${
                formData.educationTopics[topic.key] ? 'text-purple-900' : 'text-gray-700'
              }`}>
                {topic.label}
              </span>
            </label>
          ))}
        </div>

        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Education Notes
          </label>
          <textarea
            rows="3"
            placeholder="Document patient understanding, language used, materials provided..."
            className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-purple-500 outline-none"
          />
        </div>
      </div>
    );
  };

  // Step 3: Follow-up Plan
  const FollowupStep = () => (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="font-semibold text-blue-900">Follow-up Schedule</p>
        <p className="text-sm text-blue-700">
          Schedule and confirm follow-up contacts based on risk level.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { key: 'day3Call', label: 'Day 3 Phone Call', days: 3 },
          { key: 'day7Call', label: 'Day 7 Phone Call', days: 7 },
          { key: 'day14Call', label: 'Day 14 Phone Call', days: 14 },
          { key: 'day30Call', label: 'Day 30 Check-in', days: 30 },
          { key: 'homeVisit', label: 'Home Visit (CHW)', days: null },
          { key: 'clinicVisit', label: 'Clinic Follow-up', days: null }
        ].map((item) => (
          <label 
            key={item.key}
            className={`flex flex-col p-4 rounded-lg border-2 cursor-pointer transition-all ${
              formData.followupPlan[item.key]
                ? 'bg-blue-50 border-blue-300'
                : 'bg-white border-gray-200 hover:border-blue-200'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                checked={formData.followupPlan[item.key]}
                onChange={(e) => {
                  setFormData({
                    ...formData,
                    followupPlan: {
                      ...formData.followupPlan,
                      [item.key]: e.target.checked
                    }
                  });
                }}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <Clock className={`w-4 h-4 ${
                formData.followupPlan[item.key] ? 'text-blue-600' : 'text-gray-400'
              }`} />
            </div>
            <span className={`font-medium text-sm ${
              formData.followupPlan[item.key] ? 'text-blue-900' : 'text-gray-700'
            }`}>
              {item.label}
            </span>
            {item.days && (
              <span className="text-xs text-gray-500 mt-1">
                {new Date(Date.now() + item.days * 24 * 60 * 60 * 1000).toLocaleDateString()}
              </span>
            )}
          </label>
        ))}
      </div>

      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Primary Contact Number
        </label>
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Phone className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="tel"
              placeholder="Phone number for follow-up calls"
              value={formData.encounterData.primaryContactNumber}
              onChange={(e) => updateEncounterData({ primaryContactNumber: e.target.value })}
              className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none"
            />
          </div>
        </div>
        {!formData.encounterData.phoneAccess && (
          <p className="text-xs text-amber-600 mt-2">
            <AlertTriangle className="w-3 h-3 inline mr-1" />
            Patient has no phone access. Consider home visit or alternate contact.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 bg-white rounded-lg border border-gray-200">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Alternate Contact Number
          </label>
          <input
            type="tel"
            value={formData.followupPlan.alternateContactNumber}
            onChange={(e) =>
              setFormData((previous) => ({
                ...previous,
                followupPlan: {
                  ...previous.followupPlan,
                  alternateContactNumber: e.target.value
                }
              }))
            }
            placeholder="Caregiver or family contact"
            className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none"
          />
        </div>

        <div className="p-4 bg-white rounded-lg border border-gray-200">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Clinic Follow-up Date
          </label>
          <input
            type="date"
            value={formData.followupPlan.clinicVisitDate}
            onChange={(e) =>
              setFormData((previous) => ({
                ...previous,
                followupPlan: {
                  ...previous.followupPlan,
                  clinicVisitDate: e.target.value
                }
              }))
            }
            className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none"
          />
        </div>
      </div>
    </div>
  );

  // Step 4: Referral & Community
  const ReferralStep = () => (
    <div className="space-y-4">
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
        <p className="font-semibold text-emerald-900">Community Referrals</p>
        <p className="text-sm text-emerald-700">
          Coordinate with community health workers and other support services.
        </p>
      </div>

      <div className="space-y-3">
        {[
          { 
            key: 'chwVisit', 
            label: 'Community Health Worker Visit', 
            description: 'Schedule home visit within 48 hours of discharge',
            recommended: patient?.riskTier === 'High'
          },
          { 
            key: 'nutritionCounseling', 
            label: 'Nutrition Counseling', 
            description: 'For patients with diabetes or other dietary needs',
            recommended: patient?.diagnosis?.primary?.toLowerCase().includes('diabetes')
          },
          { 
            key: 'physiotherapy', 
            label: 'Physiotherapy', 
            description: 'For post-surgical or mobility-impaired patients',
            recommended: patient?.diagnosis?.primary?.toLowerCase().includes('fracture')
          },
          { 
            key: 'socialWork', 
            label: 'Social Work Referral', 
            description: 'For patients with social support concerns',
            recommended: patient?.socialHistory?.phoneAccess === false
          }
        ].map((referral) => (
          <label 
            key={referral.key}
            className={`flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${
              formData.referrals[referral.key]
                ? 'bg-emerald-50 border-emerald-300'
                : 'bg-white border-gray-200 hover:border-emerald-200'
            }`}
          >
            <input
              type="checkbox"
              checked={formData.referrals[referral.key]}
              onChange={(e) => {
                setFormData({
                  ...formData,
                  referrals: {
                    ...formData.referrals,
                    [referral.key]: e.target.checked
                  }
                });
              }}
              className="w-5 h-5 text-emerald-600 rounded mt-0.5"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className={`font-medium ${
                  formData.referrals[referral.key] ? 'text-emerald-900' : 'text-gray-700'
                }`}>
                  {referral.label}
                </span>
                {referral.recommended && (
                  <Badge variant="warning" size="sm">Recommended</Badge>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-1">{referral.description}</p>
            </div>
          </label>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            key: 'phoneAccess',
            label: 'Phone Access Available',
            description: 'Supports remote follow-up and adherence reminders.'
          },
          {
            key: 'transportationDifficulty',
            label: 'Transportation Difficulty',
            description: 'Patient may struggle to attend clinic reviews.'
          },
          {
            key: 'livesAlone',
            label: 'Lives Alone',
            description: 'Lower home support after discharge.'
          }
        ].map((item) => (
          <label
            key={item.key}
            className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
              formData.encounterData[item.key]
                ? 'bg-emerald-50 border-emerald-300'
                : 'bg-white border-gray-200 hover:border-emerald-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={Boolean(formData.encounterData[item.key])}
                onChange={(e) => updateEncounterData({ [item.key]: e.target.checked })}
                className="w-4 h-4 text-emerald-600 rounded"
              />
              <span className="font-medium text-gray-900">{item.label}</span>
            </div>
            <p className="text-sm text-gray-500 mt-2">{item.description}</p>
          </label>
        ))}
      </div>

      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Patient Address / Location
        </label>
        <div className="relative">
          <MapPin className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
          <input
            type="text"
            placeholder="Enter address for home visits"
            value={formData.encounterData.address}
            onChange={(e) => updateEncounterData({ address: e.target.value })}
            className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 rounded-lg focus:border-emerald-500 outline-none"
          />
        </div>
      </div>
    </div>
  );

  // Step 5: Discharge Summary
  const SummaryStep = () => (
    <div className="space-y-4">
      <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
        <p className="font-semibold text-teal-900">Discharge Summary</p>
        <p className="text-sm text-teal-700">
          Review all information and add any final notes before completing discharge.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500 mb-1">Patient</p>
          <p className="font-semibold text-gray-900">{patient?.name}</p>
          <p className="text-sm text-gray-600">{patient?.id}</p>
        </div>
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500 mb-1">Risk Level</p>
          <Badge variant={patient?.riskTier?.toLowerCase()}>{patient?.riskTier} Risk</Badge>
          <p className="text-sm text-gray-600 mt-1">Score: {patient?.riskScore}</p>
        </div>
      </div>

      <div className="p-4 bg-white border-2 border-gray-200 rounded-lg space-y-4">
        <div>
          <p className="font-semibold text-gray-900">Structured Prediction Dataset</p>
          <p className="text-sm text-gray-600">
            This encounter record is what gets persisted and scored by the ML service.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <label className="block">
            <span className="block text-sm font-semibold text-gray-700 mb-2">Admission Date</span>
            <input
              type="date"
              value={formData.encounterData.admissionDate}
              onChange={(e) => updateEncounterData({ admissionDate: e.target.value })}
              className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-teal-500 outline-none"
            />
          </label>
          <label className="block">
            <span className="block text-sm font-semibold text-gray-700 mb-2">Discharge Date</span>
            <input
              type="date"
              value={formData.encounterData.dischargeDate}
              onChange={(e) => updateEncounterData({ dischargeDate: e.target.value })}
              className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-teal-500 outline-none"
            />
          </label>
          <label className="block">
            <span className="block text-sm font-semibold text-gray-700 mb-2">Ward</span>
            <input
              type="text"
              value={formData.encounterData.ward}
              onChange={(e) => updateEncounterData({ ward: e.target.value })}
              placeholder="Medical Ward"
              className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-teal-500 outline-none"
            />
          </label>
          <label className="block xl:col-span-2">
            <span className="block text-sm font-semibold text-gray-700 mb-2">Diagnoses</span>
            <input
              type="text"
              value={formData.encounterData.diagnosesText}
              onChange={(e) => updateEncounterData({ diagnosesText: e.target.value })}
              placeholder="I50.9, E11.9, N18.3"
              className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-teal-500 outline-none"
            />
          </label>
          <label className="block">
            <span className="block text-sm font-semibold text-gray-700 mb-2">Discharge Disposition</span>
            <select
              value={formData.encounterData.dischargeDisposition}
              onChange={(e) => updateEncounterData({ dischargeDisposition: e.target.value })}
              className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-teal-500 outline-none"
            >
              <option value="home">Home</option>
              <option value="home_with_support">Home With Support</option>
              <option value="transfer">Transfer</option>
              <option value="rehabilitation">Rehabilitation</option>
            </select>
          </label>
          <label className="block">
            <span className="block text-sm font-semibold text-gray-700 mb-2">Length of Stay (Days)</span>
            <input
              type="number"
              min="0"
              step="1"
              value={formData.encounterData.lengthOfStay}
              onChange={(e) => updateEncounterData({ lengthOfStay: e.target.value })}
              className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-teal-500 outline-none"
            />
          </label>
        </div>
      </div>

      {/* Completed Steps Summary */}
      <div className="space-y-2">
        <h4 className="font-semibold text-gray-900">Completed Steps</h4>
        {steps.slice(0, 5).map((step, idx) => (
          <div key={step.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
              completedSteps.includes(idx) ? 'bg-teal-500 text-white' : 'bg-gray-300'
            }`}>
              {completedSteps.includes(idx) ? <Check className="w-4 h-4" /> : <span className="text-xs">{idx + 1}</span>}
            </div>
            <span className={`text-sm ${completedSteps.includes(idx) ? 'text-gray-900' : 'text-gray-500'}`}>
              {step.label}
            </span>
            {completedSteps.includes(idx) && <Check className="w-4 h-4 text-teal-600 ml-auto" />}
          </div>
        ))}
      </div>

      {/* Final Notes */}
      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Discharge Notes
        </label>
        <textarea
          rows="4"
          value={formData.dischargeNotes}
          onChange={(e) => setFormData({ ...formData, dischargeNotes: e.target.value })}
          placeholder="Add any final notes or special instructions..."
          className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-teal-500 outline-none"
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          variant="secondary"
          icon={<Bot className="w-4 h-4" />}
          onClick={handleExtractSummary}
          loading={isExtractingSummary}
          disabled={!String(formData.dischargeNotes || '').trim() || isExtractingSummary}
        >
          {isExtractingSummary ? 'Extracting...' : 'Auto-Extract Clinical Summary'}
        </Button>
      </div>

      {summaryError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{summaryError}</p>
        </div>
      )}

      {summaryInsights && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
          <p className="text-sm font-semibold text-blue-900">NLP Summary Insights</p>
          <p className="text-sm text-blue-800">{summaryInsights.summaryNarrative}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div>
              <p className="font-semibold text-blue-900">Diagnoses</p>
              <p className="text-blue-800">
                {summaryInsights?.entities?.diagnoses?.length
                  ? summaryInsights.entities.diagnoses.join(', ')
                  : 'None extracted'}
              </p>
            </div>
            <div>
              <p className="font-semibold text-blue-900">Medications</p>
              <p className="text-blue-800">
                {summaryInsights?.entities?.medications?.length
                  ? summaryInsights.entities.medications.join(', ')
                  : 'None extracted'}
              </p>
            </div>
            <div>
              <p className="font-semibold text-blue-900">Red Flags</p>
              <p className="text-blue-800">
                {summaryInsights?.entities?.redFlags?.length
                  ? summaryInsights.entities.redFlags.join(', ')
                  : 'None extracted'}
              </p>
            </div>
            <div>
              <p className="font-semibold text-blue-900">Recommended Tasks</p>
              <p className="text-blue-800">
                {summaryInsights?.recommendedTasks?.length
                  ? summaryInsights.recommendedTasks.join(' | ')
                  : 'No task recommendation'}
              </p>
            </div>
          </div>
        </div>
      )}

      {savedEncounter && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg space-y-2">
          <p className="text-sm font-semibold text-emerald-900">Encounter Saved</p>
          <div className="flex flex-wrap gap-2 text-sm text-emerald-800">
            <Badge variant="success">Visit {savedEncounter.id}</Badge>
            <span>{savedEncounter.ward || 'General'} Ward</span>
            <span>LOS: {savedEncounter.lengthOfStay ?? '--'} days</span>
          </div>
        </div>
      )}

      {predictionResult && (
        <div className="p-4 bg-teal-50 border-2 border-teal-200 rounded-lg space-y-4">
          <div>
            <p className="text-sm font-semibold text-teal-900">Latest Predicted Risk</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant={String(predictionResult.tier || '').toLowerCase() || 'default'}>
                {predictionResult.tier || 'Unknown'} Risk
              </Badge>
              <span className="text-sm text-teal-800">
                Score: {predictionResult.score ?? '--'}
              </span>
              {predictionResult.probability !== undefined && (
                <span className="text-sm text-teal-700">
                  Probability: {(Number(predictionResult.probability) * 100).toFixed(1)}%
                </span>
              )}
              {predictionResult.confidence !== undefined && (
                <span className="text-sm text-teal-700">
                  Confidence: {(Number(predictionResult.confidence) * 100).toFixed(0)}%
                </span>
              )}
              {predictionResult.method && (
                <Badge variant={predictionResult.method === 'ml' ? 'info' : 'warning'}>
                  {String(predictionResult.method).toUpperCase()}
                </Badge>
              )}
              {predictionResult.modelVersion && (
                <Badge variant="default">{predictionResult.modelVersion}</Badge>
              )}
            </div>
            {predictionResult.confidenceInterval && (
              <p className="mt-2 text-sm text-teal-800">
                Confidence interval: {predictionResult.confidenceInterval.low} - {predictionResult.confidenceInterval.high}
              </p>
            )}
            {predictionResult.explanation && (
              <p className="mt-3 text-sm text-teal-900">{predictionResult.explanation}</p>
            )}
          </div>

          {predictionResult.factors?.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-teal-900 mb-2">Top Drivers</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {predictionResult.factors.map((factor, index) => (
                  <div key={`${factor.factor || factor.label || index}-${index}`} className="p-3 bg-white rounded-lg border border-teal-100">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-semibold text-gray-900">
                        {factor.factor || factor.label || 'Unknown factor'}
                      </p>
                      <Badge variant={factor.direction === 'decrease' ? 'success' : 'danger'} size="sm">
                        {factor.direction || 'increase'}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-600 mt-2">
                      Weight {(Number(factor.weight || 0) * 100).toFixed(0)}%
                    </p>
                    {factor.impact && (
                      <p className="text-xs text-gray-500 mt-1">{factor.impact}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 bg-white rounded-lg border border-teal-100">
              <p className="text-sm font-semibold text-gray-900">Clinical Analysis</p>
              <p className="text-sm text-gray-600 mt-2">
                Lab abnormalities:{' '}
                {predictionResult.analysisSummary?.labAbnormalities?.length
                  ? predictionResult.analysisSummary.labAbnormalities.join(', ')
                  : 'None flagged'}
              </p>
              <p className="text-sm text-gray-600 mt-2">
                Social risk factors:{' '}
                {predictionResult.analysisSummary?.socialRiskFactors?.length
                  ? predictionResult.analysisSummary.socialRiskFactors.join(', ')
                  : 'No major barrier flagged'}
              </p>
              <p className="text-sm text-gray-600 mt-2">
                Utilization risk:{' '}
                {predictionResult.analysisSummary?.utilizationRiskLevel ||
                  predictionResult.analysisSummary?.utilizationRiskProfile ||
                  'Not available'}
              </p>
            </div>

            <div className="p-3 bg-white rounded-lg border border-teal-100">
              <p className="text-sm font-semibold text-gray-900">Data Quality</p>
              <p className="text-sm text-gray-600 mt-2">
                Completeness:{' '}
                {predictionResult.dataQuality?.completeness !== undefined
                  ? `${Math.round(Number(predictionResult.dataQuality.completeness) * 100)}%`
                  : 'Unknown'}
              </p>
              <p className="text-sm text-gray-600 mt-2">
                Missing critical fields:{' '}
                {predictionResult.analysisSummary?.missingData?.length
                  ? predictionResult.analysisSummary.missingData.join(', ')
                  : 'None'}
              </p>
              {predictionResult.escalationRequired && (
                <p className="text-sm text-amber-700 mt-2">
                  Escalation review recommended before discharge closeout.
                </p>
              )}
            </div>
          </div>

          {predictionResult.tasks?.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-teal-900 mb-2">Auto-Generated Tasks</p>
              <div className="space-y-2">
                {predictionResult.tasks.map((task) => (
                  <div key={task.id || `${task.title}-${task.category}`} className="p-3 bg-white rounded-lg border border-teal-100 flex flex-wrap items-center gap-2">
                    <span className="font-medium text-gray-900">{task.title}</span>
                    <Badge variant={task.priority === 'high' ? 'danger' : 'warning'} size="sm">
                      {task.priority || 'medium'}
                    </Badge>
                    <span className="text-sm text-gray-500">{task.category}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {predictionError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{predictionError}</p>
        </div>
      )}

      {/* Confirmation */}
      <label className="flex items-start gap-3 p-4 bg-teal-50 border-2 border-teal-200 rounded-lg cursor-pointer">
        <input type="checkbox" className="w-5 h-5 text-teal-600 rounded" />
        <span className="text-sm text-teal-900">
          I confirm that all discharge requirements have been completed and the patient/caregiver understands the follow-up plan.
        </span>
      </label>
    </div>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0:
        return ClinicalReadinessStep();
      case 1:
        return MedicationStep();
      case 2:
        return EducationStep();
      case 3:
        return FollowupStep();
      case 4:
        return ReferralStep();
      case 5:
      default:
        return SummaryStep();
    }
  };

  const handleCompleteDischarge = async () => {
    markStepComplete(currentStep);
    setPredictionError('');
    setSavedEncounter(null);
    setIsCompleting(true);

    let encounter = null;
    let prediction = null;
    try {
      const encounterPayload = buildEncounterPayload();
      await updatePatient(patient?.id, buildPatientPatch(encounterPayload));
      encounter = await createPatientEncounter(patient?.id, encounterPayload);
      setSavedEncounter(encounter);
      prediction = await generatePrediction(
        patient?.id,
        buildPredictionFeatures(encounterPayload),
        { visitId: encounter?.id }
      );
      setPredictionResult(prediction);
    } catch (error) {
      setPredictionError(
        error?.message || 'Encounter save or prediction generation failed. Please review the structured data and try again.'
      );
    } finally {
      setIsCompleting(false);
    }

    if (!encounter || !prediction) {
      return;
    }

    onComplete?.({
      workflow: formData,
      encounter,
      prediction,
      summaryInsights,
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <Button variant="ghost" onClick={onBack} icon={<ArrowLeft className="w-4 h-4" />}>
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Discharge Workflow</h1>
          {patient && (
            <p className="text-sm text-gray-600 flex flex-wrap items-center gap-2">
              {patient.name} | {patient.id} |
              <Badge variant={String(patient.riskTier || "").toLowerCase()}>
                {patient.riskTier} Risk
              </Badge>
            </p>
          )}
        </div>
      </div>

      {/* Progress Stepper */}
      <Card className="p-4 sm:p-6">
        <div className="overflow-x-auto">
          <div className="flex items-center justify-between min-w-[720px]">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            const isCompleted = completedSteps.includes(idx);
            const isActive = currentStep === idx;

            return (
              <div key={step.id} className="flex items-center flex-1">
                <button
                  onClick={() => goToStep(idx)}
                  className="flex flex-col items-center group"
                >
                  <div className={`
                    w-12 h-12 rounded-full flex items-center justify-center mb-2
                    transition-all duration-300
                    ${isCompleted ? 'bg-teal-600 text-white' : 
                      isActive ? 'bg-teal-100 text-teal-700 border-2 border-teal-600' : 
                      'bg-gray-200 text-gray-500 group-hover:bg-gray-300'}
                  `}>
                    {isCompleted ? <Check className="w-6 h-6" /> : <Icon className="w-5 h-5" />}
                  </div>
                  <span className={`text-xs font-medium text-center max-w-20 ${
                    isActive ? 'text-teal-700' : 'text-gray-600'
                  }`}>
                    {step.label}
                  </span>
                </button>
                {idx < steps.length - 1 && (
                  <div className={`flex-1 h-1 mx-2 ${
                    isCompleted ? 'bg-teal-600' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            );
          })}
          </div>
        </div>
      </Card>

      {/* Step Content */}
      <Card className="p-4 sm:p-6 sm:min-h-96">
        <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-6">
          {steps[currentStep].label}
        </h2>
        {renderCurrentStep()}
      </Card>

      {/* Navigation Buttons */}
      <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3">
        <Button
          variant="ghost"
          onClick={goPrevious}
          disabled={currentStep === 0}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>

        <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-3">
          <Button
            variant="secondary"
            onClick={() => markStepComplete(currentStep)}
            icon={<Save className="w-4 h-4" />}
          >
            Save Progress
          </Button>

          {currentStep < steps.length - 1 ? (
            <Button
              variant="primary"
              onClick={goNext}
              icon={<ArrowRight className="w-4 h-4" />}
            >
              Next Step
            </Button>
          ) : (
            <Button
              variant="success"
              onClick={handleCompleteDischarge}
              loading={isCompleting}
              disabled={isCompleting}
              icon={isCompleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            >
              {isCompleting ? 'Finalizing...' : 'Complete Discharge'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default DischargeWorkflow;
