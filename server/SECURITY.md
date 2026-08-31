# Google Calendar + Spotify integration — architecture & security audit

Written after implementation, verified live (signup/login/logout, session
isolation between two accounts, OAuth-connect redirects, invalid/replayed
`state` rejection — see the bottom of this doc for what was actually tested
vs. what can only be verified once real Spotify/Google credentials exist).

## 1. Final architecture

```
Browser (React)
  │  fetch(..., { credentials: "include" })
  │  — never sees a provider token, only "connected: true/false"
  ▼
Express backend (server/)
  │
  ├─ routes/auth.js ──────────── email+password, HttpOnly session cookie
  │                               (this is the ONLY identity system —
  │                                nothing else in the app uses it)
  │
  ├─ routes/spotify.js ─┐
  ├─ routes/google.js ──┤─ requireAuth middleware → req.user.id
  │                     │  (never a client-supplied id)
  │                     ▼
  │              lib/spotifyClient.js
  │              lib/googleCalendarClient.js
  │              lib/oauthState.js  — one-time `state`, ties an OAuth
  │                                    callback back to the user who
  │                                    started it
  │                     ▼
  └─ lib/tokenStore.js ─────────── reads/writes ONE user's row, always
                        │
                        ▼
                 lib/crypto.js ── AES-256-GCM, encrypts tokens before
                        │          they touch disk
                        ▼
                 lib/db.js ─────── SQLite (server/.data/app.db)
                                   tables: users, sessions, oauth_states,
                                   oauth_connections
```

SQLite, not a hosted database — this app has no other persistent storage,
and running a separate database server for four small tables would be
disproportionate for its actual scale. It's a single file, gitignored,
with no networked attack surface of its own.

## 2. OAuth flow — Google Calendar

1. User is on the Focus page, not signed into the app. Clicks "Connect
   Google Calendar."
2. `requireSignIn()` (frontend) notices there's no app session → opens the
   sign-in/signup modal. On success, the pending "connect" action fires.
3. Frontend opens `/api/integrations/google/connect` in a **popup**
   (`credentials: include` on the request that got them signed in already
   set the session cookie).
4. Backend: `requireAuth` confirms the session, then
   `createOAuthState(userId, "google")` mints a random one-time value and
   stores `{state → user_id}` server-side. Redirects the popup to Google's
   consent screen with that `state`.
5. User signs into **their own** Google account and grants calendar
   read-only access.
6. Google redirects the popup to `/api/integrations/google/callback?code&state`.
7. Backend: `consumeOAuthState(state, "google")` looks up which user this
   belongs to — deletes the state row (one-time use) and rejects if it's
   missing/expired. This is what makes step 6 trustworthy: nothing about
   this request is taken on faith, not a cookie, not a query param.
8. Backend exchanges `code` for an access + refresh token directly with
   Google (client secret attached server-side only), encrypts both, and
   upserts them into `oauth_connections` keyed to that user's id.
9. Popup shows a one-line confirmation and closes itself. The widget
   (which had been polling `w.closed`) notices and refetches.
