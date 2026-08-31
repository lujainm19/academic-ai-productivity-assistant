// oauthState.js
// The `state` parameter is what makes the OAuth callback trustworthy.
// When a logged-in user clicks "Connect", we mint a random one-time value
// and record {state → user_id} server-side *before* redirecting to the
// provider. When the provider redirects back to /callback, we look up
// that state — not a cookie, not a query param the browser could forge —
// to find out whose connection this is. A state is deleted the moment
// it's used (or expires after 10 minutes), so a captured/replayed
// callback URL can't be replayed a second time.

import crypto from "crypto";
import { db } from "./db.js";

const STATE_TTL_MS = 10 * 60 * 1000;

export function createOAuthState(userId, provider) {
  const state = crypto.randomBytes(16).toString("hex");
  db.prepare("INSERT INTO oauth_states (state, user_id, provider, expires_at) VALUES (?, ?, ?, ?)")
    .run(state, userId, provider, Date.now() + STATE_TTL_MS);
  return state;
}

// Consumes the state (one-time use) and returns the user id it belonged
// to, or null if it's missing, expired, or was already used.
export function consumeOAuthState(state, provider) {
  const row = db.prepare("SELECT * FROM oauth_states WHERE state = ? AND provider = ?").get(state, provider);
  if (!row) return null;
  db.prepare("DELETE FROM oauth_states WHERE state = ?").run(state);
  if (row.expires_at < Date.now()) return null;
  return row.user_id;
}
