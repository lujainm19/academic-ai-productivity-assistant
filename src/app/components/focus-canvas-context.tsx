// focus-canvas-context.tsx
// Persistence layer for the Focus page's widget canvas — same pattern as
// local-data-context.tsx (lazy localStorage init, write-back on change), so
// a user's arrangement survives refreshes and navigation without needing
// any backend/account system. If accounts ever land, this shape (widget
// type, position, size, config) can sync server-side without the canvas
// itself changing.

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

export type WidgetType = "tasks" | "photo" | "note" | "clock" | "growth" | "canvas" | "spotify" | "calendar";
export type WidgetSize = "s" | "m" | "l";
export type BackgroundTheme = "cream" | "black" | "deepFocus" | "nightStudy" | "cozy" | "dreamy";

export interface CanvasWidget {
  id: string;
  type: WidgetType;
  x: number; // percent, 0-100, left edge relative to canvas
  y: number; // percent, 0-100, top edge relative to canvas
  size: WidgetSize;
  rotation: number; // small hand-placed tilt, degrees
  config: Record<string, any>;
}

// Base dimensions per type/size, in px on a desktop canvas. Discrete sizes
// only (no freeform resize) — this mirrors how Apple's own widgets work
// (S/M/L, not a resize handle), and it means every arrangement stays tidy
// without needing continuous collision/snap math for arbitrary rectangles.
export const WIDGET_DIMENSIONS: Record<WidgetType, Record<WidgetSize, { w: number; h: number }>> = {
  tasks:    { s: { w: 200, h: 140 }, m: { w: 240, h: 190 }, l: { w: 280, h: 250 } },
  photo:    { s: { w: 150, h: 150 }, m: { w: 200, h: 200 }, l: { w: 260, h: 260 } },
  note:     { s: { w: 170, h: 130 }, m: { w: 210, h: 170 }, l: { w: 250, h: 210 } },
  clock:    { s: { w: 140, h: 90 },  m: { w: 170, h: 110 }, l: { w: 200, h: 130 } },
  growth:   { s: { w: 130, h: 150 }, m: { w: 160, h: 180 }, l: { w: 190, h: 210 } },
  canvas:   { s: { w: 210, h: 100 }, m: { w: 240, h: 120 }, l: { w: 270, h: 150 } },
  spotify:  { s: { w: 210, h: 90 },  m: { w: 240, h: 110 }, l: { w: 270, h: 140 } },
  calendar: { s: { w: 210, h: 100 }, m: { w: 240, h: 130 }, l: { w: 270, h: 160 } },
};

export const WIDGET_LIBRARY: { type: WidgetType; label: string; hint: string }[] = [
  { type: "tasks", label: "Today's tasks", hint: "Your real task list, live" },
  { type: "photo", label: "Photo", hint: "A picture that's yours" },
  { type: "note", label: "Sticky note", hint: "Write anything" },
  { type: "clock", label: "Clock", hint: "The time, quietly" },
  { type: "growth", label: "Streak", hint: "Progress to your next badge" },
  { type: "canvas", label: "Canvas", hint: "Next assignment due" },
  { type: "spotify", label: "Spotify", hint: "Connect your music" },
  { type: "calendar", label: "Calendar", hint: "Connect Google Calendar" },
];

interface Template {
  id: string;
  label: string;
  widgets: Omit<CanvasWidget, "id">[];
}

// Real, considered arrangements — not an arbitrary grid of every widget
// type. Positions are percentages so they hold up across canvas widths.
export const TEMPLATES: Template[] = [
  {
    id: "minimalist",
    label: "Minimalist",
    widgets: [
      { type: "tasks", x: 68, y: 14, size: "m", rotation: 0, config: {} },
      { type: "clock", x: 8, y: 16, size: "s", rotation: 0, config: {} },
    ],
  },
  {
    id: "study-desk",
    label: "Study desk",
    widgets: [
      { type: "tasks", x: 6, y: 18, size: "m", rotation: -1, config: {} },
      { type: "canvas", x: 66, y: 15, size: "m", rotation: 1, config: {} },
      { type: "note", x: 68, y: 62, size: "s", rotation: -2, config: { text: "Deep breath. One task at a time.", color: "sage" } },
    ],
  },
  {
    id: "vision-board",
    label: "Vision board",
    widgets: [
      { type: "photo", x: 6, y: 12, size: "m", rotation: -3, config: {} },
      { type: "note", x: 68, y: 14, size: "s", rotation: 2, config: { text: "“Small steps, every day.”", color: "amber" } },
      { type: "growth", x: 70, y: 60, size: "s", rotation: 1, config: {} },
    ],
  },
  {
    id: "cozy-night",
    label: "Cozy night",
    widgets: [
      { type: "photo", x: 66, y: 12, size: "s", rotation: 3, config: {} },
      { type: "note", x: 6, y: 60, size: "s", rotation: -2, config: { text: "Just this one thing, then rest.", color: "rose" } },
      { type: "growth", x: 68, y: 60, size: "s", rotation: -1, config: {} },
    ],
  },
];

