// googleCalendarClient.js
// Google Calendar via OAuth 2.0 (confirmed current per Google's Calendar
// API + Identity docs). Authorization Code flow, exchanged server-side —
// the client secret never reaches the browser.
//
// Scope requested, and why — the single narrowest one available:
//   https://www.googleapis.com/auth/calendar.readonly
// This grants read-only access to the whole calendar, which is Google's
// documented minimum granularity for calendar *reading* — there is no
// narrower "just event titles" or "just one calendar" scope. It does NOT
// grant calendar.events (create/edit/delete) or the full `calendar` scope
// (which also allows write access and calendar management). No Gmail,
// Drive, Photos, Contacts, or profile scopes are requested — this app has
// no feature that uses them.
//
// Every function takes a userId; there is no "the" Google token.

import { getTokens, setTokens } from "./tokenStore.js";

const SCOPE = "https://www.googleapis.com/auth/calendar.readonly";

export function isGoogleCalendarConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function getAuthUrl(state) {
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || "http://localhost:8787/api/integrations/google/callback";
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", SCOPE);
  url.searchParams.set("access_type", "offline"); // required to get a refresh_token
  url.searchParams.set("prompt", "consent"); // forces a refresh_token even on a repeat connect
  url.searchParams.set("state", state);
  return url.toString();
}

export async function exchangeCode(userId, code) {
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || "http://localhost:8787/api/integrations/google/callback";
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  });
  if (!res.ok) throw new Error(`Google token exchange failed: ${res.status}`);
  const data = await res.json();
  setTokens(userId, "google", {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
    scope: data.scope,
  });
}

async function refresh(userId, tokens) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: tokens.refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  });
  if (res.status === 400 || res.status === 401) {
    return null; // refresh token revoked/expired — caller shows "reconnect"
  }
  if (!res.ok) throw new Error(`Google token refresh failed: ${res.status}`);
  const data = await res.json();
  return setTokens(userId, "google", {
    accessToken: data.access_token,
    refreshToken: tokens.refreshToken, // Google doesn't re-send this on refresh
    expiresAt: Date.now() + data.expires_in * 1000,
    scope: tokens.scope,
  });
}

export async function getValidAccessToken(userId) {
  let tokens = getTokens(userId, "google");
  if (!tokens?.refreshToken) return null;
  if (tokens.expiresAt < Date.now() + 30_000) {
    tokens = await refresh(userId, tokens);
    if (!tokens) return null;
  }
  return tokens.accessToken;
}

// getUpcomingCalendarEvents(start, end) — not downloadEntireCalendar().
// Bounded to a real window (defaults: now → 7 days out) so a connect
// never pulls a user's full event history.
export async function getUpcomingCalendarEvents(accessToken, { start, end, max = 5 } = {}) {
  const timeMin = start ?? new Date();
  const timeMax = end ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const url = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
  url.searchParams.set("timeMin", timeMin.toISOString());
  url.searchParams.set("timeMax", timeMax.toISOString());
  url.searchParams.set("maxResults", String(max));
  url.searchParams.set("orderBy", "startTime");
  url.searchParams.set("singleEvents", "true");
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error(`Google Calendar API ${res.status}`);
  const data = await res.json();
  // Normalized to only the fields the widget (and later, an AI tool)
  // needs — not Google's full event object (attendees, conference data,
  // reminders, extended properties, etc.).
  return (data.items ?? []).map(e => ({
    title: e.summary || "(untitled)",
    startTime: e.start?.dateTime || e.start?.date,
    endTime: e.end?.dateTime || e.end?.date,
    calendarName: "primary",
    location: e.location || null,
  }));
}

// Per Google's documented token revocation endpoint — called on
// disconnect so the grant is actually revoked on Google's side, not just
// deleted from our own database.
export async function revokeToken(accessToken) {
  try {
    await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(accessToken)}`, { method: "POST" });
  } catch {
    // Best-effort — we still delete our stored copy either way (see routes/google.js).
  }
}
