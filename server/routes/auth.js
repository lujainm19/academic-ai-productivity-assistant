import { Router } from "express";
import crypto from "crypto";
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

  // Google OAuth — Sign in with Google
// Step 1: redirect the browser to Google's consent screen
authRouter.get("/google", (req, res) => {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: process.env.GOOGLE_AUTH_REDIRECT_URI,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "select_account",
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

// Step 2: Google redirects back here with a code
// We exchange it for tokens, get the user's email, create/find account
authRouter.get("/google/callback", async (req, res) => {
  const { code } = req.query;
  if (!code) return res.redirect(`${process.env.FRONTEND_ORIGIN}?auth=error`);

  try {
    // Exchange code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: process.env.GOOGLE_AUTH_REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });

    const tokens = await tokenRes.json();
    if (!tokens.access_token) throw new Error("No access token");

    // Get user's Google profile
    const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const profile = await profileRes.json();
    if (!profile.email) throw new Error("No email from Google");

    // Find or create user in our database
    let user = findUserByEmail(profile.email);
    if (!user) {
      // Create account with a random password since they use Google to sign in
      const randomPassword = await hashPassword(crypto.randomBytes(32).toString("hex"));
      user = createUser(profile.email, randomPassword);
    }

    // Create session and set cookie
    const token = createSession(user.id);
    setSessionCookie(res, token);

    // Redirect back to the app
    res.redirect(`${process.env.FRONTEND_ORIGIN}/tasks`);
  } catch (err) {
    console.error("Google OAuth error:", err);
    res.redirect(`${process.env.FRONTEND_ORIGIN}?auth=error`);
  }
});
});
