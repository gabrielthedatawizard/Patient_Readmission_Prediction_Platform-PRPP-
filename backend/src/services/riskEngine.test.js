const { predictReadmission } = require('./riskEngine');

describe('riskEngine', () => {
  test('produces explainable high-risk output for severe patient profile', () => {
    const prediction = predictReadmission({
      age: 79,
      priorAdmissions12m: 4,
      lengthOfStayDays: 12,
      charlsonIndex: 6,
      egfr: 41,
      hemoglobin: 8.9,
      hba1c: 9.4,
      bpSystolic: 155,
      bpDiastolic: 96,
      phoneAccess: false,
      transportationDifficulty: true,
      livesAlone: true,
      highRiskMedicationCount: 2,
      icuStayDays: 3
    });

    expect(prediction.tier).toBe('High');
    expect(prediction.score).toBeGreaterThanOrEqual(70);
    expect(prediction.factors.length).toBeGreaterThan(0);
    expect(prediction.factors.length).toBeLessThanOrEqual(5);
    expect(prediction.confidenceInterval.low).toBeLessThanOrEqual(prediction.score);
    expect(prediction.confidenceInterval.high).toBeGreaterThanOrEqual(prediction.score);
  });

  test('falls back to logistic scoring when primary model fails', () => {
    const prediction = predictReadmission(
      {
        age: 66,
        priorAdmissions12m: 2,
        lengthOfStayDays: 8,
        charlsonIndex: 3,
        phoneAccess: true,
        transportationDifficulty: true,
        livesAlone: false,
        egfr: 55,
        hba1c: 8,
        bpSystolic: 145,
        bpDiastolic: 90,
        hemoglobin: 10.8
      },
      {
        forcePrimaryFailure: true
      }
    );

    expect(prediction.fallbackUsed).toBe(true);
    expect(prediction.modelType).toBe('logistic_fallback');
    expect(prediction.modelVersion).toContain('fallback');
  });

  test('reports missing critical data and imputed values transparently', () => {
    const prediction = predictReadmission({
      age: 58,
      priorAdmissions12m: 0,
      lengthOfStayDays: 2,
      charlsonIndex: 1,
      phoneAccess: true,
      transportationDifficulty: false,
      livesAlone: false,
      highRiskMedicationCount: 0
    });

    expect(prediction.dataQuality.completeness).toBeLessThan(1);
    expect(prediction.dataQuality.missingCriticalFields.length).toBeGreaterThan(0);
    expect(Object.keys(prediction.dataQuality.imputedValues).length).toBeGreaterThan(0);
  });
});