10. `GET /api/integrations/google/calendar` — `requireAuth` → looks up
    *this* user's token → refreshes it if it's within 30s of expiring →
    calls Google's Calendar API → returns only `{title, startTime,
    endTime, calendarName, location}` per event. The frontend never sees
    the token.

## 3. OAuth flow — Spotify

Identical shape to Google's, steps 1–9 above, with two differences:

- **Flow choice**: Authorization Code (not PKCE, not Implicit Grant).
  Spotify's current docs recommend PKCE specifically for clients that
  *can't* hold a secret — a browser SPA or mobile app. This app has a real
  backend that never ships the client secret to the browser, so plain
  Authorization Code is the correct, current choice, not PKCE, and
  Implicit Grant is deprecated and wasn't considered.
- Playback control (`/play`, `/pause`, `/next`) and `/now-playing` all
  re-derive the user from the session the same way — there is no version
  of these endpoints that takes a user id as input.

## 4. Secrets / environment variables you need to create

| Variable | Where it comes from | What it's for |
|---|---|---|
| `SESSION_SECRET` | generate locally (see README) | signs the session cookie |
| `ENCRYPTION_KEY` | generate locally (see README) | encrypts stored OAuth tokens |
| `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET` | Spotify Developer Dashboard | this app's identity to Spotify |
| `SPOTIFY_REDIRECT_URI` | you set it, must match the Dashboard exactly | where Spotify redirects after consent |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google Cloud Console | this app's identity to Google |
| `GOOGLE_REDIRECT_URI` | you set it, must match Cloud Console exactly | where Google redirects after consent |

Not listed because they're not secrets: individual users' passwords
(never stored — only a bcrypt hash) and their Spotify/Google tokens (see
§9, never leave the server).

## 5. Where each secret is stored

- All of the above: `server/.env`, gitignored, read once at process start
  via `dotenv`. Never committed, never logged, never sent to the frontend
  in any response.
- Per-user OAuth **tokens** (not app secrets, but equally sensitive):
  `server/.data/app.db`, in the `oauth_connections` table, each token
  individually AES-256-GCM-encrypted with `ENCRYPTION_KEY` before the
  `INSERT`. Reading the raw database file without the key gets you
  ciphertext, not a usable token.
- Session tokens: `sessions` table, keyed by a random 256-bit value; the
  browser only ever holds that opaque value (in a signed, HttpOnly
  cookie), never anything that unlocks Spotify/Google directly.

## 6. Scopes requested, and why

**Spotify** — `user-read-currently-playing`, `user-read-playback-state`,
`user-modify-playback-state`. The first two are the widget's core feature
(what's playing, is anything playing at all); the third exists only
because the widget also has play/pause/skip buttons — if those controls
were removed, this scope should go with them. Nothing broader: no
library/saved-tracks access, no playlist access, no follow/social graph.

**Google Calendar** — `https://www.googleapis.com/auth/calendar.readonly`,
the narrowest scope Google's Calendar API offers for reading events. There
is no finer-grained "just titles" or "just one calendar" scope available —
this is already the minimum. Explicitly *not* requested: `calendar.events`
(write access), the full `calendar` scope (write + calendar management),
or anything touching Gmail, Drive, Photos, or Contacts — this app has no
feature that uses them.

## 7. What's stored in the database

| Table | Columns | Notes |
|---|---|---|
| `users` | id, email, password_hash, created_at | bcrypt hash only, cost factor 12 |
| `sessions` | token, user_id, expires_at | 30-day expiry, deleted immediately on logout |
| `oauth_states` | state, user_id, provider, expires_at | 10-minute TTL, deleted on first use |
| `oauth_connections` | user_id, provider, **encrypted** access/refresh token, expires_at, scope | one row per (user, provider) |

Not stored anywhere: raw passwords, raw OAuth tokens, Spotify library
contents, full calendar history (see §8 — bounded to a 7-day window,
fetched fresh on each request, never cached to disk).

## 8. What's sent to Gemini

**Nothing from Spotify or Google, currently.** The `/api/ai/chat` endpoint
built earlier in this project accepts a `context` string the *frontend*
assembles from the user's local tasks — it does not touch these
integrations. If a future "what's on my calendar tomorrow?" feature gets
built, it should follow the pattern this backend already sets up for it:
narrow, named server-side functions (`getUpcomingCalendarEvents()`,
`getTodaysSchedule()`, `findFreeTime()`, `getCurrentlyPlaying()`) that the
backend executes *after* re-deriving the user from their session — Gemini
would receive only the normalized `{title, startTime, endTime}`-shaped
output already implemented in `googleCalendarClient.js`, never a
credential, and never a broader query than the specific tool asked for.
Any event title, location, or track name that does reach Gemini this way
must be treated as inert data in the prompt, not as instructions — the
same rule as any other untrusted user content. That layer isn't built yet;
this section describes the contract it must follow when it is.

## 9. What the browser can and cannot see

**Can see:** `{ user: { email } | null }` from `/api/auth/me`; `{
connected: true/false }`-shaped state inferred from a 401 vs. 200 on the
data endpoints; normalized track/event data *after* a successful request
(track title/artist/artwork, event title/time) — never the provider's raw
API response.

