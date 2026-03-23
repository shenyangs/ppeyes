import https from "https";

export type GeminiSettings = {
  provider: "gemini";
  baseUrl: string;
  apiKey: string;
  model: string;
};

export type MiniMaxSettings = {
  provider: "minimax";
  baseUrl: string;
  apiKey: string;
  model: string;
};

export type AiProviderSettings = GeminiSettings | MiniMaxSettings;

export type AiSettings = {
  providers: AiProviderSettings[];
};

export const DEFAULT_GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
export const DEFAULT_GEMINI_MODEL = "gemini-2.5-pro";
export const DEFAULT_MINIMAX_BASE_URL = "https://api.minimax.io/v1";
export const DEFAULT_MINIMAX_MODEL = "MiniMax-M2.7";
const MINIMAX_MODEL_FALLBACKS = ["MiniMax-M2.5"];
const GEMINI_REQUEST_TIMEOUT_MS = 10000;
const MINIMAX_REQUEST_TIMEOUT_MS = 30000;

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

type MiniMaxResponse = {
  choices?: Array<{
    message?: {
      content?: string | Array<{ text?: string }>;
    };
  }>;
  error?: {
    message?: string;
  };
  base_resp?: {
    status_code?: number;
    status_msg?: string;
  };
};

const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);
const MAX_RETRY_ATTEMPTS = 3;
const BASE_RETRY_DELAY_MS = 600;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function cleanJsonBlock(input: string) {
  return input
    .replace(/<think>[\s\S]*?<\/think>\s*/gi, "")
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function extractFirstJsonCandidate(input: string) {
  const cleaned = cleanJsonBlock(input);
  const startIndex = cleaned.search(/[\[{]/);

  if (startIndex === -1) {
    return cleaned;
  }

  const opening = cleaned[startIndex];
  const closing = opening === "{" ? "}" : "]";
  let depth = 0;
  let inString = false;
  let isEscaped = false;

  for (let index = startIndex; index < cleaned.length; index += 1) {
    const char = cleaned[index];

    if (inString) {
      if (isEscaped) {
        isEscaped = false;
        continue;
      }

      if (char === "\\") {
        isEscaped = true;
        continue;
      }

      if (char === '"') {
        inString = false;
      }

      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === opening) {
      depth += 1;
      continue;
    }

    if (char === closing) {
      depth -= 1;

      if (depth === 0) {
        return cleaned.slice(startIndex, index + 1).trim();
      }
    }
  }

  return cleaned.slice(startIndex).trim();
}

export function parseModelJson<T>(input: string) {
  return JSON.parse(extractFirstJsonCandidate(input)) as T;
}

function shouldUseInsecureTls(url: URL) {
  return (
    url.hostname === "moacode.org" ||
    process.env.GEMINI_ALLOW_INSECURE_TLS === "1" ||
    process.env.MINIMAX_ALLOW_INSECURE_TLS === "1" ||
    process.env.ALLOW_INSECURE_TLS === "1"
  );
}

function normalizeBaseUrl(baseUrl: string | undefined, defaultBaseUrl: string) {
  return baseUrl?.trim().replace(/\/$/, "") || defaultBaseUrl;
}

function normalizeModel(model: string | undefined, defaultModel: string) {
  return model?.trim().replace(/^models\//, "") || defaultModel;
}

function normalizeMiniMaxEndpoints(baseUrl: string) {
  const trimmed = baseUrl.trim().replace(/\/$/, "");

  if (trimmed.endsWith("/text/chatcompletion_v2")) {
    return [trimmed];
  }

  if (trimmed.endsWith("/chat/completions")) {
    return [trimmed, trimmed.replace(/\/chat\/completions$/, "/text/chatcompletion_v2")];
  }

  return [`${trimmed}/text/chatcompletion_v2`, `${trimmed}/chat/completions`];
}

function normalizeMiniMaxModels(model: string | undefined) {
  const primaryModel = normalizeModel(model, DEFAULT_MINIMAX_MODEL);
  const candidates = [primaryModel];

  MINIMAX_MODEL_FALLBACKS.forEach((candidate) => {
    if (candidate !== primaryModel) {
      candidates.push(candidate);
    }
  });

  return candidates;
}

async function postJson<T>(
  url: string,
  body: Record<string, unknown>,
  timeoutMs = GEMINI_REQUEST_TIMEOUT_MS,
  headers?: Record<string, string>
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
          "Content-Length": Buffer.byteLength(rawBody).toString(),
          ...(headers || {})
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

function buildGeminiSettings(): GeminiSettings | null {
  if (!process.env.GEMINI_API_KEY?.trim()) {
    return null;
  }

  return {
    provider: "gemini",
    baseUrl: process.env.GEMINI_BASE_URL || DEFAULT_GEMINI_BASE_URL,
    apiKey: process.env.GEMINI_API_KEY,
    model: process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL
  };
}

function buildMiniMaxSettings(): MiniMaxSettings | null {
  if (!process.env.MINIMAX_API_KEY?.trim()) {
    return null;
  }

  return {
    provider: "minimax",
    baseUrl: process.env.MINIMAX_BASE_URL || DEFAULT_MINIMAX_BASE_URL,
    apiKey: process.env.MINIMAX_API_KEY,
    model: process.env.MINIMAX_MODEL || DEFAULT_MINIMAX_MODEL
  };
}

export function getEnvAiSettings(): AiSettings | null {
  const providers = [buildMiniMaxSettings(), buildGeminiSettings()].filter(
    (provider): provider is AiProviderSettings => Boolean(provider)
  );

  if (providers.length === 0) {
    return null;
  }

  return { providers };
}

export const getEnvGeminiSettings = getEnvAiSettings;

async function runGeminiTextPromptWithProvider({
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
  const baseUrl = normalizeBaseUrl(settings.baseUrl, DEFAULT_GEMINI_BASE_URL);
  const model = normalizeModel(settings.model, DEFAULT_GEMINI_MODEL);
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

function extractMiniMaxContent(payload: MiniMaxResponse) {
  const content = payload.choices?.[0]?.message?.content;

  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => part?.text?.trim())
      .filter((text): text is string => Boolean(text))
      .join("\n");
  }

  return "";
}

async function runMiniMaxTextPromptWithProvider({
  prompt,
  systemInstruction,
  settings,
  temperature,
  timeoutMs,
  maxAttempts
}: {
  prompt: string;
  systemInstruction: string;
  settings: MiniMaxSettings;
  temperature?: number;
  timeoutMs?: number;
  maxAttempts?: number;
}) {
  const baseUrl = normalizeBaseUrl(settings.baseUrl, DEFAULT_MINIMAX_BASE_URL);
  const modelCandidates = normalizeMiniMaxModels(settings.model);
  const endpointCandidates = normalizeMiniMaxEndpoints(baseUrl);
  const attempts = Math.max(1, maxAttempts || MAX_RETRY_ATTEMPTS);
  const providerTimeoutMs = timeoutMs ?? MINIMAX_REQUEST_TIMEOUT_MS;
  const endpointErrors: string[] = [];

  for (const model of modelCandidates) {
    for (const endpointCandidate of endpointCandidates) {
      const endpoint = new URL(endpointCandidate);
      let status = 500;
      let payload: MiniMaxResponse = {};

      for (let attempt = 1; attempt <= attempts; attempt += 1) {
        const response = await postJson<MiniMaxResponse>(
          endpoint.toString(),
          {
            model,
            messages: [
              {
                role: "system",
                content: systemInstruction,
                name: "system"
              },
              {
                role: "user",
                content: prompt,
                name: "user"
              }
            ],
            ...(typeof temperature === "number" ? { temperature } : {})
          },
          providerTimeoutMs,
          {
            Authorization: `Bearer ${settings.apiKey.trim()}`
          }
        );

        status = response.status;
        payload = response.payload;

        if (status >= 200 && status < 300) {
          const content = extractMiniMaxContent(payload).trim();

          if (!content) {
            throw new Error(payload.error?.message || payload.base_resp?.status_msg || "minimax_empty_response");
          }

          return content;
        }

        if (!RETRYABLE_STATUS_CODES.has(status) || attempt === attempts) {
          break;
        }

        await sleep(BASE_RETRY_DELAY_MS * attempt);
      }

      endpointErrors.push(
        `${model}@${endpoint.pathname}:${payload.error?.message || payload.base_resp?.status_msg || `minimax_error_${status}`}`
      );
    }
  }

  throw new Error(endpointErrors.join(" | "));
}

export async function runAiTextPrompt({
  prompt,
  systemInstruction,
  settings,
  temperature,
  timeoutMs,
  maxAttempts
}: {
  prompt: string;
  systemInstruction: string;
  settings: AiSettings;
  temperature?: number;
  timeoutMs?: number;
  maxAttempts?: number;
}) {
  const errors: string[] = [];

  for (const provider of settings.providers) {
    try {
      if (provider.provider === "gemini") {
        return await runGeminiTextPromptWithProvider({
          prompt,
          systemInstruction,
          settings: provider,
          temperature,
          timeoutMs,
          maxAttempts
        });
      }

      return await runMiniMaxTextPromptWithProvider({
        prompt,
        systemInstruction,
        settings: provider,
        temperature,
        timeoutMs,
        maxAttempts
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : "unknown_error";
      errors.push(`${provider.provider}:${reason}`);
      console.error(`[ai] ${provider.provider} request failed: ${reason}`);

      if (settings.providers.length > 1) {
        console.warn(`[ai] ${provider.provider} failed, trying next provider: ${reason}`);
      }
    }
  }

  throw new Error(errors.length ? `all_ai_providers_failed:${errors.join(" | ")}` : "ai_request_failed");
}

export const runGeminiTextPrompt = runAiTextPrompt;
