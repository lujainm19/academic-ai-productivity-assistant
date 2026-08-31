# Backend (Canvas + Gemini + Spotify + Google Calendar)

A small Express server that holds every third-party credential server-side —
API tokens and OAuth client secrets must never live in the frontend, since
Vite bundles are fully public.

Spotify and Google Calendar are **multi-user**: each person who uses this
app connects their own account, never a shared one. That requires this
server to know who's asking, which is what the small email/password account
system (`routes/auth.js`) exists for — see [SECURITY.md](./SECURITY.md) for
the full design and a point-by-point audit. Nothing else in the app (tasks,
focus canvas, customization) uses these accounts; they stay anonymous and
localStorage-only, same as always.

## Setup

```bash
cd server
npm install
cp .env.example .env
```

Fill in `.env`:

- `SESSION_SECRET` / `ENCRYPTION_KEY` — **required**, the server refuses to
  start without `SESSION_SECRET`. Generate each with:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
  ```
  (run it twice, once per variable — don't reuse the same value for both).
- `CANVAS_BASE_URL` / `CANVAS_API_TOKEN` — Canvas → Account → Settings →
  New Access Token.
- `GEMINI_API_KEY` — https://aistudio.google.com/apikey (free tier).
- `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET` — https://developer.spotify.com/dashboard
  → Create app. Add `http://localhost:8787/api/integrations/spotify/callback`
  under **Redirect URIs** — must match `SPOTIFY_REDIRECT_URI` exactly.
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — https://console.cloud.google.com
  → **APIs & Services → Credentials → Create OAuth client ID** (type: Web
  application). Add `http://localhost:8787/api/integrations/google/callback`
  under **Authorized redirect URIs**. Also enable the **Google Calendar API**
  under **APIs & Services → Library** — the OAuth client alone isn't enough.

Canvas and Gemini degrade gracefully with no account system involved (same
as before). Spotify and Calendar additionally need a signed-in app account
before "Connect" does anything — the widget prompts for that itself.

## Run

```bash
npm run dev
```

Runs on `http://localhost:8787`, backed by a SQLite database at
`server/.data/app.db` (created automatically, gitignored). The frontend's
Vite dev server proxies `/api/*` here (see `vite.config.ts`), so the app
just calls `fetch("/api/...")` — no CORS setup needed in dev.

Run the frontend and backend in two terminals:

```bash
# terminal 1
cd server && npm run dev

# terminal 2
cd .. && npm run dev
```

## Endpoints

**Accounts** (`/api/auth/*`) — the app-level account, unrelated to Canvas/Spotify/Google:
- `POST /signup`, `POST /login` — `{ email, password }` → sets an HttpOnly session cookie
- `POST /logout`
- `GET /me` — `{ user: { email } | null }`

**Canvas / Gemini** — unchanged from before:
- `GET /api/canvas/courses`, `GET /api/canvas/assignments`
- `POST /api/ai/chat` — `{ message, history?, context? }` → `{ reply }`

**Spotify** (`/api/integrations/spotify/*`) — all require a signed-in app account except `/callback`:
- `GET /connect` — redirects to Spotify's consent screen (open in a popup, not a full navigation)
- `GET /callback` — Spotify redirects here; not auth-gated itself, the one-time `state` value is what ties it back to the right user
- `GET /now-playing` — current track, or `401` if this user hasn't connected
- `POST /play`, `POST /pause`, `POST /next`
- `POST /disconnect`

**Google Calendar** (`/api/integrations/google/*`) — same shape:
- `GET /connect`, `GET /callback`, `GET /calendar`, `POST /disconnect`

Every route returns `501` with a clear message if its own credentials
(`SPOTIFY_CLIENT_ID` etc.) aren't set in `.env`, and `401` if they *are* set
but this particular user hasn't connected — the frontend widgets turn both
into a plain "not connected" state rather than showing an error.

## Why popups, not redirects, for "Connect"

Clicking "Connect" opens `/connect` in a small popup window, not a full-page
redirect. That way connecting doesn't navigate the user away from their
focus canvas and lose in-progress timer state — the popup handles the
provider's consent screen, the backend stores the tokens when it lands on
`/callback`, and the popup closes itself; the widget notices it closed and
refreshes.
