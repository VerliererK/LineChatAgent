import { createChat } from "../lib/ai";

export const config = {
  runtime: "edge",
};

export default async (req: Request): Promise<Response> => {
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
