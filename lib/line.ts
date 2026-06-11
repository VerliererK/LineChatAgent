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
  return reply([{ type: "text", text }], replyToken);
};

/**
 * 在訊息下方附加快捷按鈕 (quick replies)。
 *
 * - 有 `data` → **postback action**：點擊送出 postback 事件，畫面僅顯示 label。
 * - 無 `data` → **message action**：點擊以使用者身分送出 text。
 *
 * LINE 限制:
 *   - 最多 13 個按鈕
 *   - label 最長 20 字
 *   - message action 的 text 最長 300 字
 */
export const quickReply = (
  text: string,
  replyToken: string,
  data: { label: string; text?: string; data?: string }[],
) => {
  const message: { type: string; text: string; quickReply?: object } = { type: "text", text };
  const items = data
    .filter((q) => q.data || (q.text && q.text.length <= 300))
    .slice(0, 13);
  if (items.length > 0) {
    message.quickReply = {
      items: items.map((q) => ({
        type: "action",
        action: q.data
          ? { type: "postback", label: q.label.slice(0, 20), data: q.data, displayText: q.label.slice(0, 20) }
          : { type: "message", label: q.label.slice(0, 20), text: q.text },
      })),
    };
  }
  return reply([message], replyToken);
};

export const showLoading = (chatId: string, loadingSeconds = 60) => {
  return fetchTimeout("https://api.line.me/v2/bot/chat/loading/start", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${CONFIG.LINE_CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({ chatId, loadingSeconds }),
  }, 3000).catch((err) => {
    console.error('[Error] showLoading:', err);
  });
};
