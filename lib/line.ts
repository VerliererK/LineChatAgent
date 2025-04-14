import { CONFIG } from "../utils/config";
import fetchTimeout from "../utils/fetchTimeout";

export const getContent = (messageId: string) => {
  return fetch(`https://api-data.line.me/v2/bot/message/${messageId}/content`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${CONFIG.LINE_CHANNEL_ACCESS_TOKEN}`,
    },
  });
};

export const reply = (messages: { type: string; text: string }[], replyToken: string) => {
  return fetchTimeout("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${CONFIG.LINE_CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      replyToken: replyToken,
      messages: messages,
    }),
  }, 3000);
};

export const replyText = (text: string, replyToken: string) => {
  return reply([{ type: "text", text: text }], replyToken);
};
