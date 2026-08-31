import { Router } from "express";
import {
  hashPassword, verifyPassword, createUser, findUserByEmail,
  createSession, destroySession, setSessionCookie, clearSessionCookie,
  attachUserIfPresent,
} from "../lib/auth.js";

export const authRouter = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

authRouter.post("/signup", async (req, res) => {
  const { email, password } = req.body ?? {};
  if (typeof email !== "string" || !EMAIL_RE.test(email)) {
    return res.status(400).json({ error: "invalid_email", message: "Enter a valid email address." });
  }
  if (typeof password !== "string" || password.length < 8) {
    return res.status(400).json({ error: "weak_password", message: "Password must be at least 8 characters." });
  }
  if (findUserByEmail(email)) {
    return res.status(409).json({ error: "email_taken", message: "An account with that email already exists." });
  }
  const hash = await hashPassword(password);
  const user = createUser(email, hash);
  const token = createSession(user.id);
  setSessionCookie(res, token);
  res.json({ email: user.email });
});

authRouter.post("/login", async (req, res) => {
  const { email, password } = req.body ?? {};
  if (typeof email !== "string" || typeof password !== "string") {
    return res.status(400).json({ error: "bad_request", message: "Email and password required." });
  }
  const user = findUserByEmail(email);
  // Same generic message whether the email doesn't exist or the password
  // is wrong — distinguishing them would let an attacker enumerate which
  // emails have accounts.
  const genericFail = () => res.status(401).json({ error: "invalid_credentials", message: "Incorrect email or password." });
  if (!user) return genericFail();
  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) return genericFail();
  const token = createSession(user.id);
  setSessionCookie(res, token);
  res.json({ email: user.email });
});

authRouter.post("/logout", (req, res) => {
  const token = req.signedCookies?.session;
  if (token) destroySession(token);
  clearSessionCookie(res);
  res.json({ ok: true });
});

// Lets the frontend ask "am I signed in?" without needing a 401 to mean
// anything special — the Spotify/Calendar widgets use this to decide
// whether to show a sign-in prompt or the provider's own Connect button.
authRouter.get("/me", attachUserIfPresent, (req, res) => {
  res.json({ user: req.user ? { email: req.user.email } : null });
});
