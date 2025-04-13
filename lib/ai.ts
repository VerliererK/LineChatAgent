import { CONFIG } from "../utils/config";
import { z } from 'zod';
import { tool, streamText, LanguageModel } from 'ai';
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { createOpenAI } from "@ai-sdk/openai";

export interface ToolExecutors {
  clear?: () => Promise<boolean>;
}

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

const createTools = (executor: ToolExecutors = {}) => {
  const tools: Record<string, any> = {
    get_date: tool({
      description: '取得最新日期時間 (Get the current datetime)',
      parameters: z.object({}),
      execute: async () => {
        return new Date().toLocaleString("zh-TW", { timeZone: "Asia/Taipei", hourCycle: "h24" });
      },
    }),
    clear: tool({
      description: '清除與 AI 的聊天紀錄 (Clear the chat history with the AI)',
      parameters: z.object({}),
      execute: async () => {
        if (executor.clear) {
          const success = await executor.clear();
          return success ? "Successfully cleared chat history" : "Failed to clear chat history";
        }
        return "Clear function not configured";
      },
    }),
  };
  return tools;
}

export const createChat = async (messages: { role: 'user' | 'assistant' | 'system'; content: string }[], executor: ToolExecutors = {}) => {
  const model = createModel();
  if (!model) {
    throw new Error("No model found");
  }

  const tools = createTools(executor);

  const startTime = Date.now();

  const result = streamText({
    model,
    maxTokens: CONFIG.LLM_MAX_TOKENS,
    temperature: CONFIG.LLM_TEMPERATURE,
    system: CONFIG.LLM_SYSTEM_ROLE || DEFAULT_SYSTEM_ROLE,
    messages,
    tools: tools,
    maxSteps: 5,
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

  const steps = await result.steps;
  const toolResults = steps.flatMap(step => step.toolResults);
  const toolUsage = toolResults.map(r => r.toolName).join(',');
  const finishReason = await result.finishReason;
  const usage = await result.usage;
  const totalTokens = usage?.totalTokens;
  const elapsed = Date.now() - startTime;
  console.log(`[Info]: token: ${totalTokens}, finish_reason: ${finishReason}, tool_usage: ${toolUsage}, elapsed: ${elapsed}ms`);

  return { message, finishReason };
}
