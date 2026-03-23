const { buildPredictionFeatures } = require('./predictionFeatureBuilder');

describe('predictionFeatureBuilder', () => {
  test('builds ML-ready features from structured visit data and visit history', () => {
    const patient = {
      id: 'PT-1',
      age: 72,
      gender: 'female',
      insurance: 'NHIF',
      facilityId: 'FAC-1',
      clinicalProfile: {
        phoneAccess: true,
        transportationDifficulty: false,
        livesAlone: true
      }
    };

    const currentVisit = {
      id: 'VIS-2',
      patientId: 'PT-1',
      facilityId: 'FAC-1',
      admissionDate: '2026-03-15T08:00:00.000Z',
      diagnosis: 'I50.9',
      diagnoses: ['I50.9', 'N18.3'],
      medications: [{ name: 'Furosemide' }, { name: 'Warfarin' }],
      labResults: { egfr: 41, hemoglobin: 9.4, hba1c: 8.7 },
      vitalSigns: { bpSystolic: 152, bpDiastolic: 94 },
      socialFactors: { transportationDifficulty: true, phoneAccess: false },
      lengthOfStay: 12
    };

    const visits = [
      currentVisit,
      {
        id: 'VIS-1',
        patientId: 'PT-1',
        facilityId: 'FAC-1',
        admissionDate: '2026-01-10T09:00:00.000Z'
      },
      {
        id: 'VIS-0',
        patientId: 'PT-1',
        facilityId: 'FAC-1',
        admissionDate: '2025-09-10T09:00:00.000Z'
      }
    ];

    const { modelFeatures, featureSnapshot, analysisSummary } = buildPredictionFeatures({
      patient,
      visit: currentVisit,
      visits
    });

    expect(modelFeatures.age).toBe(72);
    expect(modelFeatures.priorAdmissions6mo).toBe(1);
    expect(modelFeatures.priorAdmissions12m).toBe(2);
    expect(modelFeatures.highRiskMedicationCount).toBe(2);
    expect(modelFeatures.hasHeartFailure).toBe(true);
    expect(modelFeatures.hasCkd).toBe(true);
    expect(featureSnapshot.encounter.diagnoses).toEqual(['I50.9', 'N18.3']);
    expect(featureSnapshot.labs.egfr).toBe(41);
    expect(analysisSummary.labAbnormalities).toContain('reduced_kidney_function');
    expect(analysisSummary.socialRiskFactors).toContain('no_phone_access');
  });

  test('honors request feature overrides over stored data', () => {
    const { modelFeatures, featureSnapshot } = buildPredictionFeatures({
      patient: {
        id: 'PT-2',
        age: 40,
        gender: 'male',
        facilityId: 'FAC-1',
        clinicalProfile: {
          charlsonIndex: 1,
          priorAdmissions12m: 0
        }
      },
      visit: null,
      visits: [],
      requestFeatures: {
        age: 51,
        charlsonIndex: 4,
        priorAdmissions12m: 3,
        diagnoses: ['E11.9'],
        medications: ['Insulin']
      }
    });

    expect(modelFeatures.age).toBe(51);
    expect(modelFeatures.charlsonIndex).toBe(4);
    expect(modelFeatures.priorAdmissions12m).toBe(3);
    expect(modelFeatures.highRiskMedicationCount).toBe(1);
    expect(featureSnapshot.requestOverrides).toContain('charlsonIndex');
  });
});
