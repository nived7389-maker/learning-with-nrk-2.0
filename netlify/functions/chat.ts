import type { Config, Context } from "@netlify/functions";

export default async (req: Request, context: Context) => {
  const headers = new Headers({
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  });

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), { 
      status: 405, 
      headers 
    });
  }

  try {
    const apiKey = (process.env.OPENROUTER_API_KEY || "").trim();
    if (!apiKey) {
      return new Response(JSON.stringify({ 
        error: "OPENROUTER_API_KEY is not configured on the server. Please add your OpenRouter API Key in Netlify UI: Site settings > Environment variables." 
      }), { status: 401, headers });
    }

    const body = await req.json();
    const { prompt, base64Image, mimeType, history } = body;
    
    const messages = [];

    messages.push({
      role: "system",
      content: "You are ASTR AI, an educational assistant designed to help Kerala State Syllabus (+1 and +2) students clear their doubts. Be fast, very clear, and educational."
    });

    if (history && Array.isArray(history)) {
      for (const msg of history) {
        messages.push({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.text || " "
        });
      }
    }

    let currentContent: any = prompt || " ";
    if (base64Image) {
      currentContent = [
        { type: "text", text: prompt || " " },
        { type: "image_url", image_url: { url: `data:${mimeType || 'image/jpeg'};base64,${base64Image}` } }
      ];
    }

    messages.push({
      role: "user",
      content: currentContent
    });

    const openRouterResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "deepseek/deepseek-chat",
        messages: messages
      })
    });

    const data = await openRouterResponse.json();
    
    if (!openRouterResponse.ok) {
      throw new Error(data.error?.message || "Failed to generate response from OpenRouter");
    }

    return new Response(JSON.stringify({ text: data.choices[0].message.content }), {
      status: 200,
      headers
    });
  } catch (error: any) {
    const isQuota = error.status === 429 || (error.message && error.message.includes("429")) || (error.message && error.message.includes("Quota exceeded"));
    
    if (!isQuota) {
      console.error("OpenRouter API Error in Netlify function:", error);
    }
    
    return new Response(JSON.stringify({ error: error.message || "Failed to generate response." }), {
      status: isQuota ? 429 : 500,
      headers
    });
  }
};

export const config: Config = {
  path: "/api/gemini/chat"
};
