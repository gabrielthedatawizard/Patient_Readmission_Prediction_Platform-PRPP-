import React, { useState } from 'react';
import { 
  ArrowLeft, Stethoscope, Pill, MessageSquare, Calendar, 
  Home, FileText, Check, ArrowRight, AlertTriangle,
  User, Phone, MapPin, Clock, CheckCircle, Save, Loader2, Bot
} from 'lucide-react';
import Card from '../common/Card';
import Badge from '../common/Badge';
import Button from '../common/Button';
import { extractDischargeSummary, generatePrediction } from '../../services/mlService';

/**
 * Discharge Workflow Component
 * 6-step discharge process for patient discharge planning
 */

const DischargeWorkflow = ({ patient, onBack, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isExtractingSummary, setIsExtractingSummary] = useState(false);
  const [predictionResult, setPredictionResult] = useState(null);
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
    medications: patient?.medications?.map(med => ({
      ...med,
      continue: true,
      modified: false,
      newDose: ''
    })) || [],
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
      clinicVisit: true
    },
    // Step 4: Referral
    referrals: {
      chwVisit: patient?.riskTier === 'High',
      nutritionCounseling: false,
      physiotherapy: false,
      socialWork: patient?.socialHistory?.phoneAccess === false
    },
    // Step 5: Summary
    dischargeNotes: ''
  });

  const buildPredictionFeatures = () => {
    const profile = patient?.clinicalProfile || {};
    const diagnosis = patient?.diagnosis?.primary || profile.primaryDiagnosis || 'Unknown';

    return {
      age: Number(patient?.age || profile.age || 0),
      gender: patient?.gender || profile.gender || 'Unknown',
      diagnosis,
      lengthOfStay: Number(patient?.lengthOfStay || profile.lengthOfStayDays || 0),
      priorAdmissions6mo: Number(patient?.priorAdmissions || profile.priorAdmissions12m || 0),
      charlsonIndex: Number(profile.charlsonIndex || 0),
    };
  };

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
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {formData.medications.map((med, idx) => (
              <tr key={idx} className={med.continue ? '' : 'bg-gray-50'}>
                <td className="py-3 px-4">
                  <p className="font-medium text-gray-900">{med.name}</p>
                  <p className="text-xs text-gray-500">{med.route}</p>
                </td>
                <td className="py-3 px-4 text-sm text-gray-700">{med.dose}</td>
                <td className="py-3 px-4 text-sm text-gray-700">{med.frequency}</td>
                <td className="py-3 px-4 text-center">
                  <input
                    type="checkbox"
                    checked={med.continue}
                    onChange={(e) => {
                      const newMeds = [...formData.medications];
                      newMeds[idx].continue = e.target.checked;
                      setFormData({ ...formData, medications: newMeds });
                    }}
                    className="w-4 h-4 text-teal-600 rounded"
                  />
                </td>
                <td className="py-3 px-4">
                  <input
                    type="text"
                    placeholder="Add notes..."
                    value={med.notes || ''}
                    onChange={(e) => {
                      const newMeds = [...formData.medications];
                      newMeds[idx].notes = e.target.value;
                      setFormData({ ...formData, medications: newMeds });
                    }}
                    className="w-full text-sm border border-gray-200 rounded px-2 py-1"
                  />
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

      <Button variant="secondary" className="w-full">
        + Add New Medication
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
              defaultValue={patient?.socialHistory?.phoneAccess ? '' : ''}
              className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none"
            />
          </div>
        </div>
        {!patient?.socialHistory?.phoneAccess && (
          <p className="text-xs text-amber-600 mt-2">
            <AlertTriangle className="w-3 h-3 inline mr-1" />
            Patient has no phone access. Consider home visit or alternate contact.
          </p>
        )}
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

      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Patient Address / Location
        </label>
        <div className="relative">
          <MapPin className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
          <input
            type="text"
            placeholder="Enter address for home visits"
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

      {predictionResult && (
        <div className="p-4 bg-teal-50 border-2 border-teal-200 rounded-lg">
          <p className="text-sm font-semibold text-teal-900">Latest Predicted Risk</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant={String(predictionResult.tier || '').toLowerCase() || 'default'}>
              {predictionResult.tier || 'Unknown'} Risk
            </Badge>
            <span className="text-sm text-teal-800">
              Score: {predictionResult.score ?? '--'}
            </span>
            {predictionResult.confidence !== undefined && (
              <span className="text-sm text-teal-700">
                Confidence: {(Number(predictionResult.confidence) * 100).toFixed(0)}%
              </span>
            )}
          </div>
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

  const stepComponents = [
    ClinicalReadinessStep,
    MedicationStep,
    EducationStep,
    FollowupStep,
    ReferralStep,
    SummaryStep
  ];

  const CurrentStepComponent = stepComponents[currentStep];

  const handleCompleteDischarge = async () => {
    markStepComplete(currentStep);
    setPredictionError('');
    setIsCompleting(true);

    let prediction = null;
    try {
      prediction = await generatePrediction(patient?.id, buildPredictionFeatures());
      setPredictionResult(prediction);
    } catch (error) {
      setPredictionError(error?.message || 'Prediction generation failed. Discharge can still proceed.');
    } finally {
      setIsCompleting(false);
    }

    onComplete?.({
      workflow: formData,
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
        <CurrentStepComponent />
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
