import { streamText, convertToModelMessages, UIMessage } from "ai";
import { validateAuth } from "../lib/auth";
import { createChatConfig } from "../lib/ai";

export async function POST(req: Request) {
  if (!validateAuth(req)) {
    return new Response("Unauthorized", { status: 401 });
  }
  const { messages } = (await req.json()) as { messages: UIMessage[] };
  if (!Array.isArray(messages)) {
    return new Response("No messages provided", { status: 400 });
  }
  try {
    const modelMessages = await convertToModelMessages(messages);
    const config = await createChatConfig(modelMessages);
    return streamText(config).toUIMessageStreamResponse();
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    return new Response(msg, { status: 500 });
  }
}
