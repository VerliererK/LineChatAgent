import DEFAULT_SYSTEM_ROLE from "./DEFAULT_SYSTEM_ROLE";
import { CONFIG } from "../utils/config";
import { z } from 'zod';
import { tool, streamText, LanguageModel, CoreMessage } from 'ai';
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { createOpenAI } from "@ai-sdk/openai";

export interface ToolExecutors {
  clear?: () => Promise<boolean>;
}

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
  if (CONFIG.GOOGLE_MAP_API_KEY) {
    tools.geocode = tool({
      description: "使用 Google Maps 取得地點的經緯度。輸入地址或地點名稱，回傳該地點的經緯度。例如：'台北車站'。",
      parameters: z.object({
        address: z.string().describe("要查詢的地址或地點名稱，例如：'台北車站'。"),
      }),
      execute: async ({ address }) => {
        const result = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${CONFIG.GOOGLE_MAP_API_KEY}`)
          .then(response => response.json())
          .catch(err => {
            console.error('[Error] geocode: ', err);
            return `Error: ${err.message}`;
          });
        return result;
      },
    });
    tools.weather = tool({
      description: "使用 Google Maps 取得地點的天氣資訊。輸入經緯度，回傳該地點的天氣資訊。例如：'25.0478, 121.517'。",
      parameters: z.object({
        latitude: z.number().describe("要查詢的地點緯度，例如：25.0478。"),
        longitude: z.number().describe("要查詢的地點經度，例如：121.517。"),
      }),
      execute: async ({ latitude, longitude }) => {
        const result = await fetch(`https://weather.googleapis.com/v1/currentConditions:lookup?key=${CONFIG.GOOGLE_MAP_API_KEY}&location.latitude=${latitude}&location.longitude=${longitude}`)
          .then(response => response.json())
          .catch(err => {
            console.error('[Error] weather: ', err);
            return `Error: ${err.message}`;
          });
        return result;
      },
    });
    tools.weather_forecast = tool({
      description: "使用 Google Maps 取得地點的天氣預報。輸入經緯度，回傳該地點的天氣預報。例如：'25.0478, 121.517'。",
      parameters: z.object({
        latitude: z.number().describe("要查詢的地點緯度，例如：25.0478。"),
        longitude: z.number().describe("要查詢的地點經度，例如：121.517。"),
        time_range: z.enum(["days", "hours"]).describe("要查詢預報的時間範圍，例如：'days' 或 'hours'。"),
        hours: z.number().optional().default(24).describe("要查詢的小時數，例如：24。僅在 time_range 為 'hours' 時有效。最大值為 240。"),
        days: z.number().optional().default(3).describe("要查詢的天數，例如：3。僅在 time_range 為 'days' 時有效。最大值為 10。"),
      }),
      execute: async ({ latitude, longitude, time_range, hours, days }) => {
        const result = await fetch(`https://weather.googleapis.com/v1/forecast/${time_range}:lookup?key=${CONFIG.GOOGLE_MAP_API_KEY}&location.latitude=${latitude}&location.longitude=${longitude}&${time_range}=${time_range === "hours" ? hours : days}`)
          .then(response => response.json())
          .catch(err => {
            console.error('[Error] weather: ', err);
            return `Error: ${err.message}`;
          });
        return result;
      },
    });
    tools.google_map = tool({
      description: `使用 Google Maps Places API 搜尋地點資訊。可根據指定的經緯度與半徑，查詢附近的商家、餐廳、景點等，並回傳地點名稱、Google Map連結、評分、價格等級等資料。
適用情境：
- 想知道某地附近有什麼推薦的餐廳、咖啡廳、景點等
- 查詢特定地點的詳細資訊（如名稱、地址、評分）
- 需要根據使用者輸入的關鍵字與地理位置，提供地點建議

請提供搜尋關鍵字、中心點經緯度與半徑，系統會回傳整理過的地點資訊，方便在 LINE 上閱讀。`,
      parameters: z.object({
        query: z.string().describe("要搜尋的關鍵字，例如：'台北車站附近的咖啡廳'。"),
        latitude: z.number().describe("搜尋中心點的緯度，例如台北車站為 25.0478。"),
        longitude: z.number().describe("搜尋中心點的經度，例如台北車站為 121.5170。"),
        radius: z.number().optional().default(1000).describe("搜尋半徑（公尺），最大 50,000 公尺，預設為 1000 公尺。"),
        language: z.string().optional().default('zh-TW').describe("搜尋結果的語言，預設為 'zh-TW'。"),
      }),
      execute: async ({ query, latitude, longitude, radius, language }) => {
        console.log(`[Info] google_map: ${query}, ${latitude}, ${longitude}, ${radius}, ${language}`);
        const result = await fetch('https://places.googleapis.com/v1/places:searchText', {
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': CONFIG.GOOGLE_MAP_API_KEY,
            'X-Goog-FieldMask': 'places.displayName,places.googleMapsUri,places.rating,places.priceLevel',
            // places.rating only 1000 free requests per month, others are 5000 free requests per month
          },
          method: 'POST',
          body: JSON.stringify({
            textQuery: query,
            locationBias: { circle: { center: { latitude, longitude }, radius } },
            languageCode: language,
          }),
        })
          .then(res => res.json())
          .then(data => data.places)
          .catch(err => {
            console.error('[Error] google_map: ', err);
            return `Error: ${err.message}`;
          });
        return result;
      },
    });
  }
  if (CONFIG.TAVILY_API_KEY) {
    tools.tavily_search = tool({
      description: '使用 Tavily 在網路上搜尋最新資訊，如果用戶想要搜尋地點或餐廳，請使用 google_map 工具。 (Search the latest information on the web using Tavily)',
      parameters: z.object({
        query: z.string().describe('The search query.'),
        // topic: z.enum(['general', 'news']).optional().default('general').describe('The topic of the search. Default is general. If you want to search for news, use "news".'),
        days: z.number().optional().default(3).describe("The number of days back from the current date to include in the search results. This specifies the time frame of data to be retrieved. Please note that this feature is only available when using the 'news' search topic"),
        time_range: z.enum(['day', 'week', 'month', 'year']).optional().default('day').describe('The time range of the search. Default is day.'),
        maxResults: z.number().optional().default(5).describe('The maximum number of results to return. Default is 5.'),
      }),
      execute: async ({ query, time_range, maxResults }) => {
        const result = await fetch("https://api.tavily.com/search", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${CONFIG.TAVILY_API_KEY}`,
          },
          body: JSON.stringify({ query, time_range, maxResults }),
        })
          .then(res => res.json())
          .then(data => data.results)
          .catch(err => {
            console.error('[Error] tavily: ', err);
            return `Error: ${err.message}`;
          });
        return result;
      },
    });
    tools.tavily_extract = tool({
      description: '使用 Tavily API 從一個或多個指定的 URL 中提取網頁內容',
      parameters: z.object({
        urls: z.string().describe('要提取內容的網頁 URL，可以是多個 URL，以逗號分隔'),
      }),
      execute: async ({ urls }) => {
        const result = await fetch("https://api.tavily.com/extract", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${CONFIG.TAVILY_API_KEY}`,
          },
          body: JSON.stringify({ urls: urls.split(',').map(url => url.trim()) }),
        })
          .then(res => res.json())
          .then(data => data.results)
          .catch(err => {
            console.error('[Error] tavily: ', err);
            return `Error: ${err.message}`;
          });
        return result;
      },
    });
  }
  return tools;
}

export const createChat = async (messages: CoreMessage[], executor: ToolExecutors = {}) => {
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
      console.error('[Error] streamText:', error);
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

  if (signal.aborted) {
    const elapsed = Date.now() - startTime;
    console.log(`[Info] token: , finish_reason: timeout, tool_usage: , elapsed: ${elapsed}ms`);
    if (message)
      message += "...";
    else
      message = "抱歉，處理您的請求時間過長，請稍後再試一次。";
    return { message, finishReason: 'timeout' };
  }

  const steps = await result.steps;
  const toolResults = steps.flatMap(step => step.toolResults);
  const toolUsage = toolResults.map(r => r.toolName).join(',');
  const finishReason = await result.finishReason;
  const usage = await result.usage;
  const totalTokens = usage?.totalTokens;
  const elapsed = Date.now() - startTime;
  console.log(`[Info] token: ${totalTokens}, finish_reason: ${finishReason}, tool_usage: ${toolUsage}, elapsed: ${elapsed}ms`);

  return { message, finishReason };
}
