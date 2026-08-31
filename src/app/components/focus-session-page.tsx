// focus-session-page.tsx
// A personal focus canvas, not a Pomodoro dashboard: a fixed timer anchors
// the center, and the user arranges their own widgets (photos, notes,
// tasks, music/calendar/Canvas connect-states) freely around it. Layout
// persists via focus-canvas-context.tsx (localStorage, same pattern as the
// rest of the app's data layer — see that file for why). Color comes from
// focus-palette.ts's CSS custom properties, not hardcoded white/black, so
// the light "Cream" theme and the dark ones share the same markup.

import { motion, AnimatePresence } from "motion/react";
import { ChevronLeft, Play, Pause, RotateCcw, LayoutGrid, Plus, X, Check } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router";
import { useLocalData } from "./local-data-context";
import { useCustomization } from "./customization-context";
import {
  useFocusCanvas, WIDGET_LIBRARY, TEMPLATES, BackgroundTheme, WIDGET_DIMENSIONS,
} from "./focus-canvas-context";
import { WidgetFrame, renderWidgetBody } from "./focus-widgets";
import { BACKGROUNDS, paletteVars } from "./focus-palette";

function playChime() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(660, ctx.currentTime);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.1);
    osc.start();
    osc.stop(ctx.currentTime + 1.1);
    setTimeout(() => ctx.close(), 1300);
  } catch {
    // audio not available — silent fail, timer state is still correct
  }
}

