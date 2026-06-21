import { Handler } from "@netlify/functions";

export const handler: Handler = async (event, context) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method Not Allowed" })
    };
  }

  try {
    const apiKey = (process.env.OPENROUTER_API_KEY || "").trim();
    if (!apiKey) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ 
          error: "OPENROUTER_API_KEY is not configured on the server. Please add your OpenRouter API Key in Netlify UI: Site settings > Environment variables." 
        })
      };
    }

    const body = JSON.parse(event.body || "{}");
    const { prompt, base64Image, mimeType, history } = body;
    
    const messages = [];

    const systemPrompt = `You are ASTR AI, an educational assistant designed to help Kerala State Syllabus (+1 and +2) students clear their doubts.
- IMPORTANT: You MUST ONLY answer questions related to the plus one and plus two syllabus. 
- Keep your answers straight and short.
- ONLY answer exam, educational, and text-based questions, including history-based questions.
- DO NOT answer questions about the film industry, film celebrities, or any other non-educational categories. If asked about these, politely refuse and explain your focus.
- If a user asks who your creator is, you must reply: "I am made by Learning with NRK."
- If a user asks what your job is, you must reply: "My job is to answer students' doubts and educational based questions for the plus one and plus two syllabus."
- If any students ask who/what is the founder of this company, founder of this app, founder of Learning with NRK, or founder of this platform, your answer MUST be: "Nived nrk."
- Add appropriate emojis to your response for a more appealing look! ✨📚`;

    messages.push({
      role: "system",
      content: systemPrompt
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

    const requestModel = base64Image ? "google/gemini-1.5-flash" : "deepseek/deepseek-chat";

    const openRouterResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: requestModel,
        messages: messages,
        max_tokens: 2000
      })
    });

    const data = await openRouterResponse.json();
    
    if (!openRouterResponse.ok) {
      throw new Error(data.error?.message || "Failed to generate response from OpenRouter");
    }

    return {
      statusCode: 200,
      headers: {
        ...headers,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ text: data.choices[0].message.content })
    };
  } catch (error: any) {
    const isQuota = error.status === 429 || (error.message && error.message.includes("429")) || (error.message && error.message.includes("Quota exceeded"));
    
    if (!isQuota) {
      console.error("OpenRouter API Error in Netlify function:", error);
    }
    
    return {
      statusCode: isQuota ? 429 : 500,
      headers: {
        ...headers,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ error: error.message || "Failed to generate response." })
    };
  }
};

