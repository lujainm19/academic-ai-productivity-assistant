// db.js
// SQLite, not a hosted database — this app has no other persistent
// storage, and adding a server process (Postgres/MySQL) to run just for
// four small tables would be disproportionate infrastructure for its
// actual scale. better-sqlite3 is synchronous (no connection pool, no
// async footguns) and the file lives at server/.data/app.db, gitignored.
//
// Four tables:
//   users             — email + bcrypt password hash. This is the whole
//                        identity system; nothing else in the app (tasks,
//                        focus canvas, etc.) uses it — see the note in
//                        auth.js about why that scope is deliberate.
//   sessions          — opaque random token → user id, with an expiry.
//                        Server-side sessions (not a JWT-in-cookie) so a
//                        session can be revoked immediately on logout.
//   oauth_states      — short-lived, one-time `state` values minted right
//                        before redirecting to Spotify/Google, mapping
//                        back to the user who asked. This is what lets
//                        /callback determine the right user WITHOUT
//                        trusting anything the browser or the redirect
//                        itself claims — see routes/spotify.js.
//   oauth_connections — one row per (user, provider), tokens encrypted at
//                        rest (see lib/crypto.js). Replaces the old flat
//                        tokens.json, which had no concept of "whose".

import Database from "better-sqlite3";
import { existsSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", ".data");
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

export const db = new Database(join(DATA_DIR, "app.db"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at    INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token      TEXT PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

  CREATE TABLE IF NOT EXISTS oauth_states (
    state      TEXT PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider   TEXT NOT NULL,
    expires_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS oauth_connections (
    id                     INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id                INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider               TEXT NOT NULL,
    provider_account_id    TEXT,
    access_token_encrypted TEXT NOT NULL,
    refresh_token_encrypted TEXT,
    expires_at             INTEGER,
    scope                  TEXT,
    created_at             INTEGER NOT NULL,
    updated_at             INTEGER NOT NULL,
    UNIQUE(user_id, provider)
  );
`);
