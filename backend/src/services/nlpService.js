const { isLlmConfigured, generateJson } = require('./llmService');

const KNOWN_DIAGNOSES = [
  'heart failure',
  'hypertension',
  'diabetes',
  'asthma',
  'copd',
  'stroke',
  'pneumonia',
  'kidney disease'
];

const KNOWN_SOCIAL_RISKS = [
  'no phone',
  'transport',
  'lives alone',
  'caregiver unavailable',
  'missed follow-up',
  'cost barrier'
];

const RED_FLAG_TERMS = [
  'shortness of breath',
  'chest pain',
  'fever',
  'confusion',
  'fainting',
  'severe pain',
  'bleeding',
  'swelling'
];

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function splitSentences(text) {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function uniqueList(items) {
  return Array.from(new Set(items.filter(Boolean)));
}

function extractMedicationMentions(text) {
  const medicationPattern =
    /\b([A-Za-z][A-Za-z0-9-]{2,})\s+(\d{1,4}\s?(?:mg|mcg|g|ml))\b/gi;
  const results = [];
  let match = medicationPattern.exec(text);
  while (match) {
    results.push(`${match[1]} ${match[2]}`);
    match = medicationPattern.exec(text);
  }

  return uniqueList(results).slice(0, 8);
}

function extractMatches(text, terms) {
  const lower = text.toLowerCase();
  return terms.filter((term) => lower.includes(term));
}

function extractFollowUpWindowDays(text, workflow = {}) {
  const days = [];
  const regex = /(\d{1,2})\s*[- ]?\s*(?:day|days)\b/gi;
  let match = regex.exec(text);
  while (match) {
    const value = Number(match[1]);
    if (Number.isFinite(value) && value > 0 && value <= 90) {
      days.push(value);
    }
    match = regex.exec(text);
  }

  const followupPlan = workflow.followupPlan || {};
  if (followupPlan.day3Call) {
    days.push(3);
  }
  if (followupPlan.day7Call) {
    days.push(7);
  }
  if (followupPlan.day14Call) {
    days.push(14);
  }
  if (followupPlan.day30Call) {
    days.push(30);
  }

  const uniqueDays = uniqueList(days).sort((a, b) => a - b);
  return uniqueDays.length ? uniqueDays : [7];
}

function buildRecommendedTasks({ riskTier, redFlags, socialRisks, followUpDays }) {
  const tasks = [];

  if (riskTier === 'High') {
    tasks.push('Prioritize 48-hour clinical callback.');
  }

  if (redFlags.length) {
    tasks.push('Reinforce emergency warning signs with patient/caregiver.');
  }

  if (socialRisks.length) {
    tasks.push('Assign CHW follow-up for social risk mitigation.');
  }

  if (followUpDays.includes(7)) {
    tasks.push('Schedule and confirm 7-day follow-up visit/call.');
  }

  if (!tasks.length) {
    tasks.push('Continue standard discharge follow-up protocol.');
  }

  return tasks;
}

function extractDischargeSummary({
  notes = '',
  workflow = {},
  patient = null,
  prediction = null
} = {}) {
  const normalizedNotes = normalizeText(notes);
  const sentences = splitSentences(normalizedNotes);
  const summaryNarrative =
    sentences.length > 0
      ? sentences.slice(0, 2).join(' ')
      : 'No free-text discharge note provided.';

  const diagnoses = uniqueList([
    ...extractMatches(normalizedNotes, KNOWN_DIAGNOSES),
    patient?.diagnosis?.primary || null,
    patient?.clinicalProfile?.primaryDiagnosis || null
  ]).slice(0, 6);

  const medications = extractMedicationMentions(normalizedNotes);
  const redFlags = extractMatches(normalizedNotes, RED_FLAG_TERMS);
  const socialRisks = uniqueList([
    ...extractMatches(normalizedNotes, KNOWN_SOCIAL_RISKS),
    patient?.socialHistory?.phoneAccess === false ? 'no phone' : null,
    workflow?.referrals?.socialWork ? 'social work referral flagged' : null
  ]);
  const followUpDays = extractFollowUpWindowDays(normalizedNotes, workflow);
  const riskTier = String(prediction?.tier || patient?.riskTier || 'Medium');

  return {
    extractedAt: new Date().toISOString(),
    summaryNarrative,
    riskTier,
    entities: {
      diagnoses,
      medications,
      redFlags,
      socialRisks
    },
    followUpDays,
    recommendedTasks: buildRecommendedTasks({
      riskTier,
      redFlags,
      socialRisks,
      followUpDays
    })
  };
}

function buildEnhancementPrompt(baseline, notes) {
  return [
    'You are a clinical discharge-planning assistant for a Tanzanian hospital readmission-prevention program.',
    'You are given a discharge note and a baseline rule-based extraction.',
    'Return STRICT JSON only, with exactly these keys:',
    '  "summaryNarrative": a plain-language summary (<= 2 sentences) for a community health worker.',
    '  "personalizedCarePlan": an array of <= 5 concise, actionable follow-up steps tailored to this patient.',
    '  "patientFriendlyInstructions": an array of <= 4 short instructions in simple language.',
    'Rules: Do NOT invent diagnoses, medications, or facts not present in the note or baseline.',
    'Do NOT add identifiers or PII beyond what is provided. If information is missing, keep guidance general.',
    '',
    `Discharge note: """${notes}"""`,
    `Baseline entities: ${JSON.stringify(baseline.entities)}`,
    `Risk tier: ${baseline.riskTier}. Planned follow-up days: ${baseline.followUpDays.join(', ')}.`
  ].join('\n');
}

function sanitizeStringList(value, max) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((item) => typeof item === 'string' && item.trim())
    .map((item) => item.trim())
    .slice(0, max);
}

/**
 * Computes the deterministic baseline extraction, then — only when the LLM is
 * explicitly enabled and configured — enriches it with a generated narrative
 * and personalized care plan. On any LLM failure the baseline is returned
 * unchanged. The returned `llm.used` flag records whether the note was sent to
 * the external provider (for audit / governance traceability).
 */
async function enhanceDischargeSummary(input = {}) {
  const baseline = extractDischargeSummary(input);
  // Stable response shape regardless of whether the LLM ran.
  const withoutLlm = (llm) => ({
    ...baseline,
    personalizedCarePlan: [],
    patientFriendlyInstructions: [],
    llm
  });

  if (!isLlmConfigured()) {
    return withoutLlm({ used: false, provider: null });
  }

  try {
    const enriched = await generateJson(buildEnhancementPrompt(baseline, normalizeText(input.notes)));
    if (!enriched || typeof enriched !== 'object') {
      return withoutLlm({ used: false, provider: 'google-gemini', reason: 'no_response' });
    }

    const summaryNarrative =
      typeof enriched.summaryNarrative === 'string' && enriched.summaryNarrative.trim()
        ? enriched.summaryNarrative.trim()
        : baseline.summaryNarrative;

    return {
      ...baseline,
      summaryNarrative,
      personalizedCarePlan: sanitizeStringList(enriched.personalizedCarePlan, 5),
      patientFriendlyInstructions: sanitizeStringList(enriched.patientFriendlyInstructions, 4),
      llm: { used: true, provider: 'google-gemini' }
    };
  } catch (error) {
    return withoutLlm({ used: false, provider: 'google-gemini', reason: 'error' });
  }
}

module.exports = {
  extractDischargeSummary,
  enhanceDischargeSummary
};

