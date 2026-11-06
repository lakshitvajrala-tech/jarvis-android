const corsHeaders = {
  "Access-Control-Allow-Origin": "https://lakshitvajrala-tech.github.io",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Jarvis-Token",
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin");

    if (
      origin &&
      origin !== "https://lakshitvajrala-tech.github.io"
    ) {
      return new Response("Forbidden", { status: 403 });
    }

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    const url = new URL(request.url);

    if (url.pathname === "/health" && request.method === "GET") {
      return jsonResponse({ status: "healthy" });
    }

    if (url.pathname !== "/chat" || request.method !== "POST") {
      return jsonResponse({ error: "Not found" }, 404);
    }

    if (!env.GEMINI_API_KEY || !env.APP_ACCESS_TOKEN) {
      return jsonResponse({ error: "Server configuration incomplete" }, 503);
    }

    const suppliedToken = request.headers.get("X-Jarvis-Token") || "";

    if (suppliedToken !== env.APP_ACCESS_TOKEN) {
      return jsonResponse({ error: "Invalid access code" }, 401);
    }

    let body;

    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON" }, 400);
    }

    const message =
      typeof body.message === "string" ? body.message.trim() : "";

    if (!message) {
      return jsonResponse({ reply: "Please say something." }, 400);
    }

    if (message.length > 4000) {
      return jsonResponse({ error: "Message is too long." }, 413);
    }

    try {
      const model = env.GEMINI_MODEL || "gemini-3.8-flash";

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": env.GEMINI_API_KEY,
          },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{
                text: "You are JARVIS, a helpful, intelligent and polite personal AI assistant. Give clear, useful answers."
              }]
            },
            contents: [{
              role: "user",
              parts: [{ text: message }]
            }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 800
            }
          })
        }
      );

      if (!response.ok) {
        return jsonResponse({
          error: "Gemini service error. Check the API configuration and model availability."
        }, 502);
      }

      const data = await response.json();

      const reply = data.candidates?.[0]?.content?.parts
        ?.map(part => part.text || "")
        .join("")
        .trim();

      if (!reply) {
        return jsonResponse({ error: "Gemini returned no response." }, 502);
      }

      return jsonResponse({ reply });

    } catch {
      return jsonResponse({ error: "Unable to contact Gemini right now." }, 502);
    }
  }
};
