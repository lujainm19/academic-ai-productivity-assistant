import { Router } from "express";
import {
  isGoogleCalendarConfigured, getAuthUrl, exchangeCode, getValidAccessToken,
  getUpcomingCalendarEvents, revokeToken,
} from "../lib/googleCalendarClient.js";
import { requireAuth } from "../lib/auth.js";
import { createOAuthState, consumeOAuthState } from "../lib/oauthState.js";
import { getTokens, clearTokens } from "../lib/tokenStore.js";

export const googleRouter = Router();

googleRouter.use((req, res, next) => {
  if (!isGoogleCalendarConfigured()) {
    return res.status(501).json({
      error: "calendar_not_configured",
      message: "Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in server/.env.",
    });
  }
  next();
});

googleRouter.get("/connect", requireAuth, (req, res) => {
  const state = createOAuthState(req.user.id, "google");
  res.redirect(getAuthUrl(state));
});

// Same reasoning as Spotify's callback: no requireAuth, the `state` value
// (single-use, minted at /connect time, tied to a user id server-side)
// is what authenticates this request — not the session cookie, which may
// not even be present depending on how the browser handled the redirect.
googleRouter.get("/callback", async (req, res) => {
  const { code, error, state } = req.query;
  if (error || !code || !state) {
    return res.status(400).send(popupCloseHtml("Google Calendar connection was cancelled."));
  }
  const userId = consumeOAuthState(state, "google");
  if (!userId) {
    return res.status(400).send(popupCloseHtml("This connection link expired or was already used. Close this window and try again."));
  }
  try {
    await exchangeCode(userId, code);
    res.send(popupCloseHtml("Google Calendar connected — you can close this window."));
  } catch (err) {
    res.status(502).send(popupCloseHtml("Couldn't connect Google Calendar — please try again."));
  }
});

googleRouter.get("/calendar", requireAuth, async (req, res) => {
  try {
    const token = await getValidAccessToken(req.user.id);
    if (!token) return res.status(401).json({ error: "not_connected" });
    const events = await getUpcomingCalendarEvents(token);
    res.json({ events });
  } catch (err) {
    res.status(502).json({ error: "calendar_request_failed" });
  }
});

googleRouter.post("/disconnect", requireAuth, async (req, res) => {
  const tokens = getTokens(req.user.id, "google");
  if (tokens?.accessToken) await revokeToken(tokens.accessToken); // best-effort revoke on Google's side
  clearTokens(req.user.id, "google");
  res.json({ ok: true });
});

function popupCloseHtml(message) {
  return `<!doctype html><html><body style="font-family:sans-serif;background:#111;color:#eee;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center;padding:0 24px;">
    <p>${message}</p>
    <script>setTimeout(() => window.close(), 1400);</script>
  </body></html>`;
}
