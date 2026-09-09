// settings-page.tsx
// Replaces customization-page.tsx. Not a rename — a reframe: this used to
// be a gallery of gradient tiles to browse for fun ("Customization"); a
// settings page is a calm list of controls you come to with a specific
// task in mind. Rows, not tiles. Sentence-case, not Title Case headers —
// matching the voice the landing page and Focus Canvas already established.
//
// Sections: Account (the one genuinely new thing here — Spotify/Calendar
// connection used to be buried inside a Focus widget, which isn't where
// anyone thinks to manage a login), Appearance, Focus defaults, and Your
// data. Account and Your data act immediately; Appearance and Focus
// defaults stay on the existing draft/Save Changes pattern since that's
// how the rest of the app expects to read them.

import { motion } from "motion/react";
import {
  Palette, Bell, Check, LogOut, Music2, CalendarDays, Link2,
  Download, RotateCcw, Trash2, User as UserIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useCustomization } from "./customization-context";
import type { ThemeId } from "./customization-context";
import { useLocalData } from "./local-data-context";
import { useFocusCanvas } from "./focus-canvas-context";
import { useAppAuth } from "./app-auth-context";

const themes: { id: ThemeId; name: string; swatch: string }[] = [
  { id: "midnight", name: "Midnight",  swatch: "from-blue-600 to-purple-600" },
  { id: "ocean",    name: "Ocean",     swatch: "from-sky-500 to-cyan-500" },
  { id: "forest",   name: "Forest",    swatch: "from-emerald-500 to-green-600" },
  { id: "sunset",   name: "Sunset",    swatch: "from-amber-500 to-red-500" },
  { id: "rose",     name: "Rose",      swatch: "from-pink-500 to-rose-500" },
  { id: "lavender", name: "Lavender",  swatch: "from-purple-500 to-fuchsia-500" },
];

const withCreds: RequestInit = { credentials: "include" };

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="py-7 border-b border-border last:border-b-0"
    >
      <h2 className="text-lg font-semibold mb-0.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{title}</h2>
      {hint && <p className="text-sm text-muted-foreground mb-5">{hint}</p>}
      <div className={hint ? "" : "mt-5"}>{children}</div>
    </motion.section>
  );
}

function Row({
  icon: Icon, title, subtitle, action,
}: { icon: React.ElementType; title: string; subtitle: string; action: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3.5">
      <div className="flex items-center gap-3.5 min-w-0">
        <div className="size-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">
          <Icon className="size-4 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{title}</p>
          <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
        </div>
      </div>
      <div className="shrink-0">{action}</div>
    </div>
  );
}

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`w-11 h-6 rounded-full transition-colors relative ${on ? "bg-primary" : "bg-secondary"}`}>
      <span className={`absolute top-1 size-4 rounded-full bg-white transition-all ${on ? "left-6" : "left-1"}`} />
    </button>
  );
}

// ── Connected accounts — Spotify/Calendar status used to be discoverable
// only by clicking into a Focus widget. Settings is where you actually
// think to manage a login. ────────────────────────────────────────────────
function IntegrationRow({
  icon, label, connectedFn, connectPath, requireSignIn,
}: {
  icon: React.ElementType; label: string;
  connectedFn: () => Promise<"connected" | "disconnected" | "unconfigured">;
  connectPath: string;
  requireSignIn: (onSuccess: () => void) => void;
}) {
  const [state, setState] = useState<"loading" | "connected" | "disconnected" | "unconfigured">("loading");

  const refresh = async () => setState(await connectedFn());
  useEffect(() => { refresh(); }, []);

  const connect = () => requireSignIn(() => {
    const w = window.open(connectPath, "connect", "width=480,height=680");
    const poll = setInterval(() => { if (w?.closed) { clearInterval(poll); refresh(); } }, 600);
  });

  const disconnect = async () => {
    await fetch(connectPath.replace("/connect", "/disconnect"), { method: "POST", ...withCreds });
    refresh();
  };

  if (state === "unconfigured") {
    return <Row icon={icon} title={label} subtitle="not set up on this server" action={<span className="text-xs text-muted-foreground">·</span>} />;
  }
  if (state === "connected") {
    return (
      <Row icon={icon} title={label} subtitle="connected"
        action={
          <button onClick={disconnect} className="text-xs px-3 py-1.5 rounded-lg bg-secondary hover:bg-destructive/15 hover:text-destructive transition-colors">
            disconnect
          </button>
        }
      />
    );
  }
  return (
    <Row icon={icon} title={label} subtitle="not connected"
      action={
        <button onClick={connect} className="text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity">
          connect
        </button>
      }
    />
  );
}

