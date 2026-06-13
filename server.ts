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

      messages.push({
        role: "system",
        content: "You are ASTR AI, an educational assistant designed to help Kerala State Syllabus (+1 and +2) students clear their doubts. Be fast, very clear, and educational."
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
