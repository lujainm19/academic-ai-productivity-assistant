// focus-widgets.tsx
// Each widget renders with its own "material" (photo looks like a photo,
// a note looks like paper, the timer isn't even a widget — it's typography
// floating on the canvas) instead of one uniform card component repeated
// eight times. That's the main thing that keeps this from reading as a
// dashboard. Color reads from focus-palette.ts's CSS custom properties
// (--fx-fg, --fx-surface, etc.) rather than hardcoded white/black, so the
// same widget looks correct on the light "Cream" theme and every dark one.

import { motion, useMotionValue } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";
import { X, GripVertical, Music2, CalendarDays, Link2, Camera, Play, Pause, SkipForward, LogOut } from "lucide-react";
import { useLocalData } from "./local-data-context";
import { CanvasWidget, WidgetSize, WIDGET_DIMENSIONS, useFocusCanvas } from "./focus-canvas-context";
import { useAppAuth } from "./app-auth-context";

// Every call to our own /api/integrations/* or /api/auth/* needs
// credentials so the HttpOnly session cookie actually travels with it —
// fetch doesn't send cookies by default for anything but same-origin
// simple requests, and this app talks to a separate backend origin in
// production.
const withCreds: RequestInit = { credentials: "include" };

const NOTE_COLORS: Record<string, { bg: string; text: string }> = {
  amber: { bg: "#3a301c", text: "#f0dcae" },
  rose: { bg: "#3a2028", text: "#f0c8d4" },
  sage: { bg: "#25301f", text: "#cfe0c0" },
  sky: { bg: "#1e2c38", text: "#c3ddef" },
  lavender: { bg: "#2a2438", text: "#dcd0f0" },
  slate: { bg: "#232a30", text: "#cfdbe2" },
};
const NOTE_COLOR_KEYS = Object.keys(NOTE_COLORS);

