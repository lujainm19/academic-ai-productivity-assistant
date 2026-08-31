// focus-palette.ts
// Every color used to be hardcoded white/black, which only worked because
// every background theme happened to be dark. Adding a real light (cream)
// theme meant the whole canvas — timer, widget chrome, every widget body —
// needed to read color from CSS custom properties instead, so the same
// markup works on any background. This is the fix, applied once here
// rather than special-cased per component.

import { BackgroundTheme } from "./focus-canvas-context";

export interface CanvasBackground {
  label: string;
  css: string;
  swatch: string;
  mode: "light" | "dark";
}

export const BACKGROUNDS: Record<BackgroundTheme, CanvasBackground> = {
  cream:      { label: "Cream",       css: "radial-gradient(120% 90% at 50% -10%, #f8f1e2 0%, #f0e6d0 55%, #e8dabf 100%)", swatch: "linear-gradient(160deg,#f8f1e2,#e2d2b3)", mode: "light" },
  black:      { label: "Black",       css: "radial-gradient(120% 90% at 50% 0%, #161616 0%, #0a0a0a 60%, #000000 100%)",   swatch: "linear-gradient(160deg,#2c2c2c,#000000)", mode: "dark" },
  deepFocus:  { label: "Deep focus",  css: "radial-gradient(120% 90% at 50% -10%, #232244 0%, #17172c 45%, #0c0c16 100%)", swatch: "linear-gradient(160deg,#5a58a8,#17172c)", mode: "dark" },
  nightStudy: { label: "Night study", css: "linear-gradient(180deg, #0c1420 0%, #070b12 100%)",                            swatch: "linear-gradient(160deg,#2c4a6e,#070b12)", mode: "dark" },
  cozy:       { label: "Cozy",        css: "radial-gradient(120% 90% at 50% 110%, #3a2430 0%, #201620 50%, #120e14 100%)", swatch: "linear-gradient(160deg,#a8607e,#201620)", mode: "dark" },
  dreamy:     { label: "Dreamy",      css: "radial-gradient(120% 90% at 30% -10%, #3a2e4a 0%, #241c33 45%, #120e1c 100%)", swatch: "linear-gradient(160deg,#8a6bb8,#241c33)", mode: "dark" },
};

// CSS custom properties applied to the canvas root, keyed by the active
// background's mode. Every widget and the timer read color from these
// (via inline `style`, e.g. `color: "var(--fx-fg)"`) instead of a
// hardcoded Tailwind white/black class, so a widget built once looks
// correct on cream, true black, or any of the tinted dark themes.
const DARK_VARS = {
  "--fx-fg": "rgba(255,255,255,0.95)",
  "--fx-fg-muted": "rgba(255,255,255,0.62)",
  "--fx-fg-faint": "rgba(255,255,255,0.42)",
  "--fx-surface": "rgba(255,255,255,0.06)",
  "--fx-surface-hover": "rgba(255,255,255,0.1)",
  "--fx-surface-strong": "rgba(22,20,32,0.95)",
  "--fx-connect-surface": "rgba(0,0,0,0.22)",
  "--fx-border": "rgba(255,255,255,0.1)",
  "--fx-invert-bg": "#ffffff",
  "--fx-invert-fg": "#0a0a0a",
  "--fx-track": "rgba(255,255,255,0.12)",
  "--fx-scrim": "rgba(0,0,0,0.55)",
} as const;

const LIGHT_VARS: typeof DARK_VARS = {
  "--fx-fg": "rgba(38,30,20,0.92)",
  "--fx-fg-muted": "rgba(38,30,20,0.62)",
  "--fx-fg-faint": "rgba(38,30,20,0.44)",
  "--fx-surface": "rgba(38,30,20,0.05)",
  "--fx-surface-hover": "rgba(38,30,20,0.09)",
  "--fx-surface-strong": "rgba(255,252,245,0.97)",
  "--fx-connect-surface": "rgba(255,255,255,0.55)",
  "--fx-border": "rgba(38,30,20,0.14)",
  "--fx-invert-bg": "#26190f",
  "--fx-invert-fg": "#f7f0e2",
  "--fx-track": "rgba(38,30,20,0.14)",
  "--fx-scrim": "rgba(20,14,8,0.5)",
};

export function paletteVars(theme: BackgroundTheme): React.CSSProperties {
  return (BACKGROUNDS[theme].mode === "light" ? LIGHT_VARS : DARK_VARS) as React.CSSProperties;
}