interface FocusCanvasContextValue {
  widgets: CanvasWidget[];
  background: BackgroundTheme;
  hasOnboarded: boolean;
  addWidget: (type: WidgetType) => void;
  removeWidget: (id: string) => void;
  updateWidget: (id: string, patch: Partial<CanvasWidget>) => void;
  setBackground: (theme: BackgroundTheme) => void;
  applyTemplate: (templateId: string) => void;
  startBlank: () => void;
  resetCanvas: () => void;
}

const FocusCanvasContext = createContext<FocusCanvasContextValue | null>(null);

const WIDGETS_KEY = "focus.widgets";
const BG_KEY = "focus.background";
const ONBOARDED_KEY = "focus.hasOnboarded";

function loadWidgets(): CanvasWidget[] | null {
  try {
    const raw = localStorage.getItem(WIDGETS_KEY);
    return raw ? (JSON.parse(raw) as CanvasWidget[]) : null;
  } catch {
    return null;
  }
}

const VALID_BACKGROUNDS: BackgroundTheme[] = ["cream", "black", "deepFocus", "nightStudy", "cozy", "dreamy"];

function loadBackground(): BackgroundTheme {
  try {
    const raw = localStorage.getItem(BG_KEY);
    // Guards against a theme key retired in an earlier version (e.g. the
    // old "morning"/"minimal") still sitting in a returning user's storage.
    if (raw && VALID_BACKGROUNDS.includes(raw as BackgroundTheme)) return raw as BackgroundTheme;
  } catch {
    // fall through
  }
  return "deepFocus";
}

// Finds a free-ish spot for a newly added widget so it doesn't land
// directly on top of an existing one — a light heuristic, not true
// collision solving (the user can drag it wherever afterward anyway).
function findOpenSpot(existing: CanvasWidget[]): { x: number; y: number } {
  const candidates = [
    { x: 8, y: 14 }, { x: 68, y: 14 }, { x: 8, y: 60 }, { x: 68, y: 60 },
    { x: 38, y: 10 }, { x: 38, y: 70 },
  ];
  for (const c of candidates) {
    const clash = existing.some(w => Math.abs(w.x - c.x) < 20 && Math.abs(w.y - c.y) < 20);
    if (!clash) return c;
  }
  return { x: 10 + Math.random() * 60, y: 12 + Math.random() * 55 };
}

export function FocusCanvasProvider({ children }: { children: ReactNode }) {
  const [widgets, setWidgets] = useState<CanvasWidget[]>(() => loadWidgets() ?? []);
  const [background, setBackgroundState] = useState<BackgroundTheme>(loadBackground);
  const [hasOnboarded, setHasOnboarded] = useState<boolean>(() => {
    try {
      return localStorage.getItem(ONBOARDED_KEY) === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    localStorage.setItem(WIDGETS_KEY, JSON.stringify(widgets));
  }, [widgets]);

  useEffect(() => {
    localStorage.setItem(BG_KEY, background);
  }, [background]);

  const markOnboarded = () => {
    setHasOnboarded(true);
    localStorage.setItem(ONBOARDED_KEY, "1");
  };

  const addWidget = useCallback((type: WidgetType) => {
    setWidgets(prev => {
      const spot = findOpenSpot(prev);
      const widget: CanvasWidget = {
        id: crypto.randomUUID(),
        type,
        x: spot.x,
        y: spot.y,
        size: "m",
        rotation: Math.random() > 0.5 ? 1.5 : -1.5,
        config: type === "note" ? { text: "", color: "amber" } : {},
      };
      return [...prev, widget];
    });
  }, []);

  const removeWidget = useCallback((id: string) => {
    setWidgets(prev => prev.filter(w => w.id !== id));
  }, []);

  const updateWidget = useCallback((id: string, patch: Partial<CanvasWidget>) => {
    setWidgets(prev => prev.map(w => (w.id === id ? { ...w, ...patch } : w)));
  }, []);

  const setBackground = useCallback((theme: BackgroundTheme) => {
    setBackgroundState(theme);
  }, []);

  const applyTemplate = useCallback((templateId: string) => {
    const template = TEMPLATES.find(t => t.id === templateId);
    if (!template) return;
    setWidgets(template.widgets.map(w => ({ ...w, id: crypto.randomUUID() })));
    markOnboarded();
  }, []);

  const startBlank = useCallback(() => {
    setWidgets([]);
    markOnboarded();
  }, []);

  const resetCanvas = useCallback(() => {
    setWidgets([]);
    setBackgroundState("deepFocus");
  }, []);

  return (
    <FocusCanvasContext.Provider value={{
      widgets, background, hasOnboarded,
      addWidget, removeWidget, updateWidget, setBackground,
      applyTemplate, startBlank, resetCanvas,
    }}>
      {children}
    </FocusCanvasContext.Provider>
  );
}

export function useFocusCanvas() {
  const ctx = useContext(FocusCanvasContext);
  if (!ctx) throw new Error("useFocusCanvas must be used within FocusCanvasProvider");
  return ctx;
}
