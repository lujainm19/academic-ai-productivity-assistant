import { Router } from "express";
import {
  isSpotifyConfigured, getAuthUrl, exchangeCode, getValidAccessToken,
  getCurrentlyPlaying, controlPlayback,
} from "../lib/spotifyClient.js";
import { requireAuth } from "../lib/auth.js";
import { createOAuthState, consumeOAuthState } from "../lib/oauthState.js";
import { clearTokens } from "../lib/tokenStore.js";

export const spotifyRouter = Router();

spotifyRouter.use((req, res, next) => {
  if (!isSpotifyConfigured()) {
    return res.status(501).json({
      error: "spotify_not_configured",
      message: "Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in server/.env.",
    });
  }
  next();
});

// Requires app auth: the whole point of minting the state here (instead
// of accepting one from the client) is that it's tied to req.user.id at
// the moment of the click, not to whatever the callback later claims.
spotifyRouter.get("/connect", requireAuth, (req, res) => {
  const state = createOAuthState(req.user.id, "spotify");
  res.redirect(getAuthUrl(state));
});

// No requireAuth here on purpose — this is a top-level navigation from
// Spotify's own domain, and the *state* parameter (not the session
// cookie) is what proves which app-user this belongs to.
spotifyRouter.get("/callback", async (req, res) => {
  const { code, error, state } = req.query;
  if (error || !code || !state) {
    return res.status(400).send(popupCloseHtml("Spotify connection was cancelled."));
  }
  const userId = consumeOAuthState(state, "spotify");
  if (!userId) {
    return res.status(400).send(popupCloseHtml("This connection link expired or was already used. Close this window and try again."));
  }
  try {
    await exchangeCode(userId, code);
    res.send(popupCloseHtml("Spotify connected — you can close this window."));
  } catch (err) {
    res.status(502).send(popupCloseHtml("Couldn't connect Spotify — please try again."));
  }
});

spotifyRouter.get("/now-playing", requireAuth, async (req, res) => {
  try {
    const token = await getValidAccessToken(req.user.id);
    if (!token) return res.status(401).json({ error: "not_connected" });
    const track = await getCurrentlyPlaying(token);
    res.json({ track });
  } catch (err) {
    res.status(502).json({ error: "spotify_request_failed" }); // never echo err.message — could leak provider internals
  }
});

for (const action of ["play", "pause", "next"]) {
  spotifyRouter.post(`/${action}`, requireAuth, async (req, res) => {
    try {
      const token = await getValidAccessToken(req.user.id);
      if (!token) return res.status(401).json({ error: "not_connected" });
      await controlPlayback(token, action);
      res.json({ ok: true });
    } catch (err) {
      res.status(502).json({ error: "spotify_control_failed" });
    }
  });
}

spotifyRouter.post("/disconnect", requireAuth, (req, res) => {
  // Spotify has no public token-revocation endpoint (unlike Google) — the
  // documented way to disconnect is deleting the stored tokens and, if the
  // user wants to fully revoke, doing so from their Spotify account's own
  // "Apps" settings page. We do our half unconditionally.
  clearTokens(req.user.id, "spotify");
  res.json({ ok: true });
});

function popupCloseHtml(message) {
  return `<!doctype html><html><body style="font-family:sans-serif;background:#111;color:#eee;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center;padding:0 24px;">
    <p>${message}</p>
    <script>setTimeout(() => window.close(), 1400);</script>
  </body></html>`;
}
