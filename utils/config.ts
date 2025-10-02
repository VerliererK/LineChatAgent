export const CONFIG = {
  API_HOST: `https://${process.env.VERCEL_URL}`,

  // required
  LINE_CHANNEL_ACCESS_TOKEN: process.env.LINE_CHANNEL_ACCESS_TOKEN ?? "",
  LINE_CHANNEL_SECRET: process.env.LINE_CHANNEL_SECRET ?? "",
  FIREBASE_CONFIG: process.env.FIREBASE_CONFIG ?? "",

  // optional
  GOOGLE_MAP_API_KEY: process.env.GOOGLE_MAP_API_KEY,
  TAVILY_API_KEY: process.env.TAVILY_API_KEY,
};
