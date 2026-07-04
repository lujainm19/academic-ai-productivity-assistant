// customization-context.tsx
// This file is the "backend" of our customization feature.
// It manages all user preferences (study mode, theme, environment, etc.)
// and makes them available to every page in the app via React Context.

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

// ── Type Definitions ───────────────────────────────────────────────────────
// These define the valid values for each setting.
// TypeScript will throw an error if we pass anything outside these options.

export type StudyMode = "cozy" | "competitive" | "collaborative";
export type ThemeId = "midnight" | "ocean" | "forest" | "sunset" | "rose" | "lavender";
export type EnvironmentId = "cafe" | "academia" | "cyber" | "forest" | "space" | "minimal";
export type FocusDuration = "15" | "25" | "50";
export type BreakDuration = "5" | "10" | "15";

// This interface defines the shape of ALL user settings combined
export interface CustomizationSettings {
  studyMode: StudyMode;
  themeId: ThemeId;
  environmentId: EnvironmentId;
  ambientSounds: boolean;
  breakReminders: boolean;
  focusDuration: FocusDuration;
  breakDuration: BreakDuration;
  defaultEnvironment: EnvironmentId;
}

// ── Default Settings ───────────────────────────────────────────────────────
// These are the values the app starts with on first load,
// and what "Reset to Default" snaps back to.

export const DEFAULT_SETTINGS: CustomizationSettings = {
  studyMode: "cozy",           // start in cozy mode
  themeId: "midnight",         // midnight blue color theme
  environmentId: "cafe",       // rainy café as the focus background
  ambientSounds: true,         // ambient sounds on by default
  breakReminders: true,        // break reminders on by default
  focusDuration: "25",         // classic 25-min pomodoro
  breakDuration: "5",          // 5-min break
  defaultEnvironment: "cafe",  // rainy café as default session environment
};

// ── Mode CSS Variables ─────────────────────────────────────────────────────
// Each study mode injects different CSS variables into the document root.
// This is how the entire app's feel changes when the user switches modes
// and hits Save Changes — border radius, font weight, shadows, spacing all shift.

export const MODE_STYLES: Record<StudyMode, Record<string, string>> = {
  cozy: {
    // Soft, rounded, warm — feels like a comfortable study nook
    "--mode-radius": "1.25rem",
    "--mode-font-weight": "400",
    "--mode-card-opacity": "0.85",
    "--mode-border-style": "1px solid rgba(255,255,255,0.08)",
    "--mode-shadow": "0 4px 24px rgba(0,0,0,0.18)",
    "--mode-spacing": "1.5rem",
  },
  competitive: {
    // Sharp, bold, high-contrast — feels intense and driven
    "--mode-radius": "0.5rem",
    "--mode-font-weight": "600",
    "--mode-card-opacity": "1",
    "--mode-border-style": "1px solid rgba(255,255,255,0.15)",
    "--mode-shadow": "0 0 32px rgba(249,115,22,0.15)",
    "--mode-spacing": "1rem",
  },
  collaborative: {
    // Balanced, friendly, open — feels like a group workspace
    "--mode-radius": "1rem",
    "--mode-font-weight": "500",
    "--mode-card-opacity": "0.92",
    "--mode-border-style": "1px solid rgba(99,102,241,0.2)",
    "--mode-shadow": "0 4px 20px rgba(99,102,241,0.12)",
    "--mode-spacing": "1.25rem",
  },
};

// ── Theme Color Maps ───────────────────────────────────────────────────────
// Maps each theme ID to its primary and accent hex colors.
// These get written directly to CSS variables on the document root,
// so every component that uses --primary or --accent updates instantly.

export const THEME_VARS: Record<ThemeId, { primary: string; accent: string }> = {
  midnight:  { primary: "#6366f1", accent: "#8b5cf6" },
  ocean:     { primary: "#0ea5e9", accent: "#06b6d4" },
  forest:    { primary: "#10b981", accent: "#059669" },
  sunset:    { primary: "#f59e0b", accent: "#ef4444" },
  rose:      { primary: "#ec4899", accent: "#f43f5e" },
  lavender:  { primary: "#a855f7", accent: "#d946ef" },
};

// ── Context Interface ──────────────────────────────────────────────────────
// This defines everything the context exposes to the rest of the app —
// the current settings, all the setter functions, and save/reset actions.

interface CustomizationContextValue {
  settings: CustomizationSettings;       // the current draft (unsaved changes included)
  savedMode: StudyMode;                  // the last saved mode (used by other pages)
  setStudyMode: (mode: StudyMode) => void;
  setTheme: (id: ThemeId) => void;
  setEnvironment: (id: EnvironmentId) => void;
  setAmbientSounds: (v: boolean) => void;
  setBreakReminders: (v: boolean) => void;
  setFocusDuration: (v: FocusDuration) => void;
  setBreakDuration: (v: BreakDuration) => void;
  setDefaultEnvironment: (v: EnvironmentId) => void;
  saveChanges: () => void;
  resetToDefault: () => void;
  hasUnsavedChanges: boolean;            // true when draft differs from saved
}

