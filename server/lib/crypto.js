// crypto.js
// AES-256-GCM for OAuth access/refresh tokens at rest, per the requirement
// that provider tokens be encrypted where practical, not just relying on
// filesystem permissions. Key comes from ENCRYPTION_KEY (.env) — a 32-byte
// value, base64-encoded. Generate one with:
//   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
// Losing/rotating this key makes existing stored tokens unrecoverable —
// that's fine, it just means every user has to reconnect Spotify/Google
// once, which is a normal and safe failure mode (see auth-report.md).

import crypto from "crypto";

function getKey() {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "ENCRYPTION_KEY is not set. Generate one with: " +
      `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))" ` +
      "and add it to server/.env."
    );
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error("ENCRYPTION_KEY must decode to exactly 32 bytes (base64-encoded).");
  }
  return key;
}

// Returns a single string ("iv:authTag:ciphertext", each base64) so it
// fits in one TEXT column without a separate migration for each part.
export function encrypt(plaintext) {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(String(plaintext), "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("base64"), authTag.toString("base64"), ciphertext.toString("base64")].join(":");
}

export function decrypt(packed) {
  if (!packed) return null;
  const key = getKey();
  const [ivB64, tagB64, dataB64] = packed.split(":");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const plaintext = Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]);
  return plaintext.toString("utf8");
}
