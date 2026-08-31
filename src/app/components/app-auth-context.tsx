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
        <h3 className="text-lg font-medium text-white mb-1">
          {mode === "login" ? "Sign in" : "Create an account"}
        </h3>
        <p className="text-xs text-white/45 mb-5">
          This only exists so your Spotify/Calendar connections are yours — nothing else in the app needs it.
        </p>
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
      </div>
    </div>
  );
}

export function useAppAuth() {
  const ctx = useContext(AppAuthContext);
  if (!ctx) throw new Error("useAppAuth must be used within AppAuthProvider");
  return ctx;
}
