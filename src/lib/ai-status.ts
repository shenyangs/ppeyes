import { getEnvAiSettings } from "@/lib/gemini";

export function hasLiveAiConfigured() {
  return Boolean(getEnvAiSettings()?.providers?.length);
}
