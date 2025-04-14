export const CONFIG = {
  API_HOST: `https://${process.env.VERCEL_URL}`,

  // required
  LINE_CHANNEL_ACCESS_TOKEN: process.env.LINE_CHANNEL_ACCESS_TOKEN ?? "",
  LINE_CHANNEL_SECRET: process.env.LINE_CHANNEL_SECRET ?? "",
  FIREBASE_CONFIG: process.env.FIREBASE_CONFIG ?? "",

  // required
  LLM_PROVIDER: process.env.LLM_PROVIDER ?? "google",
  LLM_BASE_URL: process.env.LLM_BASE_URL ?? "",
  LLM_API_KEY: process.env.LLM_API_KEY ?? "",
  LLM_MODEL: process.env.LLM_MODEL ?? "gemini-2.0-flash",
  LLM_SYSTEM_ROLE: process.env.LLM_SYSTEM_ROLE ?? "",
  LLM_MAX_TOKENS: Number(process.env.LLM_MAX_TOKENS) || 600,
  LLM_TEMPERATURE: Number(process.env.LLM_TEMPERATURE) || undefined,
  LLM_TIMEOUT: Number(process.env.LLM_TIMEOUT) || 58000,

  // optional
  GOOGLE_MAP_API_KEY: process.env.GOOGLE_MAP_API_KEY,
  TAVILY_API_KEY: process.env.TAVILY_API_KEY,
};
