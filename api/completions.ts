import { createChat } from "../lib/ai";
import { AISDKError } from 'ai';

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
    if (error instanceof AISDKError) {
      return new Response(error.message, { status: 500 });
    }
    console.error(error);
    return new Response("Internal Server Error", { status: 500 });
  }
};