// Create the context with null as the initial value.
// The useCustomization hook below will throw a helpful error
// if someone tries to use it outside the provider.
const CustomizationContext = createContext<CustomizationContextValue | null>(null);

// ── Helper: Apply Theme to DOM ─────────────────────────────────────────────
// Writes the selected theme's colors directly to CSS variables on :root.
// Because all our components use var(--primary) and var(--accent),
// this one function updates colors across the entire app instantly.

function applyTheme(themeId: ThemeId) {
  const vars = THEME_VARS[themeId];
  document.documentElement.style.setProperty("--primary", vars.primary);
  document.documentElement.style.setProperty("--accent", vars.accent);
  document.documentElement.style.setProperty("--ring", vars.primary);
}

// ── Helper: Apply Mode to DOM ──────────────────────────────────────────────
// Writes all the mode-specific CSS variables to :root.
// This only runs when the user clicks Save Changes,
// so the mode transformation is intentional not instant.

function applyMode(mode: StudyMode) {
  const styles = MODE_STYLES[mode];
  Object.entries(styles).forEach(([key, value]) => {
    document.documentElement.style.setProperty(key, value);
  });

  // Dramatically change background and card colors per mode
  const modeColors: Record<StudyMode, {
    bg: string; card: string; border: string; font: string; radius: string;
  }> = {
    cozy: {
      bg: "#13101a",
      card: "rgba(236,72,153,0.06)",
      border: "rgba(236,72,153,0.15)",
      font: "'Inter', sans-serif",
      radius: "1.5rem",
    },
    competitive: {
      bg: "#0a0a0a",
      card: "rgba(249,115,22,0.08)",
      border: "rgba(249,115,22,0.3)",
      font: "'Space Grotesk', sans-serif",
      radius: "0.25rem",
    },
    collaborative: {
      bg: "#0d1120",
      card: "rgba(99,102,241,0.08)",
      border: "rgba(99,102,241,0.2)",
      font: "'Plus Jakarta Sans', sans-serif",
      radius: "1rem",
    },
  };

  const c = modeColors[mode];
  // Set directly on body and root so Tailwind can't override
  document.body.style.backgroundColor = c.bg;
  document.body.style.fontFamily = c.font;
  document.documentElement.style.setProperty("--background", c.bg);
  document.documentElement.style.setProperty("--card", c.card);
  document.documentElement.style.setProperty("--border", c.border);
  document.documentElement.style.setProperty("--radius", c.radius);
  
  // Force card colors via a style tag so they override Tailwind
  const existing = document.getElementById("mode-style-override");
  if (existing) existing.remove();
  const styleTag = document.createElement("style");
  styleTag.id = "mode-style-override";
  styleTag.innerHTML = `
    .bg-card, [class*="bg-card"] { background-color: ${c.card} !important; }
    .border-border, [class*="border-border"] { border-color: ${c.border} !important; }
    .bg-background { background-color: ${c.bg} !important; }
    
    /* Mode: ${mode} — card glow effect */
    .rounded-xl, .rounded-2xl {
      box-shadow: ${
        mode === "competitive"   ? "0 0 20px rgba(249,115,22,0.15), inset 0 1px 0 rgba(249,115,22,0.1)" :
        mode === "cozy"          ? "0 4px 24px rgba(236,72,153,0.08), inset 0 1px 0 rgba(255,255,255,0.05)" :
                                   "0 4px 20px rgba(99,102,241,0.1), inset 0 1px 0 rgba(99,102,241,0.08)"
      } !important;
    }

    /* Sidebar glow strip */
    aside {
      border-right: 1px solid ${c.border} !important;
      box-shadow: ${
        mode === "competitive"   ? "4px 0 24px rgba(249,115,22,0.1)" :
        mode === "cozy"          ? "4px 0 24px rgba(236,72,153,0.06)" :
                                   "4px 0 24px rgba(99,102,241,0.08)"
      } !important;
    }

    /* Button glow on hover */
    button:hover {
      box-shadow: ${
        mode === "competitive"   ? "0 0 12px rgba(249,115,22,0.3)" :
        mode === "cozy"          ? "0 0 12px rgba(236,72,153,0.2)" :
                                   "0 0 12px rgba(99,102,241,0.2)"
      } !important;
    }
      /* Heading transformations per mode */
    h1, h2, h3 {
      font-family: ${
        mode === "competitive"   ? "'Space Grotesk', sans-serif" :
        mode === "cozy"          ? "'Inter', sans-serif" :
                                   "'Plus Jakarta Sans', sans-serif"
      } !important;
      text-transform: ${mode === "competitive" ? "uppercase" : "none"} !important;
      letter-spacing: ${
        mode === "competitive"   ? "0.08em" :
        mode === "cozy"          ? "-0.01em" :
                                   "0.02em"
      } !important;
      font-weight: ${
        mode === "competitive"   ? "800" :
        mode === "cozy"          ? "300" :
                                   "600"
      } !important;
    }

    /* Body text per mode */
    p, span, label, button {
      font-family: ${
        mode === "competitive"   ? "'Space Grotesk', sans-serif" :
        mode === "cozy"          ? "'Inter', sans-serif" :
                                   "'Plus Jakarta Sans', sans-serif"
      } !important;
      font-weight: ${
        mode === "competitive"   ? "600" :
        mode === "cozy"          ? "300" :
                                   "400"
      } !important;
      letter-spacing: ${
        mode === "competitive"   ? "0.03em" :
        mode === "cozy"          ? "0.01em" :
                                   "0.01em"
      } !important;
    }
  `;
  document.head.appendChild(styleTag);
}

