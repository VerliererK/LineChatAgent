/**
 * 透過 LINE Messaging API 發送回覆訊息。
 * 部署為 Vercel Serverless Function (因 Edge Functions 呼叫 LINE 回覆 API 時不穩定/無回應)。
 * 需要 `replyToken` 與 `text` 內容。
 */

import { reply } from "../lib/line";

export default async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { replyToken, text } = req.body;

    if (!replyToken) {
      return res.status(400).json({ error: 'Missing replyToken' });
    }

    if (!text) {
      return res.status(400).json({ error: 'Missing text' });
    }

    await reply([{ type: "text", text }], replyToken);

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Reply error:', err);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: err instanceof Error ? err.message : 'Unknown error'
    });
  }
}
