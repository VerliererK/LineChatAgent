import { CONFIG } from "../utils/config";
import { streamText, LanguageModel } from 'ai';
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { createOpenAI } from "@ai-sdk/openai";

const DEFAULT_SYSTEM_ROLE = '';

const createModel = () => {
  let model: LanguageModel | undefined;

  if (CONFIG.LLM_PROVIDER === "openai") {
    if (CONFIG.LLM_BASE_URL) {
      const openai = createOpenAI({
        apiKey: CONFIG.LLM_API_KEY,
        baseURL: CONFIG.LLM_BASE_URL,
        compatibility: 'compatible',
      })
      model = openai(CONFIG.LLM_MODEL);
    } else {
      const openai = createOpenAI({
        apiKey: CONFIG.LLM_API_KEY,
        compatibility: 'strict',
      })
      model = openai(CONFIG.LLM_MODEL);
    }
  }
  else if (CONFIG.LLM_PROVIDER === "google") {
    const google = createGoogleGenerativeAI({
      apiKey: CONFIG.LLM_API_KEY,
    });
    model = google(CONFIG.LLM_MODEL);
  }
  return model;
}

export const createChat = async (messages: { role: 'user' | 'assistant' | 'system'; content: string }[]) => {
  const model = createModel();
  if (!model) {
    throw new Error("No model found");
  }

  const startTime = Date.now();

  const result = streamText({
    model,
    maxTokens: CONFIG.LLM_MAX_TOKENS,
    temperature: CONFIG.LLM_TEMPERATURE,
    system: CONFIG.LLM_SYSTEM_ROLE || DEFAULT_SYSTEM_ROLE,
    messages,
    onError: ({ error }) => {
      console.error(error);
      throw error;
    },
  });

  const controller = new AbortController();
  const { signal } = controller;
  setTimeout(() => controller.abort(), CONFIG.LLM_TIMEOUT);

  let message = "";
  for await (const textPart of result.textStream) {
    if (signal.aborted) break;
    message += textPart;
  }

  const finishReason = await result.finishReason;
  const usage = await result.usage;
  const totalTokens = usage?.totalTokens;
  const elapsed = Date.now() - startTime;
  console.log(`[Info]: token: ${totalTokens}, finish_reason: ${finishReason}, elapsed: ${elapsed}ms`);

  return { message, finishReason };
}
