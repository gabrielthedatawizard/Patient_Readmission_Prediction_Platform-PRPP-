/**
 * Sample Patient Data
 * Realistic Tanzania patient scenarios (anonymized)
 */

export const SAMPLE_PATIENTS = [
  {
    id: 'PT-2025-0847',
    mrn: 'MNH-847392',
    name: 'Amina Mwambungu',
    age: 67,
    gender: 'Female',
    facility: 'Muhimbili National Hospital',
    facilityId: 'FAC-001',
    ward: 'Medical Ward B',
    bed: 'B-12',
    admissionDate: '2025-01-20',
    expectedDischarge: '2025-02-02',
    diagnosis: {
      primary: 'Congestive Heart Failure',
      secondary: ['Type 2 Diabetes Mellitus', 'Hypertension'],
      icd10: ['I50.9', 'E11.9', 'I10']
    },
    riskScore: 78,
    riskTier: 'High',
    riskConfidence: 0.87,
    priorAdmissions: 3,
    priorAdmissionDates: ['2024-09-15', '2024-06-10', '2024-02-20'],
    lengthOfStay: 12,
    vitals: {
      bloodPressure: '145/92',
      heartRate: 88,
      temperature: 36.8,
      oxygenSaturation: 94,
      lastUpdated: '2025-02-01T08:30:00'
    },
    labs: {
      creatinine: 1.8,
      bun: 28,
      hba1c: null, // Missing
      egfr: null, // Missing
      sodium: 138,
      potassium: 4.2
    },
    medications: [
      { name: 'Furosemide', dose: '40mg', frequency: 'Daily', route: 'PO' },
      { name: 'Metformin', dose: '500mg', frequency: 'BID', route: 'PO' },
      { name: 'Enalapril', dose: '10mg', frequency: 'Daily', route: 'PO' },
      { name: 'Aspirin', dose: '75mg', frequency: 'Daily', route: 'PO' }
    ],
    socialHistory: {
      livingSituation: 'Lives with daughter',
      transportation: 'Limited - relies on family',
      phoneAccess: true,
      primaryLanguage: 'Swahili',
      literacyLevel: 'Basic'
    },
    riskFactors: [
      { factor: 'Multiple prior admissions (3 in 6 months)', weight: 0.35, category: 'clinical' },
      { factor: 'Comorbidities: Diabetes + Heart Failure', weight: 0.28, category: 'clinical' },
      { factor: 'Extended length of stay (12 days)', weight: 0.18, category: 'clinical' },
      { factor: 'Missing lab values (eGFR, HbA1c)', weight: 0.12, category: 'data' },
      { factor: 'Age > 65 years', weight: 0.07, category: 'demographic' }
    ],
    interventionsNeeded: [
      { type: 'medication-reconciliation', priority: 'high', status: 'pending' },
      { type: 'patient-education', priority: 'high', status: 'pending' },
      { type: 'followup-7day', priority: 'high', status: 'pending' },
      { type: 'caregiver-training', priority: 'medium', status: 'pending' }
    ]
  },

  {
    id: 'PT-2025-0921',
    mrn: 'MNH-921456',
    name: 'Joseph Kitwanga',
    age: 45,
    gender: 'Male',
    facility: 'Muhimbili National Hospital',
    facilityId: 'FAC-001',
    ward: 'Surgical Ward A',
    bed: 'A-08',
    admissionDate: '2025-01-28',
    expectedDischarge: '2025-02-01',
    diagnosis: {
      primary: 'Acute Appendicitis, Post-Appendectomy',
      secondary: [],
      icd10: ['K35.8', 'Z48.8']
    },
    riskScore: 23,
    riskTier: 'Low',
    riskConfidence: 0.92,
    priorAdmissions: 0,
    priorAdmissionDates: [],
    lengthOfStay: 3,
    vitals: {
      bloodPressure: '118/76',
      heartRate: 72,
      temperature: 36.5,
      oxygenSaturation: 98,
      lastUpdated: '2025-02-01T09:15:00'
    },
    labs: {
      wbc: 8.2,
      hemoglobin: 13.5,
      creatinine: 0.9,
      sodium: 140,
      potassium: 4.0
    },
    medications: [
      { name: 'Paracetamol', dose: '1g', frequency: 'TID', route: 'PO' },
      { name: 'Metronidazole', dose: '500mg', frequency: 'TID', route: 'PO' }
    ],
    socialHistory: {
      livingSituation: 'Lives with spouse and children',
      transportation: 'Adequate',
      phoneAccess: true,
      primaryLanguage: 'Swahili',
      literacyLevel: 'Good'
    },
    riskFactors: [
      { factor: 'Uncomplicated surgery', weight: -0.15, category: 'clinical' },
      { factor: 'No prior admissions', weight: -0.20, category: 'clinical' },
      { factor: 'Normal post-op recovery', weight: -0.10, category: 'clinical' },
      { factor: 'Good social support', weight: -0.08, category: 'social' }
    ],
    interventionsNeeded: [
      { type: 'wound-care-education', priority: 'medium', status: 'completed' },
      { type: 'followup-14day', priority: 'medium', status: 'scheduled' }
    ]
  },

  {
    id: 'PT-2025-0856',
    mrn: 'TRRH-856201',
    name: 'Grace Massawe',
    age: 52,
    gender: 'Female',
    facility: 'Temeke Regional Hospital',
    facilityId: 'FAC-005',
    ward: 'Medical Ward C',
    bed: 'C-15',
    admissionDate: '2025-01-25',
    expectedDischarge: '2025-02-02',
    diagnosis: {
      primary: 'Community-Acquired Pneumonia',
      secondary: ['Chronic Bronchitis'],
      icd10: ['J18.9', 'J41.0']
    },
    riskScore: 54,
    riskTier: 'Medium',
    riskConfidence: 0.81,
    priorAdmissions: 1,
    priorAdmissionDates: ['2024-10-15'],
    lengthOfStay: 7,
    vitals: {
      bloodPressure: '128/82',
      heartRate: 84,
      temperature: 37.1,
      oxygenSaturation: 96,
      lastUpdated: '2025-02-01T07:45:00'
    },
    labs: {
      wbc: 11.2,
      crp: 45,
      creatinine: 1.1,
      sodium: 139,
      potassium: 3.9
    },
    medications: [
      { name: 'Amoxicillin-Clavulanate', dose: '875mg', frequency: 'BID', route: 'PO' },
      { name: 'Salbutamol Inhaler', dose: '2 puffs', frequency: 'QID', route: 'Inhalation' },
      { name: 'Prednisolone', dose: '30mg', frequency: 'Daily', route: 'PO' }
    ],
    socialHistory: {
      livingSituation: 'Lives alone',
      transportation: 'Limited',
      phoneAccess: false,
      primaryLanguage: 'Swahili',
      literacyLevel: 'Basic'
    },
    riskFactors: [
      { factor: 'Chronic respiratory condition', weight: 0.22, category: 'clinical' },
      { factor: 'One prior admission (4 months ago)', weight: 0.18, category: 'clinical' },
      { factor: 'Social support concerns noted', weight: 0.14, category: 'social' },
      { factor: 'No phone access for follow-up', weight: 0.10, category: 'social' }
    ],
    interventionsNeeded: [
      { type: 'medication-reconciliation', priority: 'high', status: 'in-progress' },
      { type: 'inhaler-technique-education', priority: 'high', status: 'pending' },
      { type: 'community-health-worker-visit', priority: 'high', status: 'pending' },
      { type: 'followup-7day', priority: 'high', status: 'pending' }
    ]
  },

  {
    id: 'PT-2025-0902',
    mrn: 'BMC-902134',
    name: 'Daniel Mtui',
    age: 34,
    gender: 'Male',
    facility: 'Bugando Medical Centre',
    facilityId: 'FAC-002',
    ward: 'Surgical Ward D',
    bed: 'D-22',
    admissionDate: '2025-01-27',
    expectedDischarge: '2025-02-03',
    diagnosis: {
      primary: 'Open Fracture of Tibia and Fibula',
      secondary: [],
      icd10: ['S82.2']
    },
    riskScore: 38,
    riskTier: 'Medium',
    riskConfidence: 0.85,
    priorAdmissions: 0,
    priorAdmissionDates: [],
    lengthOfStay: 5,
    vitals: {
      bloodPressure: '125/78',
      heartRate: 76,
      temperature: 36.7,
      oxygenSaturation: 99,
      lastUpdated: '2025-02-01T10:00:00'
    },
    labs: {
      hemoglobin: 12.8,
      wbc: 9.5,
      creatinine: 0.8
    },
    medications: [
      { name: 'Ceftriaxone', dose: '1g', frequency: 'BID', route: 'IV' },
      { name: 'Tramadol', dose: '50mg', frequency: 'QID PRN', route: 'PO' }
    ],
    socialHistory: {
      livingSituation: 'Lives with parents',
      transportation: 'Adequate',
      phoneAccess: true,
      primaryLanguage: 'Swahili',
      literacyLevel: 'Good',
      occupation: 'Motorcycle taxi driver'
    },
    riskFactors: [
      { factor: 'Mobility limitations post-surgery', weight: 0.20, category: 'clinical' },
      { factor: 'Occupational barrier to recovery', weight: 0.12, category: 'social' },
      { factor: 'Requires IV antibiotics completion', weight: 0.08, category: 'clinical' }
    ],
    interventionsNeeded: [
      { type: 'mobility-training', priority: 'high', status: 'in-progress' },
      { type: 'wound-care-education', priority: 'high', status: 'pending' },
      { type: 'followup-7day', priority: 'medium', status: 'pending' },
      { type: 'followup-14day', priority: 'medium', status: 'pending' }
    ]
  }
];

export const getPatientById = (id) => {
  return SAMPLE_PATIENTS.find(p => p.id === id);
};

export const getPatientsByFacility = (facilityId) => {
  return SAMPLE_PATIENTS.filter(p => p.facilityId === facilityId);
};

export const getPatientsByRiskTier = (tier) => {
  return SAMPLE_PATIENTS.filter(p => p.riskTier === tier);
};

export const getHighRiskPatients = () => {
  return SAMPLE_PATIENTS.filter(p => p.riskTier === 'High');
};

export default SAMPLE_PATIENTS;
