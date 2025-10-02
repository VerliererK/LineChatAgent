import { createChat } from "../lib/ai";
import { validateAuth } from "../lib/auth";

export async function POST(req: Request): Promise<Response> {
  if (!validateAuth(req)) {
    return new Response("Unauthorized", { status: 401 });
  }
  const { messages } = (await req.json()) as { messages: { role: 'user' | 'assistant' | 'system'; content: string }[] };
  if (!Array.isArray(messages)) {
    return new Response("No messages provided", { status: 400 });
  }
  try {
    const { message } = await createChat(messages);
    return new Response(message);
  } catch (error) {
    const status = error.code || error.status || 500;
    const message = error.message || "Internal Server Error";
    return new Response(message, { status });
  }
};
