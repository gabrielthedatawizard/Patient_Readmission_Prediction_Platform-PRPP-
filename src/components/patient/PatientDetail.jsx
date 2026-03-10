import React from 'react';
import { 
  ArrowLeft, User, Info, Shield, AlertTriangle, Database,
  Target, Pill, Phone, Heart, Calendar, Clock, FileText,
  CheckCircle, AlertCircle, MapPin, PhoneCall,
  Stethoscope, Activity
} from 'lucide-react';
import Card from '../common/Card';
import Badge from '../common/Badge';
import Button from '../common/Button';
import RiskScoreDisplay from '../common/RiskScoreDisplay';
import ShapExplanation from '../prediction/ShapExplanation';
import PredictionHistory from '../prediction/PredictionHistory';

/**
 * Patient Detail Component
 * Comprehensive patient profile with risk explanation and interventions
 */

const PatientDetail = ({
  patient,
  onBack,
  onStartDischarge,
  canOverridePrediction = false,
  onPredictionOverridden,
}) => {
  if (!patient) return null;

  // Mock clinical history data
  const clinicalHistory = patient.priorAdmissions > 0 ? [
    {
      date: patient.admissionDate,
      event: 'Current Admission',
      diagnosis: patient.diagnosis.primary,
      status: 'active'
    },
    {
      date: patient.priorAdmissionDates[0] || '2024-09-15',
      event: 'Previous Admission',
      diagnosis: 'Heart Failure Exacerbation',
      status: 'completed',
      readmittedAfter: '18 days'
    },
    ...(patient.priorAdmissionDates[1] ? [{
      date: patient.priorAdmissionDates[1],
      event: 'Previous Admission',
      diagnosis: 'Diabetic Ketoacidosis',
      status: 'completed'
    }] : [])
  ] : [
    {
      date: patient.admissionDate,
      event: 'Current Admission',
      diagnosis: patient.diagnosis.primary,
      status: 'active'
    }
  ];

  // Get risk factors sorted by weight
  const sortedRiskFactors = [...(patient.riskFactors || [])].sort((a, b) => b.weight - a.weight);

  // Get positive and negative factors
  const positiveFactors = sortedRiskFactors.filter(f => f.weight < 0);
  const negativeFactors = sortedRiskFactors.filter(f => f.weight > 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back Button */}
      <Button variant="ghost" onClick={onBack} icon={<ArrowLeft className="w-4 h-4" />}>
        Back to Dashboard
      </Button>

      {/* Patient Header */}
      <Card className="p-4 sm:p-6" gradient>
        <div className="flex flex-col lg:flex-row items-start justify-between gap-6">
          <div className="flex items-start gap-4 sm:gap-6">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-teal-500 to-teal-700 rounded-2xl flex items-center justify-center shadow-xl">
              <User className="w-10 h-10 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">{patient.name}</h1>
              <div className="flex items-center gap-3 flex-wrap">
                <Badge variant="default">{patient.id}</Badge>
                <Badge variant="default">MRN: {patient.mrn}</Badge>
                <span className="text-sm font-medium text-gray-700">
                  {patient.age} years | {patient.gender}
                </span>
                <Badge variant="primary">{patient.ward}</Badge>
                {patient.bed && <Badge variant="secondary">Bed {patient.bed}</Badge>}
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-3 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {patient.facility}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Admitted: {new Date(patient.admissionDate).toLocaleDateString()}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  LOS: {patient.lengthOfStay} days
                </span>
              </div>
            </div>
          </div>
          <RiskScoreDisplay 
            score={patient.riskScore} 
            tier={patient.riskTier} 
            confidence={patient.riskConfidence}
            showConfidence
            size="md" 
          />
        </div>

        {/* Diagnosis Section */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Stethoscope className="w-4 h-4" />
            Diagnosis
          </h3>
          <div className="flex flex-wrap gap-2">
            <Badge variant="primary" size="lg">{patient.diagnosis.primary}</Badge>
            {patient.diagnosis.secondary?.map((dx, idx) => (
              <Badge key={idx} variant="secondary" size="lg">{dx}</Badge>
            ))}
          </div>
          {patient.diagnosis.icd10 && (
            <p className="text-xs text-gray-500 mt-2">
              ICD-10: {patient.diagnosis.icd10.join(', ')}
            </p>
          )}
        </div>
      </Card>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Risk Explanation */}
        <Card className="lg:col-span-2 p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-6">
            <Info className="w-5 h-5 text-teal-600" />
            <h2 className="text-xl font-bold text-gray-900">Why This Risk Score?</h2>
          </div>

          {/* AI Transparency Notice */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-900 font-medium flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Decision Support Tool - Not a Diagnosis
            </p>
            <p className="text-xs text-blue-700 mt-1">
              This risk score is generated by AI to assist clinical decision-making. 
              Always use your clinical judgment and consider the full patient context.
            </p>
          </div>

          {/* Risk Factors */}
          <div className="space-y-6">
            {/* Negative/Protective Factors */}
            {positiveFactors.length > 0 && (
              <div>
                <h3 className="font-semibold text-emerald-700 mb-3 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Protective Factors
                </h3>
                <div className="space-y-3">
                  {positiveFactors.map((factor, idx) => (
                    <div key={idx} className="relative">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-gray-700">{factor.factor}</p>
                        <span className="text-sm font-bold text-emerald-600">
                          {(factor.weight * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="h-2 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600"
                          style={{ width: `${Math.abs(factor.weight) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Risk Factors */}
            {negativeFactors.length > 0 && (
              <div>
                <h3 className="font-semibold text-red-700 mb-3 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Risk Factors
                </h3>
                <div className="space-y-3">
                  {negativeFactors.map((factor, idx) => (
                    <div key={idx} className="relative">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-gray-700">{factor.factor}</p>
                        <span className="text-sm font-bold text-red-600">
                          +{(factor.weight * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="h-2 rounded-full bg-gradient-to-r from-red-400 to-red-600"
                          style={{ width: `${Math.abs(factor.weight) * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-xs text-gray-500 mt-1 capitalize">{factor.category}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <ShapExplanation factors={sortedRiskFactors.slice(0, 5)} />
            </div>
          </div>

          {/* Data Quality Note */}
          {patient.labs?.hba1c === null || patient.labs?.egfr === null ? (
            <div className="mt-6 p-4 bg-amber-50 border-2 border-amber-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-900">Data Quality Note</p>
                  <p className="text-xs text-amber-700 mt-1">
                    Missing lab values ({!patient.labs?.hba1c && 'HbA1c'}{!patient.labs?.hba1c && !patient.labs?.egfr && ', '}{!patient.labs?.egfr && 'eGFR'}) may affect prediction confidence. 
                    Consider ordering these tests before discharge.
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {/* Model Info */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-600 mb-2 flex items-center gap-1">
              <Database className="w-4 h-4" />
              Data Sources Used:
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="default">EMR Records</Badge>
              <Badge variant="default">Lab Results</Badge>
              <Badge variant="default">Prior Admissions</Badge>
              <Badge variant="default">Medications</Badge>
              <Badge variant="default">Social History</Badge>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Model: TRIP-v2.3 | Calibrated: Jan 2025 | AUC: 0.84 | Confidence: {(patient.riskConfidence * 100).toFixed(0)}%
            </p>
          </div>
        </Card>

        {/* Recommended Interventions */}
        <Card className="p-4 sm:p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">What To Do Now</h2>
          
          <div className="space-y-4">
            {/* Discharge Planning */}
            <div className="p-4 bg-teal-50 border-2 border-teal-200 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Target className="w-4 h-4 text-teal-600" />
                <p className="font-semibold text-sm text-teal-900">Discharge Planning</p>
              </div>
              <ul className="text-xs text-teal-800 space-y-1.5 ml-6 list-disc">
                <li>Complete comprehensive discharge plan</li>
                <li>Schedule follow-up within 7 days</li>
                <li>Ensure transport arranged</li>
              </ul>
            </div>

            {/* Medication */}
            <div className="p-4 bg-purple-50 border-2 border-purple-200 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Pill className="w-4 h-4 text-purple-600" />
                <p className="font-semibold text-sm text-purple-900">Medication</p>
              </div>
              <ul className="text-xs text-purple-800 space-y-1.5 ml-6 list-disc">
                <li>Medication reconciliation required</li>
                <li>Patient education on adherence</li>
                <li>Consider pill organizer</li>
              </ul>
            </div>

            {/* Follow-up */}
            <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Phone className="w-4 h-4 text-blue-600" />
                <p className="font-semibold text-sm text-blue-900">Follow-up</p>
              </div>
              <ul className="text-xs text-blue-800 space-y-1.5 ml-6 list-disc">
                <li>Phone call at day 3, 7, 14</li>
                <li>Home visit if available</li>
                <li>Emergency contact provided</li>
              </ul>
            </div>

            {/* Patient Education */}
            <div className="p-4 bg-emerald-50 border-2 border-emerald-200 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Heart className="w-4 h-4 text-emerald-600" />
                <p className="font-semibold text-sm text-emerald-900">Patient Education</p>
              </div>
              <ul className="text-xs text-emerald-800 space-y-1.5 ml-6 list-disc">
                <li>Warning signs review</li>
                <li>Self-care instructions (Swahili)</li>
                <li>Caregiver training</li>
              </ul>
            </div>
          </div>

          <Button 
            variant="primary" 
            size="lg" 
            className="w-full mt-6" 
            onClick={onStartDischarge}
            icon={<FileText className="w-4 h-4" />}
          >
            Start Discharge Workflow
          </Button>
        </Card>
      </div>

      <Card className="p-4 sm:p-6">
        <PredictionHistory
          patientId={patient.id}
          canOverride={canOverridePrediction}
          onPredictionOverridden={onPredictionOverridden}
        />
      </Card>

      {/* Clinical History & Vitals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Clinical History */}
        <Card className="p-4 sm:p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Activity className="w-5 h-5 text-teal-600" />
            Clinical History
          </h2>
          
          <div className="space-y-4">
            {clinicalHistory.map((event, idx) => (
              <div 
                key={idx} 
                className={`border-l-4 pl-4 py-2 ${
                  event.status === 'active' ? 'border-teal-500 bg-teal-50/30' :
                  event.status === 'completed' ? 'border-amber-500' :
                  'border-red-500'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{event.event}</p>
                    <p className="text-sm text-gray-700 mt-1">{event.diagnosis}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(event.date).toLocaleDateString()}
                      {event.readmittedAfter && ` | Readmitted after ${event.readmittedAfter}`}
                    </p>
                  </div>
                  {event.status === 'active' && (
                    <Badge variant="primary" dot>Active</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Current Vitals & Labs */}
        <Card className="p-4 sm:p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Activity className="w-5 h-5 text-teal-600" />
            Current Vitals & Labs
          </h2>
          
          {patient.vitals && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Vital Signs</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Blood Pressure</p>
                  <p className="text-lg font-bold text-gray-900">{patient.vitals.bloodPressure}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Heart Rate</p>
                  <p className="text-lg font-bold text-gray-900">{patient.vitals.heartRate} bpm</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">Temperature</p>
                  <p className="text-lg font-bold text-gray-900">{patient.vitals.temperature} C</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">SpO2</p>
                  <p className="text-lg font-bold text-gray-900">{patient.vitals.oxygenSaturation}%</p>
                </div>
              </div>
            </div>
          )}

          {patient.labs && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Key Lab Values</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {Object.entries(patient.labs).map(([key, value]) => (
                  value !== null && key !== 'lastUpdated' && (
                    <div key={key} className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                      <p className="text-lg font-bold text-gray-900">{value}</p>
                    </div>
                  )
                ))}
              </div>
            </div>
          )}

          {patient.medications && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Current Medications</h3>
              <div className="space-y-2">
                {patient.medications.map((med, idx) => (
                  <div key={idx} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 p-2 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-700">{med.name}</span>
                    <span className="text-xs text-gray-500">{med.dose} | {med.frequency}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Social History */}
      {patient.socialHistory && (
        <Card className="p-4 sm:p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <PhoneCall className="w-5 h-5 text-teal-600" />
            Social History
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500">Living Situation</p>
              <p className="text-sm font-medium text-gray-900">{patient.socialHistory.livingSituation}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500">Transportation</p>
              <p className="text-sm font-medium text-gray-900">{patient.socialHistory.transportation}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500">Phone Access</p>
              <p className="text-sm font-medium text-gray-900">
                {patient.socialHistory.phoneAccess ? 'Yes' : 'No'}
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default PatientDetail;

