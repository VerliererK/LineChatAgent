import { getSettings, setSettings } from "../lib/neon";
import { validateAuth } from "../lib/auth";

export async function GET(req: Request) {
  if (!validateAuth(req)) {
    return new Response("Unauthorized", { status: 401 });
  }
  try {
    const settings = await getSettings();
    return new Response(JSON.stringify(settings || {}), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!validateAuth(request)) {
    return new Response("Unauthorized", { status: 401 });
  }
  try {
    const body = await request.json();
    const requiredFields = ["provider", "model"];
    for (const field of requiredFields) {
      if (!body[field]) {
        return new Response(`Missing required field: ${field}`, { status: 400 });
      }
    }
    await setSettings(body);
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
