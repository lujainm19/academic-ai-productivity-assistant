// tokenStore.js
// Replaces the earlier flat-file version, which stored one shared token
// per provider for the whole server — exactly the "everyone shares one
// account" problem this rewrite exists to fix. Every row here is scoped
// to a user_id; every read/write here takes one as a required argument,
// so it's structurally impossible to call this without saying whose
// tokens you mean.

import { db } from "./db.js";
import { encrypt, decrypt } from "./crypto.js";

// provider: "spotify" | "google"
export function getTokens(userId, provider) {
  const row = db.prepare(
    "SELECT * FROM oauth_connections WHERE user_id = ? AND provider = ?"
  ).get(userId, provider);
  if (!row) return null;
  return {
    accessToken: decrypt(row.access_token_encrypted),
    refreshToken: decrypt(row.refresh_token_encrypted),
    expiresAt: row.expires_at,
    providerAccountId: row.provider_account_id,
    scope: row.scope,
  };
}

export function setTokens(userId, provider, tokens) {
  const now = Date.now();
  const accessEnc = encrypt(tokens.accessToken);
  const refreshEnc = tokens.refreshToken != null ? encrypt(tokens.refreshToken) : null;
  db.prepare(`
    INSERT INTO oauth_connections
      (user_id, provider, provider_account_id, access_token_encrypted, refresh_token_encrypted, expires_at, scope, created_at, updated_at)
    VALUES (@userId, @provider, @providerAccountId, @accessEnc, @refreshEnc, @expiresAt, @scope, @now, @now)
    ON CONFLICT(user_id, provider) DO UPDATE SET
      access_token_encrypted = excluded.access_token_encrypted,
      refresh_token_encrypted = COALESCE(excluded.refresh_token_encrypted, oauth_connections.refresh_token_encrypted),
      expires_at = excluded.expires_at,
      scope = excluded.scope,
      updated_at = excluded.updated_at
  `).run({
    userId, provider,
    providerAccountId: tokens.providerAccountId ?? null,
    accessEnc, refreshEnc,
    expiresAt: tokens.expiresAt ?? null,
    scope: tokens.scope ?? null,
    now,
  });
  return getTokens(userId, provider);
}

export function clearTokens(userId, provider) {
  db.prepare("DELETE FROM oauth_connections WHERE user_id = ? AND provider = ?").run(userId, provider);
}
