import { CONFIG } from "../utils/config";
import { getMessages, setMessages, clearMessages } from "../lib/neon";
import { getContent, replyText, quickReply, showLoading } from "../lib/line";
import { createChat } from "../lib/ai";
import { uploadImage, deleteImagesByPrefix } from "../lib/blob";
import { ModelMessage } from 'ai';

const RETRY_QUICK_REPLY = { label: "重試", data: "action=retry" };

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

const handleLineMessage = async (event: any, retry: boolean = false) => {
  const { replyToken } = event;
  const { type, text } = event.message || {};
  const userId = event.source.userId;

  // type: text, image, video, audio, file, location, sticker,
  if (!retry && type !== "text" && type !== "image") {
    await replyText("Not support this message type", replyToken);
    return;
  }

  showLoading(userId);

  const userMessages = await getMessages(userId);
  const messages = [...userMessages] as ModelMessage[];

  // retry 時不重複加入 user 訊息，直接用歷史訊息帶模型跑一次
  let imageUrl: string | null = null;
  if (type === "image") {
    const buffer = await getData(event.message);
    if (!buffer) throw new Error("Failed to get image content");
    imageUrl = await uploadImage(`line/${userId}/${event.message.id}.jpg`, buffer);
    messages.push({ role: "user", content: [{ type: 'image', image: imageUrl ?? buffer }] });
  } else if (type === "text" && text) {
    messages.push({ role: "user", content: text });
  }

  const lastMessage = messages[messages.length - 1];
  const enableTools = !(Array.isArray(lastMessage?.content) && lastMessage.content.some((part) => part.type === "image"));

  let cleared = false;
  const { message, failed } = await createChat(messages, {
    enableTools,
    toolExecutors: {
      // 注意：工具執行當下對話還在 tool loop 中，後續 step 會把含圖片 URL 的歷史
      // 再送回 provider，這時刪 blob 會讓 provider 下載圖片失敗 (HTTP 400)。
      // 所以這裡只清 DB，blob 延後到對話結束、回覆送出後才刪。
      clear: () => clearMessages(userId)
        .then(() => {
          cleared = true;
          return true;
        }).catch(() => false),
    }
  });
  if (failed) {
    await quickReply(message, replyToken, [RETRY_QUICK_REPLY]);
  } else {
    await replyText(message, replyToken);
  }

  if (cleared) {
    await deleteImagesByPrefix(`line/${userId}/`);
    return;
  }

  if (type === "image") {
    userMessages.push(imageUrl
      ? { role: "user", content: [{ type: 'image', image: imageUrl }] }
      : { role: "user", content: "[User sent an image]" });
  } else if (type === "text" && text) {
    userMessages.push({ role: "user", content: text });
  }
  if (!failed) {
    userMessages.push({ role: "assistant", content: message });
  }
  await setMessages(userId, userMessages);
};

const handleLineEvent = async (event: any) => {
  const { replyToken, type } = event;

  try {
    if (type === "message") {
      await handleLineMessage(event);
    }
    else if (type === "postback" && event.postback?.data === RETRY_QUICK_REPLY.data) {
      await handleLineMessage(event, true);
    }
    else {
      console.error(`Unsupported event type: ${type}`);
    }
  } catch (error: any) {
    const status = error.code || error.status || 500;
    const message = error.message || "Internal Server Error";
    console.error(error);
    await replyText(`[Error]: ${message} (${status})`, replyToken);
  }
};

export async function POST(request: Request): Promise<Response> {
  try {
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
      await handleLineEvent(event);
    }

    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error(error);
    return new Response('Internal Server Error', { status: 500 });
  }
};
