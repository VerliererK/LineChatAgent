import { CONFIG } from "../utils/config";
import { relayReply as replyText } from "../lib/line";

export const config = {
  runtime: "edge",
  regions: ["hnd1"],
};

const validateSignature = async (
  xLineSignature: string | null,
  body: string
) => {
  const channelSecret = CONFIG.LINE_CHANNEL_SECRET;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(channelSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle
    .sign("HMAC", key, enc.encode(body))
    .then((data) =>
      Buffer.from(
        String.fromCharCode(...new Uint8Array(data)),
        "binary"
      ).toString("base64")
    );

  return xLineSignature === signature;
};

const handleLineMessage = async (event: any) => {
  const { replyToken, type: eventType } = event;
  const { type, text } = event.message;

  if (eventType !== "message") return;

  if (type !== "text") {
    await replyText("Not support this message type", replyToken);
    return;
  }

  await replyText(`You said: ${text}`, replyToken);
};

export default async (request: Request): Promise<Response> => {
  try {
    // 確認請求方法
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    // 驗證 LINE Webhook 簽名
    const body = await request.text();
    const signature = request.headers.get('x-line-signature');
    const isValidate = await validateSignature(signature, body);
    if (!isValidate) {
      return new Response('Invalid Signature', { status: 403 });
    }

    // 解析 Webhook 事件
    const data = JSON.parse(body);
    const events = data.events;

    // 處理每個事件
    for (const event of events) {
      await handleLineMessage(event);
    }

    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error(error);
    return new Response('Internal Server Error', { status: 500 });
  }
};
