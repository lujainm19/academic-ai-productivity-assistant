// landing-page.tsx
// The one page in this app that deliberately does NOT use the app's dark
// indigo shell — this is prodigy's own public face, so it wears prodigy's
// own colors (the mark's cream/ink, not the in-app theme tokens). Once
// someone clicks through to the actual product, it's dark and quiet; out
// here it's allowed to be warm and a little playful. That contrast is
// intentional, the same way a lot of products keep a light marketing site
// in front of a dark app.
//
// Layout rhythm (scattered hero objects, dotted-divider feature sections,
// an "app window" showing the real product) is inspired by heyclicky.com,
// per an explicit request — but every object in it is prodigy's own:
// miniatures of the real widgets instead of found nostalgia objects, and
// the "app window" mockups show this app's actual dark Focus Canvas, not
// a generic screenshot.

import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import {
  ArrowRight, Sparkles, LayoutGrid, Link2, Music2, CalendarDays,
  Play, Pause, RotateCcw, Palette,
} from "lucide-react";
import { useNavigate } from "react-router";
import { useRef } from "react";
import { ProdigyMark } from "./prodigy-mark";

const INK = "#1a1a1a";
const CREAM = "#f8f1e2";

// ── Dotted paper texture, used behind the hero and the manifesto. ───────
const dotted = {
  backgroundImage: `radial-gradient(circle, rgba(26,26,26,0.10) 1px, transparent 1px)`,
  backgroundSize: "22px 22px",
};

