/**
 * Claude API client wrapper for MEDICHIPS-LINK.
 *
 * Uses raw fetch against the Anthropic Messages API so we avoid a hard
 * dependency on @anthropic-ai/sdk.  Provides:
 *   - callClaude()     – returns plain text
 *   - callClaudeJson() – returns parsed + typed JSON
 *
 * Both helpers retry up to 3 times with exponential back-off on
 * transient (429 / 5xx) errors and surface a clear message otherwise.
 */

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const API_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL = "claude-sonnet-4-20250514";
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1_000;

// ─── Types ──────────────────────────────────────────────────────────────

export interface ClaudeMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ClaudeCallOptions {
  system?: string;
  messages: ClaudeMessage[];
  maxTokens?: number;
  temperature?: number;
  model?: string;
}

interface ClaudeApiResponse {
  id: string;
  type: "message";
  role: "assistant";
  content: { type: "text"; text: string }[];
  model: string;
  stop_reason: string | null;
  usage: { input_tokens: number; output_tokens: number };
}

interface ClaudeApiError {
  type: "error";
  error: { type: string; message: string };
}

// ─── Helpers ────────────────────────────────────────────────────────────

function isRetryable(status: number): boolean {
  return status === 429 || status >= 500;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Core call ──────────────────────────────────────────────────────────

/**
 * Call the Claude Messages API and return the assistant's text response.
 */
export async function callClaude(options: ClaudeCallOptions): Promise<string> {
  if (!ANTHROPIC_API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Add it to your environment variables."
    );
  }

  const {
    system,
    messages,
    maxTokens = 4_096,
    temperature = 0.3,
    model = DEFAULT_MODEL,
  } = options;

  const body: Record<string, unknown> = {
    model,
    max_tokens: maxTokens,
    temperature,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  };
  if (system) {
    body.system = system;
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errorBody = (await res.json().catch(() => null)) as
          | ClaudeApiError
          | null;
        const msg =
          errorBody?.error?.message ?? `HTTP ${res.status} ${res.statusText}`;

        if (isRetryable(res.status) && attempt < MAX_RETRIES - 1) {
          const backoff = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
          console.warn(
            `[claude] Retryable error (${res.status}), attempt ${attempt + 1}/${MAX_RETRIES}. ` +
              `Waiting ${backoff}ms…`
          );
          await sleep(backoff);
          lastError = new Error(msg);
          continue;
        }

        throw new Error(`Claude API error (${res.status}): ${msg}`);
      }

      const data = (await res.json()) as ClaudeApiResponse;
      const textBlock = data.content.find((c) => c.type === "text");
      if (!textBlock) {
        throw new Error("Claude returned no text content.");
      }
      return textBlock.text;
    } catch (err) {
      if (
        err instanceof TypeError &&
        err.message.includes("fetch") &&
        attempt < MAX_RETRIES - 1
      ) {
        // Network error – retry
        const backoff = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
        console.warn(
          `[claude] Network error, attempt ${attempt + 1}/${MAX_RETRIES}. ` +
            `Waiting ${backoff}ms…`
        );
        await sleep(backoff);
        lastError = err;
        continue;
      }
      throw err;
    }
  }

  throw lastError ?? new Error("Claude API call failed after retries.");
}

// ─── JSON call ──────────────────────────────────────────────────────────

/**
 * Call Claude and parse the response as JSON.
 *
 * The system prompt is appended with an instruction to respond ONLY
 * with valid JSON (no markdown fences). The caller provides a generic
 * type `T` for compile-time safety; runtime validation should be done
 * by the caller (e.g. with Zod).
 */
export async function callClaudeJson<T>(options: {
  system?: string;
  messages: ClaudeMessage[];
  maxTokens?: number;
  temperature?: number;
  model?: string;
}): Promise<T> {
  const jsonInstruction =
    "IMPORTANT: You MUST respond with valid JSON only. " +
    "Do NOT wrap the JSON in markdown code fences or add any text outside the JSON object. " +
    "Do NOT include comments inside the JSON.";

  const system = options.system
    ? `${options.system}\n\n${jsonInstruction}`
    : jsonInstruction;

  const raw = await callClaude({
    ...options,
    system,
    temperature: options.temperature ?? 0.1, // lower temp for structured output
  });

  // Strip markdown fences if Claude ignores the instruction
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    throw new Error(
      `Failed to parse Claude JSON response. Raw output:\n${raw.slice(0, 500)}`
    );
  }
}
