import { CONFIG } from "../utils/config";
import { getMessages, setMessages, clearMessages } from "../lib/firestore";
import { getContent, relayReply as replyText } from "../lib/line";
import { createChat } from "../lib/ai";
import { CoreMessage } from 'ai';

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

const getData = async (message: any) => {
  const { id, contentProvider } = message;
  const { type } = contentProvider;

  const res = type === 'external' ? await fetch(contentProvider.originalContentUrl) : await getContent(id);
  if (!res.ok) throw new Error(`Failed to get image content: ${res.statusText} (${res.status})`);
  const buffer = await res.arrayBuffer();
  return buffer;
}

const handleLineMessage = async (event: any) => {
  const { replyToken, type: eventType } = event;
  const { type, text } = event.message;
  const userId = event.source.userId;

  if (eventType !== "message") return;

  // type: text, image, video, audio, file, location, sticker,
  if (type !== "text" && type !== "image") {
    await replyText("Not support this message type", replyToken);
    return;
  }

  try {
    const userMessages = await getMessages(userId);
    const messages = [...userMessages] as CoreMessage[];

    if (type === "image") {
      const buffer = await getData(event.message);
      if (!buffer) throw new Error("Failed to get image content");
      messages.push({ role: "user", content: [{ type: 'image', image: buffer }] });
    } else {
      messages.push({ role: "user", content: text });
    }

    let skipSetMessages = false;
    const { message } = await createChat(messages, {
      clear: () => clearMessages(userId).then(() => {
        skipSetMessages = true;
        return true;
      }).catch(() => false),
    });
    await replyText(message, replyToken);

    if (!skipSetMessages) {
      if (type === "image") {
        // 將圖片訊息替換成文字訊息，不儲存圖片內容，直接存放在 FireStore 會超過限制
        userMessages.push({ role: "user", content: "[User sent an image]" });
      } else {
        userMessages.push({ role: "user", content: text });
      }
      userMessages.push({ role: "assistant", content: message });
      await setMessages(userId, userMessages);
    }
  } catch (error) {
    const status = error.code || error.status || 500;
    const message = error.message || "Internal Server Error";
    console.error(error);
    await replyText(`[Error]: ${message} (${status})`, replyToken);
  }
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
