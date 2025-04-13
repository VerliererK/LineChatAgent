export const CONFIG = {
  API_HOST: `https://${process.env.VERCEL_URL}`,

  // required
  LINE_CHANNEL_ACCESS_TOKEN: process.env.LINE_CHANNEL_ACCESS_TOKEN ?? "",
  LINE_CHANNEL_SECRET: process.env.LINE_CHANNEL_SECRET ?? "",
};
