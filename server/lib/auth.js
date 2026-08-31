// auth.js
// The entire identity system for this app, deliberately small in scope:
// it exists ONLY so Spotify/Calendar tokens have a "whose" to attach to.
// Nothing else in the app (tasks, focus canvas, customization) reads from
// or requires this — those stay exactly as they are today, anonymous and
// localStorage-only. Forcing a login just to see a Dashboard would be a
// much bigger UX change than the security requirement actually calls for.
//
// Sessions are server-side (a random token in an HttpOnly cookie, looked
// up against the `sessions` table on every request) rather than a signed
// JWT-in-cookie — the difference that matters here is that logout, or an
// admin revoking a session, takes effect immediately. A JWT would keep
// working until it expired.

import bcrypt from "bcryptjs";
import crypto from "crypto";
import { db } from "./db.js";

const SESSION_COOKIE = "session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

export function createUser(email, passwordHash) {
  const stmt = db.prepare("INSERT INTO users (email, password_hash, created_at) VALUES (?, ?, ?)");
  const info = stmt.run(email.toLowerCase().trim(), passwordHash, Date.now());
  return { id: info.lastInsertRowid, email };
}

export function findUserByEmail(email) {
  return db.prepare("SELECT * FROM users WHERE email = ?").get(email.toLowerCase().trim());
}

export function createSession(userId) {
  const token = crypto.randomBytes(32).toString("hex");
  db.prepare("INSERT INTO sessions (token, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)")
    .run(token, userId, Date.now() + SESSION_TTL_MS, Date.now());
  return token;
}

export function destroySession(token) {
  db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
}

function getSessionUser(token) {
  if (!token) return null;
  const row = db.prepare(
    `SELECT users.id, users.email, sessions.expires_at
     FROM sessions JOIN users ON users.id = sessions.user_id
     WHERE sessions.token = ?`
  ).get(token);
  if (!row) return null;
  if (row.expires_at < Date.now()) {
    destroySession(token);
    return null;
  }
  return { id: row.id, email: row.email };
}

const cookieOpts = () => ({
  httpOnly: true,
  sameSite: "lax", // "lax" (not "strict") so the OAuth-provider redirect back to /callback still carries it
  secure: process.env.NODE_ENV === "production", // plain http in local dev, HTTPS-only in production
  maxAge: SESSION_TTL_MS,
  signed: true,
});

export function setSessionCookie(res, token) {
  res.cookie(SESSION_COOKIE, token, cookieOpts());
}

export function clearSessionCookie(res) {
  res.clearCookie(SESSION_COOKIE, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" });
}

// The one place that decides "who is asking" — every route that touches a
// specific user's data (Spotify tokens, Calendar tokens) uses this instead
// of trusting a client-supplied user id or email.
export function requireAuth(req, res, next) {
  const token = req.signedCookies?.[SESSION_COOKIE];
  const user = getSessionUser(token);
  if (!user) return res.status(401).json({ error: "not_authenticated", message: "Sign in required." });
  req.user = user;
  next();
}

// Non-blocking version for routes that behave differently when logged in
// vs not, without requiring it (e.g. "am I signed in?").
export function attachUserIfPresent(req, res, next) {
  const token = req.signedCookies?.[SESSION_COOKIE];
  req.user = getSessionUser(token);
  next();
}
