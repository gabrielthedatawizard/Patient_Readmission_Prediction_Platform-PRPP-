/**
 * @jest-environment node
 */

describe('nlpService discharge summary', () => {
  const originalEnv = { ...process.env };
  const sampleInput = {
    notes:
      'Patient with heart failure and diabetes. No phone at home. Follow up in 7 days. ' +
      'Started furosemide 40 mg. Watch for shortness of breath.',
    workflow: {},
    patient: null,
    prediction: { tier: 'High' }
  };

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.resetModules();
    jest.restoreAllMocks();
  });

  test('extractDischargeSummary pulls entities deterministically', () => {
    const { extractDischargeSummary } = require('./nlpService');
    const result = extractDischargeSummary(sampleInput);

    expect(result.entities.diagnoses).toEqual(expect.arrayContaining(['heart failure', 'diabetes']));
    expect(result.entities.redFlags).toContain('shortness of breath');
    expect(result.entities.socialRisks).toContain('no phone');
    expect(result.followUpDays).toContain(7);
  });

  test('enhanceDischargeSummary returns baseline and does NOT call the LLM when disabled', async () => {
    delete process.env.LLM_ENABLED;
    delete process.env.GEMINI_API_KEY;

    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true, json: async () => ({}) });

    const { enhanceDischargeSummary } = require('./nlpService');
    const result = await enhanceDischargeSummary(sampleInput);

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result.llm.used).toBe(false);
    expect(result.llm.provider).toBeNull();
    expect(result.entities.diagnoses).toEqual(expect.arrayContaining(['heart failure']));
  });

  test('enhanceDischargeSummary falls back to baseline when the LLM call fails', async () => {
    process.env.LLM_ENABLED = 'true';
    process.env.GEMINI_API_KEY = 'test-key';

    jest.spyOn(global, 'fetch').mockResolvedValue({ ok: false, status: 500, json: async () => ({}) });

    const { enhanceDischargeSummary } = require('./nlpService');
    const result = await enhanceDischargeSummary(sampleInput);

    expect(result.llm.used).toBe(false);
    expect(result.summaryNarrative).toBeTruthy();
    expect(result.entities.redFlags).toContain('shortness of breath');
  });

  test('enhanceDischargeSummary merges LLM output when enabled and successful', async () => {
    process.env.LLM_ENABLED = 'true';
    process.env.GEMINI_API_KEY = 'test-key';

    const llmJson = {
      summaryNarrative: 'Patient discharged with heart failure; needs close follow-up.',
      personalizedCarePlan: ['Confirm 7-day callback', 'Arrange transport for clinic visit'],
      patientFriendlyInstructions: ['Weigh yourself daily', 'Call if breathing worsens']
    };
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: JSON.stringify(llmJson) }] } }]
      })
    });

    const { enhanceDischargeSummary } = require('./nlpService');
    const result = await enhanceDischargeSummary(sampleInput);

    expect(result.llm.used).toBe(true);
    expect(result.llm.provider).toBe('google-gemini');
    expect(result.summaryNarrative).toBe(llmJson.summaryNarrative);
    expect(result.personalizedCarePlan).toEqual(llmJson.personalizedCarePlan);
    expect(result.patientFriendlyInstructions).toHaveLength(2);
  });
});
