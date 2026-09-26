// app-auth-context.tsx
// A small, separate identity layer — this is ONLY consulted by the
// Spotify/Calendar widgets, which need "whose tokens are these" to be a
// real answer. Every other page in this app stays exactly as it was:
// anonymous, localStorage-only, no login required. See server/lib/auth.js
// for the reasoning.
//
// The backend never hands the frontend a token of any kind — this
// component only ever knows `user: { email } | null`, exactly what
// `/api/auth/me` returns. Session state lives in an HttpOnly cookie the
// browser can't read; React only finds out the outcome, never the value.

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { ProdigyMark } from "./prodigy-mark";

interface AppUser {
  email: string;
}

interface AppAuthContextValue {
  user: AppUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ ok: true } | { ok: false; message: string }>;
  signup: (email: string, password: string) => Promise<{ ok: true } | { ok: false; message: string }>;
  logout: () => Promise<void>;
  // Widgets call this instead of reaching for a modal directly — if
  // already signed in, `onSuccess` fires immediately; otherwise the modal
  // opens and `onSuccess` fires once sign-in/signup succeeds.
  requireSignIn: (onSuccess: () => void) => void;
}

const AppAuthContext = createContext<AppAuthContextValue | null>(null);

async function api(path: string, options?: RequestInit) {
  const res = await fetch(`/api/auth${path}`, {
    method: "GET",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  return res;
}

export function AppAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingSuccess, setPendingSuccess] = useState<(() => void) | null>(null);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await api("/me");
      const data = await res.json();
      setUser(data.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api("/login", { method: "POST", body: JSON.stringify({ email, password }) });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { ok: false as const, message: data.message ?? "Couldn't sign in." };
    }
    await refresh();
    return { ok: true as const };
  }, [refresh]);

  const signup = useCallback(async (email: string, password: string) => {
    const res = await api("/signup", { method: "POST", body: JSON.stringify({ email, password }) });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { ok: false as const, message: data.message ?? "Couldn't create account." };
    }
    await refresh();
    return { ok: true as const };
  }, [refresh]);

  const logout = useCallback(async () => {
    await api("/logout", { method: "POST" });
    setUser(null);
  }, []);

  const requireSignIn = useCallback((onSuccess: () => void) => {
    if (user) { onSuccess(); return; }
    setPendingSuccess(() => onSuccess);
    setMode("login");
    setFormError(null);
    setModalOpen(true);
  }, [user]);

  const closeModal = () => { setModalOpen(false); setPendingSuccess(null); setFormError(null); };

  const handleSubmit = async (email: string, password: string) => {
    setSubmitting(true);
    setFormError(null);
    const result = mode === "login" ? await login(email, password) : await signup(email, password);
    setSubmitting(false);
    if (!result.ok) { setFormError(result.message); return; }
    pendingSuccess?.();
    closeModal();
  };

  return (
    <AppAuthContext.Provider value={{ user, loading, login, signup, logout, requireSignIn }}>
      {children}
      {modalOpen && (
        <AuthModal
          mode={mode}
          setMode={setMode}
          error={formError}
          submitting={submitting}
          onSubmit={handleSubmit}
          onClose={closeModal}
        />
      )}
    </AppAuthContext.Provider>
  );
}

function AuthModal({
  mode, setMode, error, submitting, onSubmit, onClose,
}: {
  mode: "login" | "signup";
  setMode: (m: "login" | "signup") => void;
  error: string | null;
  submitting: boolean;
  onSubmit: (email: string, password: string) => void;
  onClose: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm p-6 rounded-2xl bg-[#161420] border border-white/10 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <ProdigyMark size={30} blink className="text-white mb-3" />
        <h3 className="text-lg font-medium text-white mb-1">
          {mode === "login" ? "Sign in" : "Create an account"}
        </h3>
        <form
          onSubmit={e => { e.preventDefault(); onSubmit(email, password); }}
          className="space-y-3"
        >
          <input
            type="email"
            required
            autoFocus
            placeholder="you@school.edu"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.06] border border-white/10 text-sm text-white placeholder:text-white/30 outline-none focus:border-white/30"
          />
          <input
            type="password"
            required
            minLength={8}
            placeholder={mode === "signup" ? "Password (8+ characters)" : "Password"}
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.06] border border-white/10 text-sm text-white placeholder:text-white/30 outline-none focus:border-white/30"
          />
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 rounded-xl bg-white text-black text-sm font-medium disabled:opacity-50"
          >
            {submitting ? "…" : mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>
        <button
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
          className="w-full text-center text-xs text-white/45 hover:text-white/70 mt-4 transition-colors"
        >
          {mode === "login" ? "Need an account? Sign up" : "Already have an account? Sign in"}
        </button>
        <div className="relative my-2">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/10" />
        </div>
        <div className="relative flex justify-center">
          <span className="px-2 text-xs text-white/30 bg-[#161420]">or</span>
        </div>
      </div>

      {/* Google Sign In button */}

      <a  
        href="/api/auth/google"
        className="w-full py-2.5 rounded-xl border border-white/10 text-sm font-medium flex items-center justify-center gap-2 hover:bg-white/5 transition-colors text-white"
      >
        <svg className="size-4" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Continue with Google
      </a>
      </div>
    </div>
  );
}

export function useAppAuth() {
  const ctx = useContext(AppAuthContext);
  if (!ctx) throw new Error("useAppAuth must be used within AppAuthProvider");
  return ctx;
}
