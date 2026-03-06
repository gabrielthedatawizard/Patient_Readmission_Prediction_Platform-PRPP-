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

module.exports = {
  extractDischargeSummary
};