export function FocusSessionPage() {
  const navigate = useNavigate();
  const { tasks } = useLocalData();
  const { savedSettings } = useCustomization();
  const canvas = useFocusCanvas();
  const canvasRef = useRef<HTMLDivElement>(null);

  const focusMins = parseInt(savedSettings.focusDuration) || 25;
  const breakMins = parseInt(savedSettings.breakDuration) || 5;

  const [mode, setMode] = useState<"focus" | "break">("focus");
  const [timeLeft, setTimeLeft] = useState(focusMins * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [showAddTray, setShowAddTray] = useState(false);
  const [showBgPicker, setShowBgPicker] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    // 760, not 880/1024 — a free-form drag canvas still works fine on a
    // modest laptop window; only genuinely narrow (tablet-portrait/phone)
    // widths need the simplified stacked list.
    const check = () => setIsDesktop(window.innerWidth >= 760);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const currentTask = tasks.find(t => !t.completed);

  useEffect(() => {
    setTimeLeft((mode === "focus" ? focusMins : breakMins) * 60);
    setIsRunning(false);
  }, [mode, focusMins, breakMins]);

  useEffect(() => {
    if (!isRunning) return;
    if (timeLeft <= 0) {
      playChime();
      if (mode === "focus") setSessionCount(c => c + 1);
      setMode(m => (m === "focus" ? "break" : "focus"));
      return;
    }
    const t = setTimeout(() => setTimeLeft(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [isRunning, timeLeft, mode]);

  const totalSecs = (mode === "focus" ? focusMins : breakMins) * 60;
  const progress = 1 - timeLeft / totalSecs;
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  const reset = useCallback(() => {
    setIsRunning(false);
    setTimeLeft((mode === "focus" ? focusMins : breakMins) * 60);
  }, [mode, focusMins, breakMins]);

  const addAndClose = (type: (typeof WIDGET_LIBRARY)[number]["type"]) => {
    canvas.addWidget(type);
    setShowAddTray(false);
  };

  return (
    <div
      className="relative min-h-screen overflow-hidden"
      style={{ background: BACKGROUNDS[canvas.background].css, ...paletteVars(canvas.background) }}
    >
      <div className="relative z-10 min-h-screen flex flex-col">

        <nav className="flex items-center justify-between p-5 md:p-7">
          <button onClick={() => navigate("/dashboard")} className="size-9 rounded-full flex items-center justify-center transition-colors" style={{ background: "var(--fx-surface)" }} aria-label="Back">
            <ChevronLeft className="size-4.5" style={{ color: "var(--fx-fg-muted)" }} />
          </button>

          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setShowBgPicker(v => !v)}
                className="size-9 rounded-full flex items-center justify-center transition-colors"
                style={{ background: "var(--fx-surface)" }}
                aria-label="Background"
              >
                <span className="size-4 rounded-full block" style={{ background: BACKGROUNDS[canvas.background].swatch }} />
              </button>
              <AnimatePresence>
                {showBgPicker && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.96 }}
                    transition={{ type: "spring", stiffness: 400, damping: 28 }}
                    className="absolute right-0 top-11 z-40 p-2.5 rounded-2xl backdrop-blur-xl shadow-2xl flex gap-2"
                    style={{ background: "var(--fx-surface-strong)", border: "1px solid var(--fx-border)" }}
                  >
                    {(Object.keys(BACKGROUNDS) as BackgroundTheme[]).map(key => (
                      <button
                        key={key}
                        onClick={() => { canvas.setBackground(key); setShowBgPicker(false); }}
                        className="flex flex-col items-center gap-1.5"
                      >
                        <span
                          className="size-8 rounded-xl block border-2"
                          style={{ background: BACKGROUNDS[key].swatch, borderColor: canvas.background === key ? "var(--fx-fg)" : "transparent" }}
                        />
                        <span className="text-[9px]" style={{ color: "var(--fx-fg-faint)" }}>{BACKGROUNDS[key].label}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button
              onClick={() => { setEditMode(v => !v); setShowAddTray(false); }}
              className="h-9 px-4 rounded-full text-sm font-medium flex items-center gap-1.5 transition-colors"
              style={editMode
                ? { background: "var(--fx-invert-bg)", color: "var(--fx-invert-fg)" }
                : { background: "var(--fx-surface)", color: "var(--fx-fg-muted)" }}
            >
              {editMode ? <><Check className="size-3.5" />Done</> : <><LayoutGrid className="size-3.5" />Customize</>}
            </button>
          </div>
        </nav>

        {/* ── Canvas ──────────────────────────────────────────────────── */}
        <div ref={canvasRef} className="relative flex-1 mx-4 md:mx-8 mb-4 md:mb-8 rounded-[28px] overflow-hidden">

          {/* Timer — fixed anchor, plain typography, no card. */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none px-6">
            <p className="text-[11px] uppercase tracking-[0.14em] mb-3" style={{ color: "var(--fx-fg-faint)" }}>
              {mode === "focus" ? `Session ${sessionCount + 1}` : "Break"}
            </p>
            <div className="relative">
              <p
                className="tabular-nums leading-none"
                style={{ fontFamily: "'Fraunces', serif", fontSize: "clamp(4.5rem, 13vw, 8.5rem)", fontWeight: 400, fontVariationSettings: "'opsz' 90", color: "var(--fx-fg)" }}
              >
                {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
              </p>
              <div className="h-[3px] rounded-full mt-2 overflow-hidden" style={{ width: "min(60vw, 280px)", background: "var(--fx-track)" }}>
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: "var(--fx-fg)" }}
                  animate={{ width: `${progress * 100}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                />
              </div>
            </div>
            {currentTask && mode === "focus" && (
              <p className="text-sm mt-5" style={{ color: "var(--fx-fg-muted)" }}>{currentTask.title}</p>
            )}

            <div className="flex items-center gap-3 mt-9 pointer-events-auto">
              <button onClick={reset} className="size-10 rounded-full flex items-center justify-center transition-colors" style={{ background: "var(--fx-surface)" }} aria-label="Reset">
                <RotateCcw className="size-4" style={{ color: "var(--fx-fg-muted)" }} />
              </button>
              <button
                onClick={() => setIsRunning(v => !v)}
                className="size-16 rounded-full flex items-center justify-center hover:scale-105 transition-transform shadow-lg"
                style={{ background: "var(--fx-invert-bg)" }}
                aria-label={isRunning ? "Pause" : "Start"}
              >
                {isRunning
                  ? <Pause className="size-6" style={{ color: "var(--fx-invert-fg)", fill: "var(--fx-invert-fg)" }} />
                  : <Play className="size-6 ml-0.5" style={{ color: "var(--fx-invert-fg)", fill: "var(--fx-invert-fg)" }} />}
              </button>
              <div className="size-10" />
            </div>
          </div>

          {/* Widgets */}
          {isDesktop ? (
            <AnimatePresence>
              {canvas.widgets.map(w => (
                <WidgetFrame key={w.id} widget={w} editMode={editMode} dimmed={(isRunning && mode === "focus") || showAddTray} canvasRef={canvasRef}>
                  {renderWidgetBody(w)}
                </WidgetFrame>
              ))}
            </AnimatePresence>
          ) : (
            <div className="absolute inset-x-4 bottom-4 top-[62%] overflow-y-auto flex flex-col gap-3">
              {canvas.widgets.map(w => {
                const dims = WIDGET_DIMENSIONS[w.type].m;
                return (
                  <div key={w.id} style={{ height: Math.min(dims.h, 140) }} className="relative shrink-0">
                    {renderWidgetBody(w)}
                  </div>
                );
              })}
            </div>
          )}

          {/* Add-widget tray — docked to the bottom-right corner, stacked
              above the "+" button, so it never competes with the timer for
              the vertical center regardless of viewport height. */}
          <AnimatePresence>
            {editMode && showAddTray && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.97 }}
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
                className="absolute bottom-20 right-5 w-64 max-h-[min(60vh,420px)] overflow-y-auto p-1.5 rounded-2xl backdrop-blur-xl shadow-2xl flex flex-col gap-0.5 z-30"
                style={{ background: "var(--fx-surface-strong)", border: "1px solid var(--fx-border)" }}
              >
                {WIDGET_LIBRARY.map(item => (
                  <button
                    key={item.type}
                    onClick={() => addAndClose(item.type)}
                    className="w-full px-3 py-2.5 rounded-xl text-left transition-colors flex items-center justify-between gap-2 hover:brightness-110"
                    style={{ background: "transparent" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "var(--fx-surface-hover)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    <span>
                      <span className="block text-xs font-medium" style={{ color: "var(--fx-fg)" }}>{item.label}</span>
                      <span className="block text-[10px] mt-0.5" style={{ color: "var(--fx-fg-faint)" }}>{item.hint}</span>
                    </span>
                    <Plus className="size-3.5 shrink-0" style={{ color: "var(--fx-fg-faint)" }} />
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {editMode && (
            <button
              onClick={() => setShowAddTray(v => !v)}
              className="absolute bottom-5 right-5 size-12 rounded-full flex items-center justify-center shadow-2xl hover:scale-105 transition-transform z-30"
              style={{ background: "var(--fx-invert-bg)", color: "var(--fx-invert-fg)" }}
              aria-label="Add widget"
            >
              <Plus className={`size-5 transition-transform ${showAddTray ? "rotate-45" : ""}`} />
            </button>
          )}

          {/* Onboarding — first ever visit only. The scrim stays a dark
              wash regardless of background theme (that's the point of a
              scrim), so this panel's own light-on-dark text is safe as-is
              without reading from the palette. */}
          <AnimatePresence>
            {!canvas.hasOnboarded && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-40 flex items-center justify-center backdrop-blur-md p-6"
                style={{ background: "var(--fx-scrim)" }}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.94, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 28 }}
                  className="w-full max-w-md text-center"
                >
                  <p className="text-2xl mb-2 text-white" style={{ fontFamily: "'Fraunces', serif" }}>Build your focus space.</p>
                  <p className="text-sm text-white/50 mb-7">Add the things that help you focus — or start from a setup someone else already got right.</p>
                  <div className="grid grid-cols-2 gap-2.5 mb-3">
                    {TEMPLATES.map(t => (
                      <button
                        key={t.id}
                        onClick={() => canvas.applyTemplate(t.id)}
                        className="p-3.5 rounded-2xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/10 text-left transition-colors"
                      >
                        <p className="text-sm font-medium text-white/90">{t.label}</p>
                        <p className="text-[11px] text-white/45 mt-0.5">{t.widgets.length} widgets</p>
                      </button>
                    ))}
                  </div>
                  <button onClick={canvas.startBlank} className="text-sm text-white/45 hover:text-white/75 transition-colors">
                    Start with a blank canvas
                  </button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
