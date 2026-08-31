import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { canvasRouter } from "./routes/canvas.js";
import { aiRouter } from "./routes/ai.js";
import { authRouter } from "./routes/auth.js";
import { spotifyRouter } from "./routes/spotify.js";
import { googleRouter } from "./routes/google.js";
import { isCanvasConfigured } from "./lib/canvasClient.js";
import { isGeminiConfigured } from "./lib/geminiClient.js";
import { isSpotifyConfigured } from "./lib/spotifyClient.js";
import { isGoogleCalendarConfigured } from "./lib/googleCalendarClient.js";

if (!process.env.SESSION_SECRET) {
  console.error(
    "\nSESSION_SECRET is not set in server/.env — refusing to start.\n" +
    "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\"\n"
  );
  process.exit(1);
}

const app = express();
// credentials: true + an explicit origin (not "*") — required for the
// session cookie to actually be sent cross-origin in dev, where the Vite
// frontend (5173/5174) and this API (8787) are different origins.
app.use(cors({ origin: process.env.FRONTEND_ORIGIN || "http://localhost:5173", credentials: true }));
app.use(express.json());
app.use(cookieParser(process.env.SESSION_SECRET));

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    canvasConfigured: isCanvasConfigured(),
    geminiConfigured: isGeminiConfigured(),
    spotifyConfigured: isSpotifyConfigured(),
    calendarConfigured: isGoogleCalendarConfigured(),
  });
});

app.use("/api/canvas", canvasRouter);
app.use("/api/ai", aiRouter);
app.use("/api/auth", authRouter);
app.use("/api/integrations/spotify", spotifyRouter);
app.use("/api/integrations/google", googleRouter);

const port = process.env.PORT || 8787;
app.listen(port, () => {
  console.log(`API server on http://localhost:${port}`);
  console.log(`  Canvas:   ${isCanvasConfigured() ? "configured" : "not configured (set server/.env)"}`);
  console.log(`  Gemini:   ${isGeminiConfigured() ? "configured" : "not configured (set server/.env)"}`);
  console.log(`  Spotify:  ${isSpotifyConfigured() ? "configured" : "not configured (set server/.env)"}`);
  console.log(`  Calendar: ${isGoogleCalendarConfigured() ? "configured" : "not configured (set server/.env)"}`);
});
