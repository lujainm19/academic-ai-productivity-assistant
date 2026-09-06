// customization-context.tsx
// Backend for the Settings page. Two things intentionally live here and
// nowhere else:
//   - the 6-hue accent "Color Theme" system (--primary/--accent), which
//     Dashboard, Task Planner, AI Assistant, Progress, and the sidebar all
//     still depend on — this hasn't been rebuilt onto prodigy's own
//     cream/black system yet (that's the "align the other pages" work,
//     still ahead), so it stays as the real, working theming layer for now.
//   - Focus session defaults (duration, break reminders) — the Focus page
//     genuinely reads these.
//
// Retired: the 3 "Study Mode" personality transforms (Cozy/Competitive/
// Collaborative swapping fonts/corners/shadows app-wide via an injected
// !important stylesheet) and the "Focus Environment" photo picker. Both
// predate prodigy's own design language and were actively fighting it —
// the mode system used the exact "force every card to near-transparent"
// pattern that caused the original Focus-page contrast bug, and the
// environment picker duplicated a decision the Focus Canvas now makes
// better, in-context, on its own background picker.

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type ThemeId = "midnight" | "ocean" | "forest" | "sunset" | "rose" | "lavender";
export type FocusDuration = "15" | "25" | "50";
export type BreakDuration = "5" | "10" | "15";

export interface CustomizationSettings {
  themeId: ThemeId;
  breakReminders: boolean;
  focusDuration: FocusDuration;
  breakDuration: BreakDuration;
}

export const DEFAULT_SETTINGS: CustomizationSettings = {
  themeId: "midnight",
  breakReminders: true,
  focusDuration: "25",
  breakDuration: "5",
};

// ── Theme Color Maps ───────────────────────────────────────────────────────
// Maps each theme ID to its primary and accent hex colors, written to CSS
// variables on :root — every component using --primary/--accent updates
// instantly.

export const THEME_VARS: Record<ThemeId, { primary: string; accent: string }> = {
  midnight:  { primary: "#6366f1", accent: "#8b5cf6" },
  ocean:     { primary: "#0ea5e9", accent: "#06b6d4" },
  forest:    { primary: "#10b981", accent: "#059669" },
  sunset:    { primary: "#f59e0b", accent: "#ef4444" },
  rose:      { primary: "#ec4899", accent: "#f43f5e" },
  lavender:  { primary: "#a855f7", accent: "#d946ef" },
};

interface CustomizationContextValue {
  settings: CustomizationSettings;    // current draft (unsaved changes included)
  savedSettings: CustomizationSettings;
  setTheme: (id: ThemeId) => void;
  setBreakReminders: (v: boolean) => void;
  setFocusDuration: (v: FocusDuration) => void;
  setBreakDuration: (v: BreakDuration) => void;
  saveChanges: () => void;
  resetToDefault: () => void;
  hasUnsavedChanges: boolean;
}

const CustomizationContext = createContext<CustomizationContextValue | null>(null);

const STORAGE_KEY = "adaptive:customization";

function applyTheme(themeId: ThemeId) {
  const vars = THEME_VARS[themeId];
  document.documentElement.style.setProperty("--primary", vars.primary);
  document.documentElement.style.setProperty("--accent", vars.accent);
  document.documentElement.style.setProperty("--ring", vars.primary);

  const existing = document.getElementById("theme-style-override");
  if (existing) existing.remove();
  const styleTag = document.createElement("style");
  styleTag.id = "theme-style-override";
  styleTag.innerHTML = `
    .bg-primary { background-color: ${vars.primary} !important; color: #ffffff !important; }
    .bg-primary * { color: #ffffff !important; }
    .text-primary { color: ${vars.primary} !important; }
    .text-accent { color: ${vars.accent} !important; }
    .border-primary\\/50, .border-primary\\/30, .border-primary\\/20 {
      border-color: ${vars.primary}50 !important;
    }
    .h-full.bg-gradient-to-r {
      background-image: linear-gradient(to right, ${vars.primary}, ${vars.accent}) !important;
    }
    .text-primary svg, svg.text-primary { color: ${vars.primary} !important; }
    .ring-primary { --tw-ring-color: ${vars.primary} !important; }
    .accent-primary { accent-color: ${vars.primary} !important; }
  `;
  document.head.appendChild(styleTag);
}

// Loading defaults for any legacy keys (studyMode, environmentId, etc.)
// that might still be sitting in a returning user's localStorage from
// before this cleanup — spreading them into CustomizationSettings would
// silently carry dead fields forward, so only the fields this type still
// defines are read out.
function loadSaved(): CustomizationSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      themeId: parsed.themeId ?? DEFAULT_SETTINGS.themeId,
      breakReminders: parsed.breakReminders ?? DEFAULT_SETTINGS.breakReminders,
      focusDuration: parsed.focusDuration ?? DEFAULT_SETTINGS.focusDuration,
      breakDuration: parsed.breakDuration ?? DEFAULT_SETTINGS.breakDuration,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function CustomizationProvider({ children }: { children: ReactNode }) {
  const [saved, setSaved] = useState<CustomizationSettings>(loadSaved);
  const [draft, setDraft] = useState<CustomizationSettings>(saved);
  const hasUnsavedChanges = JSON.stringify(draft) !== JSON.stringify(saved);

  useEffect(() => {
    applyTheme(saved.themeId);
  }, []);

  const setTheme = (v: ThemeId) => setDraft(d => ({ ...d, themeId: v }));
  const setBreakReminders = (v: boolean) => setDraft(d => ({ ...d, breakReminders: v }));
  const setFocusDuration = (v: FocusDuration) => setDraft(d => ({ ...d, focusDuration: v }));
  const setBreakDuration = (v: BreakDuration) => setDraft(d => ({ ...d, breakDuration: v }));

  const saveChanges = () => {
    setSaved(draft);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    applyTheme(draft.themeId);
  };

  const resetToDefault = () => {
    setDraft(DEFAULT_SETTINGS);
    setSaved(DEFAULT_SETTINGS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SETTINGS));
    applyTheme(DEFAULT_SETTINGS.themeId);
  };

  return (
    <CustomizationContext.Provider value={{
      settings: draft,
      savedSettings: saved,
      setTheme, setBreakReminders, setFocusDuration, setBreakDuration,
      saveChanges, resetToDefault,
      hasUnsavedChanges,
    }}>
      {children}
    </CustomizationContext.Provider>
  );
}

export function useCustomization() {
  const ctx = useContext(CustomizationContext);
  if (!ctx) throw new Error("useCustomization must be used inside CustomizationProvider");
  return ctx;
}