export function SettingsPage() {
  const {
    settings, setTheme, setBreakReminders, setFocusDuration, setBreakDuration,
    saveChanges, resetToDefault, hasUnsavedChanges,
  } = useCustomization();
  const { tasks, stats, resetProgress } = useLocalData();
  const { widgets, background, resetCanvas } = useFocusCanvas();
  const { user, loading, logout, requireSignIn } = useAppAuth();

  const handleResetProgress = () => {
    if (window.confirm("Reset all progress? This clears your level, XP, streak, unlocked badges, and every task. It's like starting a brand new account. This can't be undone.")) {
      resetProgress();
    }
  };

  const handleResetCanvas = () => {
    if (window.confirm("Clear your Focus canvas? This removes every widget you've placed and brings back the \"build your focus space\" setup screen. Your tasks and progress aren't affected.")) {
      resetCanvas();
    }
  };

  const handleExport = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      tasks, stats, customization: settings,
      focusCanvas: { widgets, background },
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "prodigy-data.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <div className="max-w-2xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="pb-2">
          <h1 className="text-3xl font-bold tracking-tight mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>settings</h1>
          <p className="text-muted-foreground text-sm">everything that isn't your focus space. it lives on its own page.</p>
        </motion.div>

        {/* ── Account ────────────────────────────────────────────────── */}
        <Section
          title="Account & connections"
          hint={
            user
              ? `signed in as ${user.email}. this only exists so your Spotify and Calendar connections are yours.`
              : "sign in only when you want Spotify or Google Calendar in your focus space. nothing else in the app needs it."
          }
        >
          {!loading && (
            <div className="rounded-xl border border-border divide-y divide-border overflow-hidden py-1">
              {user ? (
                <Row
                  icon={UserIcon}
                  title={user.email}
                  subtitle="signed in"
                  action={
                    <button onClick={logout} className="text-xs px-3 py-1.5 rounded-lg bg-secondary hover:bg-destructive/15 hover:text-destructive transition-colors flex items-center gap-1.5">
                      <LogOut className="size-3" /> sign out
                    </button>
                  }
                />
              ) : (
                <Row
                  icon={UserIcon}
                  title="not signed in"
                  subtitle="connect an integration below to create an account"
                  action={<span className="text-xs text-muted-foreground">·</span>}
                />
              )}
              <IntegrationRow
                icon={Music2} label="Spotify" connectPath="/api/integrations/spotify/connect"
                requireSignIn={requireSignIn}
                connectedFn={async () => {
                  try {
                    const health = await fetch("/api/health").then(r => r.json());
                    if (!health.spotifyConfigured) return "unconfigured";
                    const res = await fetch("/api/integrations/spotify/now-playing", withCreds);
                    return res.status === 401 ? "disconnected" : "connected";
                  } catch { return "unconfigured"; }
                }}
              />
              <IntegrationRow
                icon={CalendarDays} label="Google Calendar" connectPath="/api/integrations/google/connect"
                requireSignIn={requireSignIn}
                connectedFn={async () => {
                  try {
                    const health = await fetch("/api/health").then(r => r.json());
                    if (!health.calendarConfigured) return "unconfigured";
                    const res = await fetch("/api/integrations/google/calendar", withCreds);
                    return res.status === 401 ? "disconnected" : "connected";
                  } catch { return "unconfigured"; }
                }}
              />
            </div>
          )}
        </Section>

        {/* ── Appearance ─────────────────────────────────────────────── */}
        <Section title="Appearance" hint="the accent color used across the app.">
          <div className="flex items-center gap-3 flex-wrap">
            {themes.map(theme => {
              const isSelected = settings.themeId === theme.id;
              return (
                <button key={theme.id} onClick={() => setTheme(theme.id)} className="flex flex-col items-center gap-1.5">
                  <div className={`size-9 rounded-full bg-gradient-to-br ${theme.swatch} flex items-center justify-center transition-transform ${isSelected ? "ring-2 ring-offset-2 ring-offset-background ring-foreground scale-110" : "hover:scale-105"}`}>
                    {isSelected && <Check className="size-3.5 text-white" />}
                  </div>
                  <span className="text-[10px] text-muted-foreground">{theme.name}</span>
                </button>
              );
            })}
          </div>
        </Section>

        {/* ── Focus defaults ─────────────────────────────────────────── */}
        <Section title="Focus defaults" hint="what a new focus session starts with.">
          <div className="rounded-xl border border-border divide-y divide-border overflow-hidden py-1">
            <Row
              icon={Bell} title="Break reminders" subtitle="a nudge 5 minutes before your break"
              action={<Toggle on={settings.breakReminders} onClick={() => setBreakReminders(!settings.breakReminders)} />}
            />
            <div className="flex items-center justify-between gap-4 px-4 py-3.5">
              <p className="text-sm font-medium">Focus duration</p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={5}
                  max={180}
                  value={settings.focusDuration}
                  onChange={e => setFocusDuration(e.target.value)}
                  onBlur={e => {
                    const n = Math.min(180, Math.max(5, Math.round(Number(e.target.value)) || 25));
                    setFocusDuration(String(n));
                  }}
                  className="w-16 px-3 py-1.5 rounded-lg bg-secondary border border-border text-sm outline-none focus:border-primary text-right"
                />
                <span className="text-sm text-muted-foreground">minutes</span>
              </div>
            </div>
            <div className="flex items-center justify-between gap-4 px-4 py-3.5">
              <p className="text-sm font-medium">Break duration</p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={settings.breakDuration}
                  onChange={e => setBreakDuration(e.target.value)}
                  onBlur={e => {
                    const n = Math.min(60, Math.max(1, Math.round(Number(e.target.value)) || 5));
                    setBreakDuration(String(n));
                  }}
                  className="w-16 px-3 py-1.5 rounded-lg bg-secondary border border-border text-sm outline-none focus:border-primary text-right"
                />
                <span className="text-sm text-muted-foreground">minutes</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-5">
            {hasUnsavedChanges && <span className="text-xs text-muted-foreground mr-auto">unsaved changes</span>}
            <button onClick={resetToDefault} className="text-sm px-4 py-2 rounded-lg bg-secondary hover:bg-secondary/70 transition-colors">
              reset to default
            </button>
            <button
              onClick={saveChanges}
              disabled={!hasUnsavedChanges}
              className="text-sm px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
              save changes
            </button>
          </div>
        </Section>

        {/* ── Your data ──────────────────────────────────────────────── */}
        <Section title="Your data" hint="everything lives on this device. nothing here is synced to a server unless you connect Spotify or Calendar above.">
          <div className="rounded-xl border border-border divide-y divide-border overflow-hidden py-1">
            <Row
              icon={Download} title="Export your data" subtitle="download tasks, progress, and canvas as JSON"
              action={<button onClick={handleExport} className="text-xs px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/70 transition-colors">export</button>}
            />
            <Row
              icon={RotateCcw} title="Reset focus canvas" subtitle="clear widgets, start from the setup screen again"
              action={<button onClick={handleResetCanvas} className="text-xs px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/70 transition-colors">reset</button>}
            />
            <Row
              icon={Trash2} title="Reset all progress" subtitle="level, XP, streak, badges, tasks. all of it"
              action={<button onClick={handleResetProgress} className="text-xs px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors">reset</button>}
            />
          </div>
        </Section>
      </div>
    </div>
  );
}
