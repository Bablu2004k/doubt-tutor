// Thin wrapper around the Gemini generateContent API.
// All three prompts force JSON-only output so the controllers can
// JSON.parse() the response directly.

const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models";

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000; // doubles each retry: 1s, 2s, 4s

/**
 * @param {{ system: string, messages: Array<{role: string, content: string | Array<object>}>, maxTokens?: number }} params
 */
async function callGemini({ system, messages, maxTokens = 1500 }) {
  // gemini-2.5-flash-lite has been gated off for new API keys/projects
  // ("no longer available to new users" 404s), even though it isn't
  // officially deprecated for existing users until Oct 2026. Pro models
  // were removed from the free tier entirely on April 1, 2026, and
  // Gemini 1.0/1.5/2.0 are fully sunset. gemini-3.1-flash-lite is the
  // current cost-efficient model still open to all users/free tier.
  // Override with GEMINI_MODEL if needed.
  const model = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";
  const url = `${GEMINI_URL}/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`;

  const body = {
    system_instruction: { parts: [{ text: system }] },
    contents: messages.map((msg) => ({
      role: msg.role === "user" ? "user" : "model",
      parts: toGeminiParts(msg.content),
    })),
    generationConfig: {
      maxOutputTokens: maxTokens,
      responseMimeType: "application/json",
    },
  };

  const data = await fetchWithRetry(url, body);

  const candidate = data.candidates?.[0];
  if (!candidate) {
    // e.g. blocked by safety filters -> promptFeedback explains why
    const reason = data.promptFeedback?.blockReason || "no candidates returned";
    throw new Error(`Gemini returned no usable response: ${reason}`);
  }

  const textPart = candidate.content?.parts?.find((p) => typeof p.text === "string");
  if (!textPart) throw new Error("Gemini response contained no text part");

  // Strip accidental markdown fences before parsing (belt-and-braces even
  // though responseMimeType: "application/json" should prevent them).
  const cleaned = textPart.text.replace(/```json|```/g, "").trim();
  return JSON.parse(cleaned);
}

/**
 * POSTs to the given Gemini URL, retrying on 429 (rate limit / quota
 * exhaustion) with exponential backoff. Honors the API's own
 * `retryDelay` hint when present instead of guessing.
 *
 * Hard-zero quota (limit: 0 on the relevant quotaMetric) is not a
 * transient condition retrying will fix, so we detect that case and
 * fail immediately with a clear message instead of burning through
 * retries pointlessly.
 */
async function fetchWithRetry(url, body) {
  let lastErr;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) return res.json();

    const errText = await res.text();

    if (res.status !== 429) {
      throw new Error(`Gemini API error (${res.status}): ${errText}`);
    }

    // Try to parse structured quota-failure details.
    let parsed;
    try {
      parsed = JSON.parse(errText);
    } catch {
      parsed = null;
    }

    // Gemini's structured QuotaFailure.violations don't include the numeric
    // limit, only quotaId/quotaMetric — the actual "limit: 0" shows up in
    // the free-text message. A limit of 0 means the project has no
    // allocation at all for this model, as opposed to a nonzero limit that
    // was simply burst past (which IS worth retrying).
    const violations =
      parsed?.error?.details?.find((d) => d["@type"]?.includes("QuotaFailure"))
        ?.violations || [];
    const hasZeroLimit = /limit:\s*0\b/.test(parsed?.error?.message || "");

    if (hasZeroLimit) {
      const metrics = violations.map((v) => v.quotaId).join(", ") || "see message above";
      throw new Error(
        `Gemini quota exhausted for this project/model (${metrics}). ` +
          `This usually means billing isn't linked or the model has no free-tier ` +
          `allocation, not a transient rate limit — retrying won't help. ` +
          `Check https://ai.dev/rate-limit and your project's billing settings.`
      );
    }

    lastErr = new Error(`Gemini API error (429): ${errText}`);
    if (attempt === MAX_RETRIES) break;

    const retryDelaySec = Number(
      parsed?.error?.details
        ?.find((d) => d["@type"]?.includes("RetryInfo"))
        ?.retryDelay?.replace("s", "")
    );
    const delayMs = Number.isFinite(retryDelaySec)
      ? retryDelaySec * 1000
      : BASE_DELAY_MS * 2 ** attempt;

    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  throw lastErr;
}

