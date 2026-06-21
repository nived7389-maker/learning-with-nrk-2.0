import "dotenv/config";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || "3000", 10);

  app.use(express.json({ limit: "50mb" }));

  // Initialize API Key
  const apiKey = (process.env.OPENROUTER_API_KEY || "").trim();
  
  if (!apiKey) {
    console.warn("WARNING: OPENROUTER_API_KEY is not set in environment!");
  }
  
  // API Route for chat
  app.post("/api/gemini/chat", async (req, res) => {
    try {
      if (!apiKey) {
        return res.status(401).json({ 
          error: "OPENROUTER_API_KEY is not configured on the server. Please add your OpenRouter API Key in the Settings panel." 
        });
      }

      const { prompt, base64Image, mimeType, history } = req.body;
      
      const messages = [];

      const systemPrompt = `You are ASTR AI, an educational assistant designed to help Kerala State Syllabus (+1 and +2) students clear their doubts.
- IMPORTANT: You MUST ONLY answer questions related to the plus one and plus two syllabus. 
- Keep your answers straight and short.
- ONLY answer exam, educational, and text-based questions, including history-based questions.
- SAFETY RULE (CRITICAL): If the user's question contains sexual abuse, 18-plus content, violence, self-harm, or inappropriate sexual/adult themes, you MUST reply ONLY with this exact word: [VIOLATION: INAPPROPRIATE]
- CONTEXT RULE (CRITICAL): If the user's question is completely outside the educational lesson, syllabus, or topic they are asking about (such as gossip, movies, video games, unrelated celebrities, or random off-topic non-school items), you MUST reply ONLY with this exact word: [VIOLATION: OUTSIDE_LESSON]
- DO NOT answer questions about the film industry, film celebrities, or any other non-educational categories. If asked about these, politely refuse and explain your focus.
- If a user asks who your creator is, you must reply: "I am made by Learning with NRK."
- If a user asks what your job is, you must reply: "My job is to answer students' doubts and educational based questions for the plus one and plus two syllabus."
- If any students ask who/what is the founder of this company, founder of this app, founder of Learning with NRK, or founder of this platform, your answer MUST be: "Nived nrk."
- Add appropriate emojis to your response for a more appealing look! ✨📚`;

      messages.push({
        role: "system",
        content: systemPrompt
      });

      // Format history
      if (history && Array.isArray(history)) {
        for (const msg of history) {
          messages.push({
            role: msg.role === 'user' ? 'user' : 'assistant',
            content: msg.text || " "
          });
        }
      }

      // Format current request
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

      const text = data.choices[0].message.content;

      res.json({ text: text });
    } catch (error: any) {
      const isQuota = error.status === 429 || error.message?.includes("429") || error.message?.includes("Quota exceeded");
      if (!isQuota) {
        console.error("OpenRouter API Error:", error);
      }
      res.status(isQuota ? 429 : 500).json({ error: error.message || "Failed to generate response." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
