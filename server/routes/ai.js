import { Router } from "express";
import { isGeminiConfigured, askGemini } from "../lib/geminiClient.js";

export const aiRouter = Router();

aiRouter.use((req, res, next) => {
  if (!isGeminiConfigured()) {
    return res.status(501).json({
      error: "gemini_not_configured",
      message: "Set GEMINI_API_KEY in server/.env to enable real AI Assistant replies.",
    });
  }
  next();
});

// body: { message: string, history?: {role: "user"|"ai", content: string}[], context?: string }
// `context` is free text the frontend builds from the student's real tasks/
// Canvas data — this is what makes replies grounded instead of generic, and
// is the hook the agentic layer (phase 3) will feed richer summaries into.
aiRouter.post("/chat", async (req, res) => {
  const { message, history, context } = req.body ?? {};
  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "bad_request", message: "Body must include a string `message`." });
  }

  const systemContext = [
    "You are the AI study assistant inside a student productivity app.",
    "Be concise, concrete, and reference specific tasks/deadlines when given them.",
    context && `Here is the student's current context:\n${context}`,
  ].filter(Boolean).join("\n\n");

  try {
    const reply = await askGemini({ message, history, systemContext });
    res.json({ reply });
  } catch (err) {
    res.status(502).json({ error: "gemini_request_failed", message: err.message });
  }
});