// ── A tiny, honest replica of the real dark canvas — same tokens as
// focus-palette.ts's dark values, same card shapes — not a generic
// "app screenshot" stand-in. ──────────────────────────────────────────
function AppWindow({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl overflow-hidden border border-black/10 shadow-[0_30px_60px_-15px_rgba(26,26,26,0.35)] ${className}`}>
      <div className="h-9 flex items-center gap-1.5 px-4" style={{ background: "#ece2cc" }}>
        <span className="size-2.5 rounded-full bg-black/15" />
        <span className="size-2.5 rounded-full bg-black/15" />
        <span className="size-2.5 rounded-full bg-black/15" />
      </div>
      <div className="relative" style={{ background: "radial-gradient(120% 90% at 50% -10%, #232244 0%, #17172c 45%, #0c0c16 100%)" }}>
        {children}
      </div>
    </div>
  );
}

function MiniRing({ pct = 0.7, size = 34 }: { pct?: number; size?: number }) {
  const r = size * 0.42;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
      <defs>
        <linearGradient id="miniRingGrad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#f6a94a" />
          <stop offset="100%" stopColor="#ef6a5a" />
        </linearGradient>
      </defs>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={size * 0.11} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke="url(#miniRingGrad)" strokeWidth={size * 0.11}
        strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct)}
      />
    </svg>
  );
}

// ── Hero "stickers" — miniatures of the real widget system, scattered
// and hand-rotated, each drifting slightly against the cursor for a bit
// of depth. This is the direct swap for heyclicky's found objects: same
// scattered-desk structural idea, filled with prodigy's own content. ────
function Sticker({
  children, style, parallax, depth = 1,
}: {
  children: React.ReactNode;
  style: React.CSSProperties;
  parallax: { x: any; y: any };
  depth?: number;
}) {
  const x = useTransform(parallax.x, v => v * depth);
  const y = useTransform(parallax.y, v => v * depth);
  return (
    <motion.div
      className="absolute hidden md:block"
      style={{ ...style, x, y }}
      initial={{ opacity: 0, y: (style.y as number ?? 0) + 16, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, delay: 0.15 }}
    >
      {children}
    </motion.div>
  );
}

function useParallax(strength = 18) {
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 60, damping: 14 });
  const sy = useSpring(my, { stiffness: 60, damping: 14 });
  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mx.set(((e.clientX - rect.left) / rect.width - 0.5) * strength);
    my.set(((e.clientY - rect.top) / rect.height - 0.5) * strength);
  };
  return { x: sx, y: sy, onMouseMove };
}

function FeatureSection({
  eyebrow, title, body, window: windowContent, reverse = false,
}: {
  eyebrow: string; title: string; body: string; window: React.ReactNode; reverse?: boolean;
}) {
  return (
    <section className="max-w-5xl mx-auto px-6 py-20 md:py-28">
      <div className="border-t border-dashed border-black/15 pt-14">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className={`grid md:grid-cols-2 gap-10 items-center ${reverse ? "md:[&>*:first-child]:order-2" : ""}`}
        >
          <div>
            <span className="inline-block text-[11px] font-medium tracking-wide uppercase px-3 py-1 rounded-full border border-black/15" style={{ color: "rgba(26,26,26,0.55)" }}>
              {eyebrow}
            </span>
            <h3
              className="mt-4 text-3xl md:text-[2.3rem] font-bold tracking-tight leading-[1.1]"
              style={{ fontFamily: "'Space Grotesk', sans-serif", color: INK }}
            >
              {title}
            </h3>
            <p className="mt-4 text-[15px] leading-relaxed max-w-md" style={{ color: "rgba(26,26,26,0.62)" }}>
              {body}
            </p>
          </div>
          <AppWindow>{windowContent}</AppWindow>
        </motion.div>
      </div>
    </section>
  );
}

export function LandingPage() {
  const navigate = useNavigate();
  const parallax = useParallax(22);

  return (
    <div className="min-h-screen" style={{ background: CREAM, color: INK }}>
      {/* ── Nav ──────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 backdrop-blur-md" style={{ background: "rgba(248,241,226,0.75)", borderBottom: "1px solid rgba(26,26,26,0.08)" }}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ProdigyMark size={26} />
            <span className="font-bold text-lg tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>prodigy</span>
          </div>
          <button
            onClick={() => navigate("/dashboard")}
            className="px-5 py-2.5 rounded-full text-sm font-medium transition-transform hover:scale-105"
            style={{ background: INK, color: CREAM }}
          >
            start focusing
          </button>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden" onMouseMove={parallax.onMouseMove} style={dotted}>
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(60% 50% at 50% 0%, rgba(248,241,226,0) 0%, #f8f1e2 100%)" }} />

        <Sticker style={{ top: 96, left: "12%", rotate: -10 as any }} parallax={parallax} depth={1.4}>
          <div className="w-32 rounded-xl p-2.5 shadow-lg" style={{ background: "#25301f" }}>
            <p className="text-[10px] leading-snug" style={{ color: "#cfe0c0", fontFamily: "'Fraunces', serif" }}>bio final — chapter 9 tonight</p>
          </div>
        </Sticker>

        <Sticker style={{ top: 70, right: "13%", rotate: 8 as any }} parallax={parallax} depth={1.1}>
          <div className="flex items-center gap-2.5 rounded-full pl-2 pr-3.5 py-2 shadow-lg" style={{ background: INK }}>
            <MiniRing pct={0.62} size={30} />
            <span className="text-[11px] font-medium" style={{ color: CREAM }}>9-day streak</span>
          </div>
        </Sticker>

        <Sticker style={{ top: 230, left: "6%", rotate: 6 as any }} parallax={parallax} depth={1.7}>
          <div className="size-14 rounded-xl flex items-center justify-center shadow-lg" style={{ background: "#1a1a1a" }}>
            <Music2 className="size-5" style={{ color: CREAM }} />
          </div>
        </Sticker>

        <Sticker style={{ top: 260, right: "8%", rotate: -6 as any }} parallax={parallax} depth={0.9}>
          <div className="w-28 rounded-xl overflow-hidden shadow-lg border-4" style={{ borderColor: CREAM, background: "linear-gradient(160deg,#e7b980,#3c2440)" }}>
            <div className="aspect-square" />
          </div>
        </Sticker>

        <Sticker style={{ top: 380, left: "16%", rotate: -4 as any }} parallax={parallax} depth={1.3}>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full shadow-lg border" style={{ background: CREAM, borderColor: "rgba(26,26,26,0.12)" }}>
            <Link2 className="size-3" style={{ color: "rgba(26,26,26,0.5)" }} />
            <span className="text-[10.5px] font-medium">canvas synced</span>
          </div>
        </Sticker>

        <div className="relative max-w-3xl mx-auto px-6 pt-28 pb-20 text-center">
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium mb-7"
            style={{ background: "rgba(26,26,26,0.06)", color: "rgba(26,26,26,0.65)" }}
          >
            <Sparkles className="size-3.5" />
            a focus space, not a to-do dashboard
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="text-5xl md:text-6xl font-bold tracking-tight leading-[1.05]"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            your own corner
            <br />
            of the internet<span style={{ color: "#ef6a5a" }}>.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.12 }}
            className="mt-5 text-lg max-w-lg mx-auto leading-relaxed"
            style={{ color: "rgba(26,26,26,0.62)" }}
          >
            a timer that anchors it, widgets that make it yours, and the parts of studying you already use — Canvas, Spotify, your calendar — pulled into one quiet place.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-8 flex items-center justify-center gap-3"
          >
            <button
              onClick={() => navigate("/dashboard")}
              className="px-6 py-3.5 rounded-full font-medium flex items-center gap-2 transition-transform hover:scale-105 shadow-lg"
              style={{ background: INK, color: CREAM, boxShadow: "0 10px 30px -8px rgba(26,26,26,0.5)" }}
            >
              start focusing
              <ArrowRight className="size-4" />
            </button>
            <a
              href="#how-it-works"
              className="px-6 py-3.5 rounded-full font-medium border transition-colors hover:bg-black/[0.04]"
              style={{ borderColor: "rgba(26,26,26,0.18)" }}
            >
              see how it works
            </a>
          </motion.div>
        </div>

        {/* ── The real product, shown honestly ──────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="relative max-w-3xl mx-auto px-6 pb-24"
        >
          <AppWindow>
            <div className="flex items-center justify-between px-6 pt-5">
              <span className="size-8 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)" }}>
                <ArrowRight className="size-3.5 rotate-180" style={{ color: "rgba(255,255,255,0.6)" }} />
              </span>
              <span className="px-3 py-1.5 rounded-full text-[11px] font-medium flex items-center gap-1.5" style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.65)" }}>
                <LayoutGrid className="size-3" />
                customize
              </span>
            </div>
            <div className="relative px-6 pt-6 pb-10 flex flex-col items-center">
              <p className="text-[10px] uppercase tracking-[0.14em] mb-2" style={{ color: "rgba(255,255,255,0.35)" }}>session 3</p>
              <p className="text-6xl font-normal tabular-nums" style={{ fontFamily: "'Fraunces', serif", color: "rgba(255,255,255,0.95)" }}>24:12</p>
              <div className="flex items-center gap-3 mt-6">
                <span className="size-9 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <RotateCcw className="size-3.5" style={{ color: "rgba(255,255,255,0.5)" }} />
                </span>
                <span className="size-12 rounded-full flex items-center justify-center" style={{ background: CREAM }}>
                  <Play className="size-5 ml-0.5" style={{ color: INK }} />
                </span>
                <span className="size-9" />
              </div>

              <div className="absolute left-6 top-24 w-40 rounded-xl p-3" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                <p className="text-[9px] uppercase tracking-wide mb-1.5" style={{ color: "rgba(255,255,255,0.4)" }}>next up</p>
                <p className="text-[12px] font-medium" style={{ color: "rgba(255,255,255,0.85)" }}>problem set 8</p>
                <p className="text-[10.5px] mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>due tomorrow</p>
              </div>

              <div className="absolute right-6 top-16 flex items-center gap-2 rounded-xl px-3 py-2.5" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                <MiniRing pct={0.71} size={30} />
                <span className="text-[11px] font-medium" style={{ color: "rgba(255,255,255,0.85)" }}>12</span>
              </div>

              <div className="absolute right-8 bottom-8 w-32 rounded-xl p-3 rotate-2" style={{ background: "#3a301c" }}>
                <p className="text-[10px] leading-snug" style={{ color: "#f0dcae", fontFamily: "'Fraunces', serif" }}>coffee, then chem</p>
              </div>
            </div>
          </AppWindow>
        </motion.div>
      </div>

      {/* ── Feature sections ─────────────────────────────────────────── */}
      <div id="how-it-works">
        <FeatureSection
          eyebrow="the canvas"
          title="a space you actually arrange"
          body="drag widgets wherever you want them. photos, notes, your streak, your next deadline — placed by you, not laid out in a grid someone else picked. pick a background that's actually yours: cream, black, or something in between."
          window={
            <div className="p-8 flex items-center justify-center gap-4">
              <div className="w-24 rounded-lg p-2 rotate-[-6deg]" style={{ background: "#1e2c38" }}>
                <p className="text-[9px]" style={{ color: "#c3ddef", fontFamily: "'Fraunces', serif" }}>focus &gt; perfect</p>
              </div>
              <div className="flex flex-col items-center gap-1.5 rotate-2">
                <MiniRing pct={0.4} size={44} />
              </div>
              <div className="w-20 h-20 rounded-lg overflow-hidden border-4 rotate-[8deg]" style={{ borderColor: "rgba(255,255,255,0.9)", background: "linear-gradient(160deg,#8a6bb8,#241c33)" }} />
            </div>
          }
        />
        <FeatureSection
          eyebrow="one account"
          title="the tools you already have"
          body="canvas for what's due, spotify for what you're playing, google calendar for what's next — connected once, shown quietly inside the same space you're focusing in. never a shared login, always your own."
          reverse
          window={
            <div className="p-6 flex flex-col gap-2.5">
              {[
                { icon: Link2, label: "canvas lms", sub: "8 assignments synced" },
                { icon: Music2, label: "spotify", sub: "now playing" },
                { icon: CalendarDays, label: "google calendar", sub: "3 events today" },
              ].map(row => (
                <div key={row.label} className="flex items-center gap-3 rounded-xl px-3.5 py-3" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <row.icon className="size-4" style={{ color: "rgba(255,255,255,0.5)" }} />
                  <div className="min-w-0">
                    <p className="text-[12px] font-medium" style={{ color: "rgba(255,255,255,0.85)" }}>{row.label}</p>
                    <p className="text-[10.5px]" style={{ color: "rgba(255,255,255,0.4)" }}>{row.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          }
        />
        <FeatureSection
          eyebrow="the timer"
          title="it notices, quietly"
          body="peak focus hours, how long a session actually holds your attention, when a break helps more than pushing through — the timer adapts instead of just counting down. no leaderboards, no streak guilt. just a little glow that grows when you show up."
          window={
            <div className="p-8 flex items-center justify-center">
              <div className="rounded-xl px-4 py-3 flex items-center gap-2.5" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(239,106,74,0.25)" }}>
                <Sparkles className="size-3.5" style={{ color: "#ef6a5a" }} />
                <p className="text-[11.5px]" style={{ color: "rgba(255,255,255,0.7)" }}>
                  peak focus window — session set to <span style={{ color: "rgba(255,255,255,0.95)", fontWeight: 500 }}>32 min</span>
                </p>
              </div>
            </div>
          }
        />
      </div>

      {/* ── Manifesto-lite ──────────────────────────────────────────── */}
      <section className="relative overflow-hidden py-28" style={dotted}>
        <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(180deg, #f8f1e2 0%, rgba(248,241,226,0) 15%, rgba(248,241,226,0) 85%, #f8f1e2 100%)" }} />
        <div className="relative max-w-2xl mx-auto px-6 text-center">
          <ProdigyMark size={40} className="mx-auto mb-6 opacity-90" />
          <p className="text-2xl md:text-3xl font-medium leading-snug" style={{ fontFamily: "'Fraunces', serif" }}>
            most productivity tools are built to be impressive. we'd rather build one that's built to be <em>yours</em> —
            open enough to still be filling in, the way an actual prodigy always is.
          </p>
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-6 pb-28 text-center">
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          build your focus space.
        </h2>
        <p className="mt-3 text-base" style={{ color: "rgba(26,26,26,0.6)" }}>
          free, no account needed until you want one.
        </p>
        <button
          onClick={() => navigate("/dashboard")}
          className="mt-7 px-7 py-4 rounded-full font-medium inline-flex items-center gap-2 transition-transform hover:scale-105 shadow-lg"
          style={{ background: INK, color: CREAM, boxShadow: "0 10px 30px -8px rgba(26,26,26,0.5)" }}
        >
          start focusing
          <ArrowRight className="size-4" />
        </button>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <footer className="border-t" style={{ borderColor: "rgba(26,26,26,0.1)" }}>
        <div className="max-w-6xl mx-auto px-6 py-10 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <ProdigyMark size={22} />
            <span className="font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>prodigy</span>
          </div>
          <p className="text-sm" style={{ color: "rgba(26,26,26,0.45)" }}>built for students, by students.</p>
        </div>
      </footer>
    </div>
  );
}