// ── The draggable wrapper every widget renders inside ───────────────────
export function WidgetFrame({
  widget, editMode, dimmed, canvasRef, children,
}: {
  widget: CanvasWidget;
  editMode: boolean;
  dimmed: boolean;
  canvasRef: React.RefObject<HTMLDivElement>;
  children: React.ReactNode;
}) {
  const { updateWidget, removeWidget } = useFocusCanvas();
  const dims = WIDGET_DIMENSIONS[widget.type][widget.size];
  const dragX = useMotionValue(0);
  const dragY = useMotionValue(0);

  const handleDragEnd = (_e: any, info: { offset: { x: number; y: number } }) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const dxPct = (info.offset.x / rect.width) * 100;
    const dyPct = (info.offset.y / rect.height) * 100;
    const wPct = (dims.w / rect.width) * 100;
    const hPct = (dims.h / rect.height) * 100;

    let nx = Math.min(100 - wPct, Math.max(0, widget.x + dxPct));
    let ny = Math.min(100 - hPct, Math.max(0, widget.y + dyPct));

    // Light magnetic snap — to horizontal center and to the canvas margins,
    // Apple-Home-Screen-style alignment help without a visible grid.
    const guides = [4, 50 - wPct / 2, 96 - wPct];
    for (const g of guides) if (Math.abs(nx - g) < 2.2) nx = g;
    const guidesY = [8, 92 - hPct];
    for (const g of guidesY) if (Math.abs(ny - g) < 2.2) ny = g;

    updateWidget(widget.id, { x: nx, y: ny });
    dragX.set(0);
    dragY.set(0);
  };

  return (
    <motion.div
      layout={!editMode}
      style={{
        position: "absolute",
        left: `${widget.x}%`,
        top: `${widget.y}%`,
        width: dims.w,
        height: dims.h,
        x: dragX,
        y: dragY,
        rotate: widget.rotation,
      }}
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: dimmed ? 0.32 : 1, scale: 1 }}
      whileHover={dimmed ? { opacity: 0.85 } : undefined}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ type: "spring", stiffness: 340, damping: 30 }}
      drag={editMode}
      dragMomentum={false}
      dragElastic={0.04}
      onDragEnd={handleDragEnd}
      whileDrag={{ scale: 1.05, rotate: 0, zIndex: 50, boxShadow: "0 24px 48px rgba(0,0,0,0.4)" }}
      className="group"
    >
      <div className="relative w-full h-full">
        {children}
        {editMode && (
          <>
            <div
              className="absolute -top-3 -left-3 size-7 rounded-full flex items-center justify-center cursor-grab active:cursor-grabbing shadow-lg"
              style={{ background: "var(--fx-invert-bg)", opacity: 0.92 }}
            >
              <GripVertical className="size-3.5" style={{ color: "var(--fx-invert-fg)", opacity: 0.55 }} />
            </div>
            <button
              onClick={() => removeWidget(widget.id)}
              className="absolute -top-3 -right-3 size-7 rounded-full flex items-center justify-center shadow-lg hover:bg-red-500 transition-colors"
              style={{ background: "var(--fx-invert-bg)", opacity: 0.92 }}
              aria-label="Remove widget"
            >
              <X className="size-3.5" style={{ color: "var(--fx-invert-fg)", opacity: 0.75 }} />
            </button>
            <div
              className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-0.5 rounded-full px-1 py-1 shadow-lg"
              style={{ background: "var(--fx-invert-bg)", opacity: 0.92 }}
            >
              {(["s", "m", "l"] as WidgetSize[]).map(s => (
                <button
                  key={s}
                  onClick={() => updateWidget(widget.id, { size: s })}
                  className="size-5 rounded-full text-[9px] font-medium uppercase transition-colors"
                  style={widget.size === s
                    ? { background: "var(--fx-invert-fg)", color: "var(--fx-invert-bg)" }
                    : { color: "var(--fx-invert-fg)", opacity: 0.5 }}
                >
                  {s}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}

// ── Timer widget is deliberately NOT part of this file — it lives inline
// in focus-session-page.tsx as plain typography, not a draggable object,
// since it's the fixed anchor everything else arranges around.

export function ClockWidget() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000 * 15);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="w-full h-full flex flex-col justify-center">
      <p className="text-[2.6rem] leading-none" style={{ fontFamily: "'Fraunces', serif", color: "var(--fx-fg)" }}>
        {now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
      </p>
      <p className="text-xs mt-1.5" style={{ color: "var(--fx-fg-muted)" }}>{now.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" })}</p>
    </div>
  );
}

export function TasksWidget() {
  const { tasks, completeTask } = useLocalData();
  const active = tasks.filter(t => !t.completed).slice(0, 4);
  return (
    <div className="w-full h-full flex flex-col">
      <p className="text-[10px] uppercase tracking-wide mb-2" style={{ color: "var(--fx-fg-muted)" }}>Today</p>
      {active.length === 0 ? (
        <p className="text-sm flex-1 flex items-center" style={{ color: "var(--fx-fg-muted)" }}>All caught up.</p>
      ) : (
        <div className="space-y-1.5 overflow-hidden">
          {active.map(t => (
            <button
              key={t.id}
              onClick={() => completeTask(t.id)}
              className="w-full flex items-center gap-2 text-left group/task"
            >
              <span className="size-[13px] rounded-full border shrink-0 transition-colors" style={{ borderColor: "var(--fx-border)" }} />
              <span className="text-[13px] truncate" style={{ color: "var(--fx-fg)" }}>{t.title}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Real badge thresholds from local-data-context.tsx's BADGE_DEFS — the
// ring shows progress toward the *next actual milestone*, not an
// arbitrary scale, so "almost there" always means something real.
const STREAK_MILESTONES = [3, 7, 14, 30];

function nextStreakMilestone(streak: number) {
  const next = STREAK_MILESTONES.find(m => m > streak);
  if (next !== undefined) {
    const prev = STREAK_MILESTONES[STREAK_MILESTONES.indexOf(next) - 1] ?? 0;
    return { prev, next, pct: (streak - prev) / (next - prev) };
  }
  // Past the last defined badge (30) — keep going in 30-day laps so the
  // ring always has somewhere to fill toward, indefinitely.
  const prev = Math.floor(streak / 30) * 30;
  return { prev, next: prev + 30, pct: (streak - prev) / 30 };
}

// A ring, not a plant — the earlier version drew leaves out of CSS blobs,
// which reads as clip art at this size no matter how carefully it's
// tuned (the same trap the very first mascot attempt fell into). This is
// built from the same material as the rest of the app's "premium" bits
// (Lumi's glow, the streak indicator concept) — gradient, blur, motion —
// rather than an illustration.
export function GrowthWidget({ widget }: { widget: CanvasWidget }) {
  const { stats } = useLocalData();
  const gradId = useId();
  const { next, pct } = nextStreakMilestone(stats.streak);

  // Explicit per-size values (box/stroke/font), not a fixed px ring —
  // this is the exact bug the leaf positions had before: something tuned
  // for one widget size that then looks tiny in "L" or cramped in "S".
  const RING = {
    s: { box: 70, r: 28, stroke: 7, font: 17 },
    m: { box: 86, r: 36, stroke: 8, font: 21 },
    l: { box: 104, r: 43, stroke: 9, font: 25 },
  }[widget.size];

  const circumference = 2 * Math.PI * RING.r;
  const glowStrength = Math.min(0.6, 0.14 + stats.streak / 50);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-2">
      <div className="relative shrink-0" style={{ width: RING.box, height: RING.box }}>
        <svg width={RING.box} height={RING.box} viewBox="0 0 100 100" style={{ transform: "rotate(-90deg)" }}>
          <defs>
            <linearGradient id={gradId} x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f6a94a" />
              <stop offset="100%" stopColor="#ef6a5a" />
            </linearGradient>
          </defs>
          <circle cx="50" cy="50" r={RING.r} fill="none" stroke="var(--fx-border)" strokeWidth={RING.stroke} />
          <circle
            cx="50" cy="50" r={RING.r} fill="none" stroke={`url(#${gradId})`} strokeWidth={RING.stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - Math.max(0.02, pct))}
            style={{
              filter: `drop-shadow(0 0 7px rgba(239,106,74,${glowStrength}))`,
              transition: "stroke-dashoffset 0.6s ease",
            }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className="font-bold leading-none tabular-nums"
            style={{ color: "var(--fx-fg)", fontFamily: "'Space Grotesk', sans-serif", fontSize: RING.font }}
          >
            {stats.streak}
          </span>
        </div>
      </div>
      <p className="text-[10.5px] text-center leading-tight" style={{ color: "var(--fx-fg-muted)" }}>
        {stats.streak === 0 ? "start a streak" : `${next - stats.streak} to ${next}-day streak`}
      </p>
    </div>
  );
}

export function NoteWidget({ widget }: { widget: CanvasWidget }) {
  const { updateWidget } = useFocusCanvas();
  const colorKey = (widget.config.color as string) ?? "amber";
  const color = NOTE_COLORS[colorKey] ?? NOTE_COLORS.amber;
  return (
    <div className="relative w-full h-full rounded-2xl p-4 shadow-lg overflow-hidden group/note" style={{ background: color.bg }}>
      <textarea
        value={widget.config.text ?? ""}
        onChange={e => updateWidget(widget.id, { config: { ...widget.config, text: e.target.value } })}
        placeholder="Write anything…"
        className="w-full h-full bg-transparent resize-none outline-none text-[13.5px] leading-relaxed placeholder:opacity-40"
        style={{ color: color.text, fontFamily: "'Fraunces', serif" }}
      />
      {/* Color swatches — hover-revealed so they never compete with the
          handwriting itself, but need no edit-mode toggle to reach: this
          is "using the note" (like picking a pen color), not rearranging
          the canvas, so it stays available all the time, unlike resize. */}
      <div className="absolute top-2.5 right-2.5 flex items-center gap-1 opacity-0 group-hover/note:opacity-100 transition-opacity">
        {NOTE_COLOR_KEYS.map(key => (
          <button
            key={key}
            onClick={() => updateWidget(widget.id, { config: { ...widget.config, color: key } })}
            aria-label={`${key} note color`}
            className="size-4 rounded-full shrink-0 transition-transform hover:scale-110"
            style={{
              background: NOTE_COLORS[key].bg,
              boxShadow: key === colorKey ? `0 0 0 1.5px ${NOTE_COLORS[key].text}` : `0 0 0 1px rgba(255,255,255,0.25)`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

export function PhotoWidget({ widget }: { widget: CanvasWidget }) {
  const { updateWidget } = useFocusCanvas();
  const inputRef = useRef<HTMLInputElement>(null);
  const dataUrl = widget.config.dataUrl as string | undefined;

  const onPick = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => updateWidget(widget.id, { config: { ...widget.config, dataUrl: reader.result } });
    reader.readAsDataURL(file);
  };

  return (
    <div className="w-full h-full">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) onPick(f); }}
      />
      {dataUrl ? (
        <button onClick={() => inputRef.current?.click()} className="block w-full h-full rounded-xl overflow-hidden shadow-2xl border-4" style={{ borderColor: "var(--fx-invert-bg)" }}>
          <img src={dataUrl} alt="" className="w-full h-full object-cover" />
        </button>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          className="w-full h-full rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-colors"
          style={{ borderColor: "var(--fx-border)", color: "var(--fx-fg-muted)", background: "var(--fx-surface)" }}
        >
          <Camera className="size-5" />
          <span className="text-xs">Add a photo</span>
        </button>
      )}
    </div>
  );
}

// ── Shared shell for the three "connect" widgets — same material so they
// read as one family, distinct from notes/photos/tasks. ───────────────────
function ConnectShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full h-full rounded-xl p-3.5 flex flex-col justify-center gap-1.5" style={{ background: "var(--fx-connect-surface)", border: "1px solid var(--fx-border)" }}>
      {children}
    </div>
  );
}

export function CanvasDeadlineWidget() {
  const [state, setState] = useState<"loading" | "connected" | "unconfigured">("loading");
  const [assignment, setAssignment] = useState<{ title: string; courseName: string; due: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const health = await fetch("/api/health").then(r => r.json());
        if (!health.canvasConfigured) { if (!cancelled) setState("unconfigured"); return; }
        const assignments = await fetch("/api/canvas/assignments").then(r => r.json());
        const next = Array.isArray(assignments)
          ? assignments.filter((a: any) => a.due && new Date(a.due) > new Date()).sort((a: any, b: any) => +new Date(a.due) - +new Date(b.due))[0]
          : null;
        if (!cancelled) {
          if (next) { setAssignment({ title: next.title, courseName: next.courseName, due: next.due }); setState("connected"); }
          else setState("unconfigured");
        }
      } catch {
        if (!cancelled) setState("unconfigured");
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (state !== "connected") {
    return (
      <ConnectShell>
        <Link2 className="size-3.5" style={{ color: "var(--fx-fg-muted)" }} />
        <p className="text-[13px] font-medium" style={{ color: "var(--fx-fg)" }}>Connect Canvas</p>
        <p className="text-[11px] leading-snug" style={{ color: "var(--fx-fg-muted)" }}>Keep your upcoming assignments within reach.</p>
      </ConnectShell>
    );
  }

  const daysLeft = Math.max(0, Math.ceil((+new Date(assignment!.due) - Date.now()) / 86400000));
  return (
    <ConnectShell>
      <p className="text-[10px] uppercase tracking-wide" style={{ color: "var(--fx-fg-muted)" }}>{assignment!.courseName}</p>
      <p className="text-[13.5px] font-medium truncate" style={{ color: "var(--fx-fg)" }}>{assignment!.title}</p>
      <p className="text-[11px] text-amber-500">due in {daysLeft} day{daysLeft === 1 ? "" : "s"}</p>
    </ConnectShell>
  );
}

// Spotify — real user-scoped OAuth (see server/routes/spotify.js). The app
// itself must know who's asking before "Connect" means anything, so an
// app account (see app-auth-context.tsx) is required first — that's what
// requireSignIn gates. "Connect" then opens Spotify's own consent screen
// in a popup, scoped to *this* app-user by the backend's one-time `state`
// value, never a client-supplied id.
export function SpotifyWidget() {
  const { user, requireSignIn } = useAppAuth();
  const [state, setState] = useState<"loading" | "unconfigured" | "disconnected" | "connected">("loading");
  const [track, setTrack] = useState<{ title: string; artist: string; albumArt?: string; isPlaying: boolean } | null>(null);

  const refresh = async () => {
    try {
      const health = await fetch("/api/health").then(r => r.json());
      if (!health.spotifyConfigured) { setState("unconfigured"); return; }
      if (!user) { setState("disconnected"); return; }
      const res = await fetch("/api/integrations/spotify/now-playing", withCreds);
      if (res.status === 401) { setState("disconnected"); return; }
      const data = await res.json();
      setState("connected");
      setTrack(data.track ?? null);
    } catch {
      setState("unconfigured");
    }
  };

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 15000); // polled, not per-render — see server/lib/spotifyClient.js rate-limit handling
    return () => clearInterval(t);
  }, [user]);

  const connect = () => requireSignIn(() => {
    const w = window.open("/api/integrations/spotify/connect", "spotify-connect", "width=480,height=680");
    const poll = setInterval(() => {
      if (w?.closed) { clearInterval(poll); refresh(); }
    }, 600);
  });

  const disconnect = async () => {
    await fetch("/api/integrations/spotify/disconnect", { method: "POST", ...withCreds });
    refresh();
  };

  const control = async (action: "play" | "pause" | "next") => {
    await fetch(`/api/integrations/spotify/${action}`, { method: "POST", ...withCreds });
    setTimeout(refresh, 400);
  };

  if (state === "unconfigured") {
    return (
      <ConnectShell>
        <Music2 className="size-3.5" style={{ color: "var(--fx-fg-muted)" }} />
        <p className="text-[13px] font-medium" style={{ color: "var(--fx-fg)" }}>Spotify not set up</p>
        <p className="text-[11px] leading-snug" style={{ color: "var(--fx-fg-muted)" }}>Add Spotify credentials to server/.env first.</p>
      </ConnectShell>
    );
  }

  if (state === "disconnected") {
    return (
      <button onClick={connect} className="block w-full h-full text-left">
        <ConnectShell>
          <Music2 className="size-3.5" style={{ color: "var(--fx-fg-muted)" }} />
          <p className="text-[13px] font-medium" style={{ color: "var(--fx-fg)" }}>Connect Spotify</p>
          <p className="text-[11px] leading-snug" style={{ color: "var(--fx-fg-muted)" }}>Bring your music into your focus space.</p>
        </ConnectShell>
      </button>
    );
  }

  if (!track) {
    return (
      <ConnectShell>
        <Music2 className="size-3.5" style={{ color: "var(--fx-fg-muted)" }} />
        <p className="text-[12.5px]" style={{ color: "var(--fx-fg-muted)" }}>Nothing playing right now.</p>
      </ConnectShell>
    );
  }

  return (
    <div className="w-full h-full rounded-xl p-3 flex items-center gap-3 group/w" style={{ background: "var(--fx-connect-surface)", border: "1px solid var(--fx-border)" }}>
      {track.albumArt
        ? <img src={track.albumArt} alt="" className="size-11 rounded-lg object-cover shrink-0" />
        : <div className="size-11 rounded-lg shrink-0 flex items-center justify-center" style={{ background: "var(--fx-surface)" }}><Music2 className="size-4" style={{ color: "var(--fx-fg-faint)" }} /></div>}
      <div className="min-w-0 flex-1">
        <p className="text-[12.5px] font-medium truncate" style={{ color: "var(--fx-fg)" }}>{track.title}</p>
        <p className="text-[11px] truncate" style={{ color: "var(--fx-fg-muted)" }}>{track.artist}</p>
        <div className="flex items-center gap-2 mt-1">
          <button onClick={() => control(track.isPlaying ? "pause" : "play")} aria-label={track.isPlaying ? "Pause" : "Play"}>
            {track.isPlaying ? <Pause className="size-3.5" style={{ color: "var(--fx-fg)" }} /> : <Play className="size-3.5" style={{ color: "var(--fx-fg)" }} />}
          </button>
          <button onClick={() => control("next")} aria-label="Skip">
            <SkipForward className="size-3.5" style={{ color: "var(--fx-fg-muted)" }} />
          </button>
        </div>
      </div>
      <button onClick={disconnect} aria-label="Disconnect Spotify" className="opacity-0 group-hover/w:opacity-60 hover:!opacity-100 transition-opacity shrink-0">
        <LogOut className="size-3.5" style={{ color: "var(--fx-fg-muted)" }} />
      </button>
    </div>
  );
}

// Google Calendar — same user-scoped OAuth pattern as Spotify above.
export function CalendarConnectWidget() {
  const { user, requireSignIn } = useAppAuth();
  const [state, setState] = useState<"loading" | "unconfigured" | "disconnected" | "connected">("loading");
  const [event, setEvent] = useState<{ title: string; startTime: string } | null>(null);

  const refresh = async () => {
    try {
      const health = await fetch("/api/health").then(r => r.json());
      if (!health.calendarConfigured) { setState("unconfigured"); return; }
      if (!user) { setState("disconnected"); return; }
      const res = await fetch("/api/integrations/google/calendar", withCreds);
      if (res.status === 401) { setState("disconnected"); return; }
      const data = await res.json();
      setState("connected");
      setEvent(data.events?.[0] ?? null);
    } catch {
      setState("unconfigured");
    }
  };

  useEffect(() => { refresh(); }, [user]);

  const connect = () => requireSignIn(() => {
    const w = window.open("/api/integrations/google/connect", "google-connect", "width=480,height=680");
    const poll = setInterval(() => {
      if (w?.closed) { clearInterval(poll); refresh(); }
    }, 600);
  });

  const disconnect = async () => {
    await fetch("/api/integrations/google/disconnect", { method: "POST", ...withCreds });
    refresh();
  };

  if (state === "unconfigured") {
    return (
      <ConnectShell>
        <CalendarDays className="size-3.5" style={{ color: "var(--fx-fg-muted)" }} />
        <p className="text-[13px] font-medium" style={{ color: "var(--fx-fg)" }}>Calendar not set up</p>
        <p className="text-[11px] leading-snug" style={{ color: "var(--fx-fg-muted)" }}>Add Google credentials to server/.env first.</p>
      </ConnectShell>
    );
  }

  if (state === "disconnected") {
    return (
      <button onClick={connect} className="block w-full h-full text-left">
        <ConnectShell>
          <CalendarDays className="size-3.5" style={{ color: "var(--fx-fg-muted)" }} />
          <p className="text-[13px] font-medium" style={{ color: "var(--fx-fg)" }}>Connect Google Calendar</p>
          <p className="text-[11px] leading-snug" style={{ color: "var(--fx-fg-muted)" }}>See what's coming up without leaving your focus space.</p>
        </ConnectShell>
      </button>
    );
  }

  if (!event) {
    return (
      <div className="w-full h-full rounded-xl p-3.5 flex items-center justify-between gap-2 group/w" style={{ background: "var(--fx-connect-surface)", border: "1px solid var(--fx-border)" }}>
        <div className="flex flex-col gap-1.5">
          <CalendarDays className="size-3.5" style={{ color: "var(--fx-fg-muted)" }} />
          <p className="text-[12.5px]" style={{ color: "var(--fx-fg-muted)" }}>Nothing else on today.</p>
        </div>
        <button onClick={disconnect} aria-label="Disconnect Google Calendar" className="opacity-0 group-hover/w:opacity-60 hover:!opacity-100 transition-opacity shrink-0">
          <LogOut className="size-3.5" style={{ color: "var(--fx-fg-muted)" }} />
        </button>
      </div>
    );
  }

  return (
    <div className="w-full h-full rounded-xl p-3.5 flex items-start justify-between gap-2 group/w" style={{ background: "var(--fx-connect-surface)", border: "1px solid var(--fx-border)" }}>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wide" style={{ color: "var(--fx-fg-muted)" }}>Next up</p>
        <p className="text-[13.5px] font-medium truncate" style={{ color: "var(--fx-fg)" }}>{event.title}</p>
        <p className="text-[11px]" style={{ color: "var(--fx-fg-muted)" }}>{new Date(event.startTime).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</p>
      </div>
      <button onClick={disconnect} aria-label="Disconnect Google Calendar" className="opacity-0 group-hover/w:opacity-60 hover:!opacity-100 transition-opacity shrink-0">
        <LogOut className="size-3.5" style={{ color: "var(--fx-fg-muted)" }} />
      </button>
    </div>
  );
}

export function renderWidgetBody(widget: CanvasWidget) {
  switch (widget.type) {
    case "clock": return <ClockWidget />;
    case "tasks": return <TasksWidget />;
    case "growth": return <GrowthWidget widget={widget} />;
    case "note": return <NoteWidget widget={widget} />;
    case "photo": return <PhotoWidget widget={widget} />;
    case "canvas": return <CanvasDeadlineWidget />;
    case "spotify": return <SpotifyWidget />;
    case "calendar": return <CalendarConnectWidget />;
    default: return null;
  }
}