/**
 * Normalizes a message's `content` (either a plain string, or an
 * Anthropic-style array of {type: "text"|"image", ...} blocks) into
 * Gemini's `parts` array shape.
 */
function toGeminiParts(content) {
  if (typeof content === "string") {
    return [{ text: content }];
  }

  return content.map((block) => {
    if (block.type === "image") {
      return {
        inline_data: {
          mime_type: block.source?.media_type || "image/jpeg",
          data: block.source?.data,
        },
      };
    }
    // default: text block
    return { text: block.text };
  });
}

/**
 * Parses an uploaded problem (image or text) into a clean statement,
 * a topic tag, and an ordered list of solution steps.
 * @param {{ text?: string, imageBase64?: string, mediaType?: string, subject: string }} input
 */
export async function breakDownProblem({ text, imageBase64, mediaType, subject }) {
  const system = `You are an outstanding CS/DSA tutor answering a student's
doubt. Given their problem (as an image or as text), respond with ONLY a
JSON object, no preamble, no markdown fences, in exactly this shape:
{
  "problemStatement": string,   // cleaned-up restatement of the problem
  "topic": string,              // short topic tag, e.g. "Recursion - base case"
  "solution": string            // the full answer, written in flowing markdown
}

How to write "solution":
Answer the way a brilliant, clear-headed tutor would explain it directly to
the student in one continuous, well-organized response — not a rigid
numbered checklist. Write in natural paragraphs that reason through the
problem and arrive at the answer, the same way you'd talk someone through
it out loud: state the key idea first, then walk through why it works,
then land on the solution.

Use markdown, but lightly and only where it genuinely helps:
- Short paragraphs for the explanation and reasoning.
- Code blocks (\`\`\`language) for any code, pseudocode, or worked math.
- **Bold** for a term or insight worth highlighting, sparingly.
- Bullet points only for a genuinely flat list (e.g. edge cases to watch
  for) — never turn the main explanation itself into a numbered list of
  steps.
- Headings are almost never needed for a single doubt; skip them unless
  the problem truly has distinct parts (e.g. two sub-questions).

Be thorough but not padded — every sentence should earn its place. Close
with the concrete answer/result clearly stated, not buried in the middle.`;

  const content = [];
  if (imageBase64) {
    content.push({
      type: "image",
      source: { type: "base64", media_type: mediaType || "image/jpeg", data: imageBase64 },
    });
  }
  content.push({
    type: "text",
    text: text || `Subject: ${subject}. Break down the problem shown in the image.`,
  });

  return callGemini({
    system,
    messages: [{ role: "user", content }],
    maxTokens: 2000,
  });
}

/**
 * Generates a practice question for a given topic and difficulty.
 */
export async function generatePracticeQuestion({ topic, subject, difficulty = "medium" }) {
  const system = `You are a CS/DSA tutor generating one practice question.
Respond with ONLY a JSON object, no preamble, no markdown fences:
{
  "questionText": string,
  "options": string[],        // 4 options for MCQ, or [] for short-answer
  "correctAnswer": string,
  "explanation": string
}`;

  const userMsg = `Subject: ${subject}. Topic: ${topic}. Difficulty: ${difficulty}.
Generate one question that tests understanding of this specific topic.`;

  return callGemini({
    system,
    messages: [{ role: "user", content: userMsg }],
    maxTokens: 700,
  });
}

/**
 * Builds a phased learning roadmap from a goal and timeframe.
 */
export async function generateRoadmap({ goal, weeks }) {
  const system = `You are a curriculum designer. Respond with ONLY a JSON
object, no preamble, no markdown fences:
{
  "phases": [
    {
      "order": number,
      "title": string,
      "durationDays": number,
      "topics": string[],
      "checkpoints": string[]   // 2-3 short milestones to self-check progress
    }
  ]
}
Total durationDays across all phases should roughly equal weeks * 7.`;

  const userMsg = `Goal: ${goal}. Timeframe: ${weeks} weeks.
Build a phased roadmap.`;

  return callGemini({
    system,
    messages: [{ role: "user", content: userMsg }],
    maxTokens: 2000,
  });
}