import { getSettings } from '../lib/neon';

export const getLLMSettings = async () => {
  const settings = await getSettings();

  return {
    LLM_PROVIDER: settings?.provider ?? "vercel",
    LLM_BASE_URL: settings?.base_url ?? "",
    LLM_API_KEY: settings?.api_key ?? "",
    LLM_MODEL: settings?.model ?? "openai/gpt-5",
    LLM_SYSTEM_ROLE: settings?.system_role ?? "",
    LLM_MAX_TOKENS: Number(settings?.max_tokens) || 4096,
    LLM_TEMPERATURE: Number(settings?.temperature) || undefined,
    LLM_TIMEOUT: Number(settings?.timeout) || 58000,
  };
};
