/**
 * Optional generative-AI client (Google Gemini).
 *
 * DISABLED BY DEFAULT. The service is only active when BOTH:
 *   - LLM_ENABLED=true
 *   - GEMINI_API_KEY is set
 *
 * When inactive, callers must fall back to deterministic logic and NO patient
 * data is transmitted to any external service. Enabling this transmits PHI
 * (e.g. discharge notes) to Google's API and therefore requires data-protection
 * / governance sign-off before use.
 */

const GEMINI_BASE_URL =
  process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
const LLM_ENABLED = String(process.env.LLM_ENABLED || 'false').trim().toLowerCase() === 'true';
const LLM_TIMEOUT_MS = Number(process.env.LLM_TIMEOUT_MS) || 8000;

function isLlmConfigured() {
  return LLM_ENABLED && Boolean(GEMINI_API_KEY);
}

function getLlmRuntimeConfig() {
  return {
    provider: 'google-gemini',
    model: GEMINI_MODEL,
    enabledFlag: LLM_ENABLED,
    keyPresent: Boolean(GEMINI_API_KEY),
    active: isLlmConfigured(),
    timeoutMs: LLM_TIMEOUT_MS
  };
}

function extractCandidateText(payload) {
  const parts = payload?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) {
    return '';
  }
  return parts
    .map((part) => (typeof part?.text === 'string' ? part.text : ''))
    .join('')
    .trim();
}

/**
 * Sends a prompt to Gemini and parses a strict-JSON response.
 * Returns the parsed object, or null on any failure / when inactive — callers
 * treat null as "use the deterministic fallback".
 */
async function generateJson(prompt, { timeoutMs = LLM_TIMEOUT_MS } = {}) {
  if (!isLlmConfigured() || !prompt) {
    return null;
  }

  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const url = `${GEMINI_BASE_URL.replace(/\/$/, '')}/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GEMINI_API_KEY
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json'
        }
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      return null;
    }

    const payload = await response.json();
    const text = extractCandidateText(payload);
    if (!text) {
      return null;
    }

    try {
      return JSON.parse(text);
    } catch (parseError) {
      return null;
    }
  } catch (error) {
    return null;
  } finally {
    clearTimeout(timeoutHandle);
  }
}

module.exports = {
  isLlmConfigured,
  getLlmRuntimeConfig,
  generateJson
};
