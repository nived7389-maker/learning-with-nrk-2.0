var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_config = require("dotenv/config");
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = parseInt(process.env.PORT || "3000", 10);
  app.use(import_express.default.json({ limit: "50mb" }));
  const apiKey = (process.env.OPENROUTER_API_KEY || "").trim();
  if (!apiKey) {
    console.warn("WARNING: OPENROUTER_API_KEY is not set in environment!");
  }
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
- Add appropriate emojis to your response for a more appealing look! \u2728\u{1F4DA}`;
      messages.push({
        role: "system",
        content: systemPrompt
      });
      if (history && Array.isArray(history)) {
        for (const msg of history) {
          messages.push({
            role: msg.role === "user" ? "user" : "assistant",
            content: msg.text || " "
          });
        }
      }
      let currentContent = prompt || " ";
      if (base64Image) {
        currentContent = [
          { type: "text", text: prompt || " " },
          { type: "image_url", image_url: { url: `data:${mimeType || "image/jpeg"};base64,${base64Image}` } }
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
          messages
        })
      });
      const data = await openRouterResponse.json();
      if (!openRouterResponse.ok) {
        throw new Error(data.error?.message || "Failed to generate response from OpenRouter");
      }
      const text = data.choices[0].message.content;
      res.json({ text });
    } catch (error) {
      const isQuota = error.status === 429 || error.message?.includes("429") || error.message?.includes("Quota exceeded");
      if (!isQuota) {
        console.error("OpenRouter API Error:", error);
      }
      res.status(isQuota ? 429 : 500).json({ error: error.message || "Failed to generate response." });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