**Cannot see, ever:** Spotify or Google client secret, any access token,
any refresh token, the encryption key, the session secret, or another
user's data of any kind. None of these appear in a React prop, a
`fetch` response body, `localStorage`, `sessionStorage`, a URL, or a
console log — grep the frontend bundle for `client_secret` or
`refresh_token` and the only matches are in comments explaining why they
don't appear there.

## 10. Security checklist

- [x] Google OAuth is user-specific — every token row has a `user_id`, every route re-derives it from the session
- [x] Spotify OAuth is user-specific — same
- [x] No personal account used as a shared credential — there is no code path that can serve one user's tokens for another user's request
- [x] Google client secret server-side only (`.env`, read by `googleCalendarClient.js`, never returned in any response)
- [x] Spotify client secret server-side only (same)
- [x] Google access tokens server-side only, encrypted at rest
- [x] Google refresh tokens server-side only, encrypted at rest
- [x] Spotify access tokens server-side only, encrypted at rest
- [x] Spotify refresh tokens server-side only, encrypted at rest
- [x] No tokens in localStorage — verified: the frontend never receives one to store
- [x] No tokens in sessionStorage — same
- [x] No tokens in URLs — `state` is a random opaque value, not a token; tokens themselves never appear in a query string
- [x] No secrets in the frontend bundle — nothing in `src/` imports or embeds a client secret
- [x] No secrets committed to Git — `.env` and `.data/` both gitignored
- [x] `.env` protected — gitignored, `dotenv`-loaded server-side only
- [x] OAuth `state` validation exists — one-time, 10-minute TTL, tied to a user id at mint time (verified: a replayed/invalid state is rejected with a clean message, not a crash)
- [x] Redirect URIs are exact — set via env var, must match each provider's dashboard configuration exactly; no wildcards, no user-suppliable redirect
- [x] Every private endpoint requires authentication — `requireAuth` middleware on every route except the two OAuth `/callback` endpoints, which authenticate via `state` instead (a session cookie can't be relied on across a cross-site provider redirect)
- [x] User A cannot access User B's data — verified live: two accounts created, session B correctly reported `not_connected` regardless of anything account A did
- [ ] Gemini does not receive unnecessary personal data — **not yet applicable**, no Gemini tool touches these integrations yet (see §8); the contract is written for when it does
- [ ] Gemini cannot directly access provider credentials — same, not yet applicable
- [x] External calendar/Spotify content treated as untrusted — normalized to plain data fields before it reaches any other system; §8 states this explicitly as a requirement for the future AI layer too
- [x] Provider rate limits respected — Spotify 429s honor `Retry-After` with a single retry, no retry loop; polling is on a fixed 15s interval, not per-render
- [x] Disconnect/reconnect works — verified live: `/disconnect` deletes the stored connection (and, for Google, calls the documented revoke endpoint first); "Connect" is the same button either way
- [x] Revoked/expired authorization handled gracefully — a failed refresh returns `null` up the call chain, which the route turns into a `401`, which the widget turns into "Connect" — never a raw provider error reaches the UI
- [ ] Production uses HTTPS — **not yet applicable**, this app isn't deployed anywhere yet; `secure: true` on the session cookie is already gated on `NODE_ENV === "production"` so it activates automatically once it is

## What's been verified vs. what can't be yet

Verified against the running server: signup/login/logout, session cookie
round-tripping, two independent accounts with confirmed data isolation,
duplicate-email and weak-password rejection, generic (non-enumerating)
login failure message, `requireAuth` correctly blocking unauthenticated
`/connect` and `/disconnect` calls, and — using placeholder Spotify
credentials — a real redirect through this app's own `/connect` all the
way to Spotify's actual consent screen with the correct `client_id`,
`redirect_uri`, and scopes in the URL.

**Not verifiable without your own Spotify/Google developer credentials**:
a completed token exchange, real `/now-playing` or `/calendar` data, and
token refresh against a real expiring token. Once you add real credentials
to `.env`, the first full connect will exercise that remaining path.
