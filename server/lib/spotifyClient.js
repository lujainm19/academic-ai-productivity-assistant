// spotifyClient.js
// Spotify Web API via the Authorization Code flow (confirmed current as
// of Spotify's developer docs: the Implicit Grant flow is deprecated for
// new apps, and PKCE is Spotify's recommendation specifically for clients
// that *can't* keep a secret — a browser SPA or mobile app. This app has
// a real backend that never ships the client secret to the browser, so
// the plain Authorization Code flow is the correct, current choice here,
// not PKCE. Docs: https://developer.spotify.com/documentation/web-api/tutorials/code-flow
//
// Scopes requested, and why — nothing broader:
//   user-read-currently-playing — the widget's core feature (title,
//     artist, artwork, playback state).
//   user-read-playback-state    — needed alongside the above to know
//     *whether* something is playing at all vs. just what it would be.
//   user-modify-playback-state  — only for the play/pause/skip controls
//     the widget also exposes. If those controls are ever removed, this
//     scope should go with them.
// Deliberately not requested: playlist access, library/saved-tracks
// access, follow/social graph, or anything else Spotify's API surface
// offers that this widget doesn't use.
//
// Every function here takes a userId and reads/writes only that user's
// row via tokenStore.js — there is no "the" Spotify token, only "this
// user's" Spotify token.

import { getTokens, setTokens } from "./tokenStore.js";

const SCOPES = ["user-read-currently-playing", "user-read-playback-state", "user-modify-playback-state"].join(" ");

export function isSpotifyConfigured() {
  return Boolean(process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET);
}

export function getAuthUrl(state) {
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI || "http://localhost:8787/api/integrations/spotify/callback";
  const url = new URL("https://accounts.spotify.com/authorize");
  url.searchParams.set("client_id", process.env.SPOTIFY_CLIENT_ID);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", SCOPES);
  url.searchParams.set("state", state);
  return url.toString();
}

function basicAuthHeader() {
  const raw = `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`;
  return `Basic ${Buffer.from(raw).toString("base64")}`;
}

export async function exchangeCode(userId, code) {
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI || "http://localhost:8787/api/integrations/spotify/callback";
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: basicAuthHeader() },
    body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: redirectUri }),
  });
  if (!res.ok) throw new Error(`Spotify token exchange failed: ${res.status}`);
  const data = await res.json();
  setTokens(userId, "spotify", {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
    scope: data.scope,
  });
}

async function refresh(userId, tokens) {
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: basicAuthHeader() },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: tokens.refreshToken }),
  });
  if (res.status === 400 || res.status === 401) {
    // Refresh token itself is invalid/revoked — the user disconnected
    // from Spotify's side, or it expired. Caller treats null as
    // "needs to reconnect", not a crash.
    return null;
  }
  if (!res.ok) throw new Error(`Spotify token refresh failed: ${res.status}`);
  const data = await res.json();
  return setTokens(userId, "spotify", {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || tokens.refreshToken, // Spotify only sometimes rotates it
    expiresAt: Date.now() + data.expires_in * 1000,
    scope: data.scope,
  });
}

// Returns null (never throws for "not connected") when there's nothing
// stored yet, or the stored refresh token has stopped working — callers
// treat that as "show reconnect", not a 500.
export async function getValidAccessToken(userId) {
  let tokens = getTokens(userId, "spotify");
  if (!tokens?.refreshToken) return null;
  if (tokens.expiresAt < Date.now() + 30_000) {
    tokens = await refresh(userId, tokens);
    if (!tokens) return null;
  }
  return tokens.accessToken;
}

export async function getCurrentlyPlaying(accessToken) {
  const res = await fetchWithRateLimit("https://api.spotify.com/v1/me/player/currently-playing", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (res.status === 204) return null; // nothing playing
  if (!res.ok) throw new Error(`Spotify API ${res.status}`);
  const data = await res.json();
  if (!data?.item) return null;
  // Normalized to exactly what the widget renders — not Spotify's full
  // response shape (which includes device info, shuffle/repeat state,
  // context URIs, etc. the frontend has no use for).
  return {
    title: data.item.name,
    artist: data.item.artists?.map(a => a.name).join(", ") ?? "",
    albumArt: data.item.album?.images?.[1]?.url ?? data.item.album?.images?.[0]?.url,
    isPlaying: data.is_playing,
    progressMs: data.progress_ms,
    durationMs: data.item.duration_ms,
  };
}

export async function controlPlayback(accessToken, action) {
  const endpoint = action === "next" ? "next" : action; // "play" | "pause" | "next"
  const method = action === "next" ? "POST" : "PUT";
  const res = await fetchWithRateLimit(`https://api.spotify.com/v1/me/player/${endpoint}`, {
    method,
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  // 204 = success, 404 = no active device — both fine to swallow; the
  // widget just re-polls and shows whatever's true a moment later.
  if (!res.ok && res.status !== 404) throw new Error(`Spotify control ${res.status}`);
}

// Spotify's documented behavior for 429s is to respect Retry-After.
// One retry is enough here — this is a periodically-polled widget, not a
// batch job, so a second failure just waits for the next poll cycle
// instead of retrying in a loop.
async function fetchWithRateLimit(url, opts) {
  const res = await fetch(url, opts);
  if (res.status === 429) {
    const retryAfterSec = Number(res.headers.get("Retry-After")) || 1;
    await new Promise(r => setTimeout(r, retryAfterSec * 1000));
    return fetch(url, opts);
  }
  return res;
}