// ── Provider Component ─────────────────────────────────────────────────────
// Wraps the entire app (via App.tsx) so every page can access settings.
// Uses two separate state objects:
//   - saved: what's committed to localStorage
//   - draft: what the user is currently editing on the customization page

export function CustomizationProvider({ children }: { children: ReactNode }) {

  // On first load, try to restore settings from localStorage.
  // If nothing is saved yet, fall back to DEFAULT_SETTINGS.
  const [saved, setSaved] = useState<CustomizationSettings>(() => {
    try {
      const raw = localStorage.getItem("adaptive:customization");
      return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  // Draft is what the user sees while editing — starts equal to saved.
  // Changes here don't affect the rest of the app until Save is clicked.
  const [draft, setDraft] = useState<CustomizationSettings>(saved);

  // True when the user has made changes that haven't been saved yet.
  // Used to enable/disable the Save Changes button and show the warning.
  const hasUnsavedChanges = JSON.stringify(draft) !== JSON.stringify(saved);

  // On first mount, apply the saved theme and mode to the DOM
  // so the app looks correct immediately after a page refresh.
  useEffect(() => {
    applyTheme(saved.themeId);
    applyMode(saved.studyMode);
  }, []);

  // Live-preview the theme color as the user clicks different themes.
  // Note: mode does NOT live-preview — it only applies on Save.
  useEffect(() => {
    applyTheme(draft.themeId);
  }, [draft.themeId]);

  // ── Setters ──────────────────────────────────────────────────────────────
  // Each setter updates only the draft, not the saved state.
  // Nothing persists until saveChanges() is called.

  const setStudyMode          = (v: StudyMode)       => setDraft(d => ({ ...d, studyMode: v }));
  const setTheme              = (v: ThemeId)          => setDraft(d => ({ ...d, themeId: v }));
  const setEnvironment        = (v: EnvironmentId)    => setDraft(d => ({ ...d, environmentId: v }));
  const setAmbientSounds      = (v: boolean)          => setDraft(d => ({ ...d, ambientSounds: v }));
  const setBreakReminders     = (v: boolean)          => setDraft(d => ({ ...d, breakReminders: v }));
  const setFocusDuration      = (v: FocusDuration)    => setDraft(d => ({ ...d, focusDuration: v }));
  const setBreakDuration      = (v: BreakDuration)    => setDraft(d => ({ ...d, breakDuration: v }));
  const setDefaultEnvironment = (v: EnvironmentId)    => setDraft(d => ({ ...d, defaultEnvironment: v }));

  // ── Save Changes ──────────────────────────────────────────────────────────
  // Commits the draft to saved state and persists it to localStorage.
  // Also applies the selected mode to the DOM — this is the moment
  // the rest of the app visually transforms.

  const saveChanges = () => {
    setSaved(draft);
    localStorage.setItem("adaptive:customization", JSON.stringify(draft));
    applyMode(draft.studyMode); // mode transformation happens here on save
  };

  // ── Reset to Default ──────────────────────────────────────────────────────
  // Wipes both draft and saved back to DEFAULT_SETTINGS,
  // updates localStorage, and immediately re-applies the default
  // theme and mode to the DOM.

  const resetToDefault = () => {
    setDraft(DEFAULT_SETTINGS);
    setSaved(DEFAULT_SETTINGS);
    localStorage.setItem("adaptive:customization", JSON.stringify(DEFAULT_SETTINGS));
    applyTheme(DEFAULT_SETTINGS.themeId);
    applyMode(DEFAULT_SETTINGS.studyMode);
  };

  return (
    <CustomizationContext.Provider value={{
      settings: draft,
      savedMode: saved.studyMode,
      setStudyMode, setTheme, setEnvironment,
      setAmbientSounds, setBreakReminders,
      setFocusDuration, setBreakDuration, setDefaultEnvironment,
      saveChanges, resetToDefault,
      hasUnsavedChanges,
    }}>
      {children}
    </CustomizationContext.Provider>
  );
}

// ── useCustomization Hook ─────────────────────────────────────────────────
// This is what every other page imports to read or update settings.
// Example usage: const { settings, saveChanges } = useCustomization();

export function useCustomization() {
  const ctx = useContext(CustomizationContext);
  if (!ctx) throw new Error("useCustomization must be used inside CustomizationProvider");
  return ctx;
}