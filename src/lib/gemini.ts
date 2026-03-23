import https from "https";

export type GeminiSettings = {
  baseUrl: string;
  apiKey: string;
  model: string;
};

export type AiSettings = GeminiSettings;

export const DEFAULT_GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
export const DEFAULT_GEMINI_MODEL = "gemini-2.5-pro";

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  error?: {
    message?: string;
  };
  promptFeedback?: {
    blockReason?: string;
  };
};

const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);
const MAX_RETRY_ATTEMPTS = 3;
const BASE_RETRY_DELAY_MS = 600;
const GEMINI_REQUEST_TIMEOUT_MS = 10000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function cleanJsonBlock(input: string) {
  return input
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function shouldUseInsecureTls(url: URL) {
  return (
    url.hostname === "moacode.org" ||
    process.env.GEMINI_ALLOW_INSECURE_TLS === "1" ||
    process.env.ALLOW_INSECURE_TLS === "1"
  );
}

function normalizeBaseUrl(baseUrl?: string) {
  return baseUrl?.trim().replace(/\/$/, "") || DEFAULT_GEMINI_BASE_URL;
}

function normalizeModel(model?: string) {
  return model?.trim().replace(/^models\//, "") || DEFAULT_GEMINI_MODEL;
}

async function postJson<T>(
  url: string,
  body: Record<string, unknown>,
  timeoutMs = GEMINI_REQUEST_TIMEOUT_MS
): Promise<{ status: number; payload: T }> {
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const rawBody = JSON.stringify(body);

    const request = https.request(
      target,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(rawBody)
        },
        rejectUnauthorized: !shouldUseInsecureTls(target)
      },
      (response) => {
        const chunks: Buffer[] = [];

        response.on("data", (chunk) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });

        response.on("end", () => {
          const raw = Buffer.concat(chunks).toString("utf8");

          if (!raw) {
            resolve({
              status: response.statusCode || 500,
              payload: {} as T
            });
            return;
          }

          try {
            const payload = JSON.parse(raw) as T;
            resolve({
              status: response.statusCode || 500,
              payload
            });
          } catch {
            reject(new Error("gemini_invalid_json_response"));
          }
        });
      }
    );

    request.on("error", reject);
    request.setTimeout(timeoutMs, () => {
      request.destroy(new Error("gemini_timeout"));
    });
    request.write(rawBody);
    request.end();
  });
}

export function getEnvGeminiSettings(): GeminiSettings | null {
  if (!process.env.GEMINI_API_KEY?.trim()) {
    return null;
  }

  return {
    baseUrl: process.env.GEMINI_BASE_URL || DEFAULT_GEMINI_BASE_URL,
    apiKey: process.env.GEMINI_API_KEY,
    model: process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL
  };
}

export async function runGeminiTextPrompt({
  prompt,
  systemInstruction,
  settings,
  temperature,
  timeoutMs,
  maxAttempts
}: {
  prompt: string;
  systemInstruction: string;
  settings: GeminiSettings;
  temperature?: number;
  timeoutMs?: number;
  maxAttempts?: number;
}) {
  const baseUrl = normalizeBaseUrl(settings.baseUrl);
  const model = normalizeModel(settings.model);
  const endpoint = new URL(`${baseUrl}/models/${encodeURIComponent(model)}:generateContent`);
  endpoint.searchParams.set("key", settings.apiKey.trim());
  const attempts = Math.max(1, maxAttempts || MAX_RETRY_ATTEMPTS);

  let status = 500;
  let payload: GeminiResponse = {};

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const response = await postJson<GeminiResponse>(
      endpoint.toString(),
      {
      systemInstruction: {
        parts: [
          {
            text: systemInstruction
          }
        ]
      },
      contents: [
        {
          role: "user",
          parts: [
            {
              text: prompt
            }
          ]
        }
      ],
      generationConfig: {
        responseMimeType: "application/json",
        ...(typeof temperature === "number" ? { temperature } : {})
      }
      },
      timeoutMs
    );

    status = response.status;
    payload = response.payload;

    if (status >= 200 && status < 300) {
      break;
    }

    if (!RETRYABLE_STATUS_CODES.has(status) || attempt === attempts) {
      throw new Error(payload.error?.message || `gemini_error_${status}`);
    }

    await sleep(BASE_RETRY_DELAY_MS * attempt);
  }

  const content = payload.candidates
    ?.flatMap((candidate) => candidate.content?.parts || [])
    .map((part) => part.text)
    .filter((text): text is string => Boolean(text))
    .join("\n")
    .trim();

  if (!content) {
    if (payload.promptFeedback?.blockReason) {
      throw new Error(`gemini_blocked_${payload.promptFeedback.blockReason.toLowerCase()}`);
    }

    throw new Error("gemini_empty_response");
  }

  return content;
}
