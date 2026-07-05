// customization-page.tsx
// This is the main settings page where users personalize their experience.
// It reads from and writes to our CustomizationContext —
// nothing here is hardcoded, every selection updates the app's state.

import { motion } from "motion/react";
import { Palette, Moon, Bell, Zap, Heart, Users, Sparkles, Check } from "lucide-react";
import { useCustomization } from "./customization-context";
import type { ThemeId, EnvironmentId, StudyMode } from "./customization-context";

// ── Static Data ────────────────────────────────────────────────────────────
// These arrays define what gets rendered in each section.
// The id fields must match the types we defined in customization-context.tsx

const themes: { id: ThemeId; name: string; preview: string }[] = [
  { id: "midnight", name: "Midnight Blue",    preview: "from-blue-600 to-purple-600" },
  { id: "ocean",    name: "Ocean Depths",     preview: "from-sky-500 to-cyan-500" },
  { id: "forest",   name: "Forest Dreams",    preview: "from-emerald-500 to-green-600" },
  { id: "sunset",   name: "Sunset Glow",      preview: "from-amber-500 to-red-500" },
  { id: "rose",     name: "Rose Garden",      preview: "from-pink-500 to-rose-500" },
  { id: "lavender", name: "Lavender Fields",  preview: "from-purple-500 to-fuchsia-500" },
];

const environments: { id: EnvironmentId; name: string; image: string }[] = [
  { id: "cafe",     name: "Rainy Café",       image: "https://images.unsplash.com/photo-1739918069081-78dddf3240a6?w=400&h=300&fit=crop" },
  { id: "academia", name: "Dark Academia",    image: "https://images.unsplash.com/photo-1530984794059-26f732e6b7ab?w=400&h=300&fit=crop" },
  { id: "cyber",    name: "Cyber Room",       image: "https://images.unsplash.com/photo-1510519138101-570d1dca3d66?w=400&h=300&fit=crop" },
  { id: "forest",   name: "Forest Cabin",     image: "https://images.unsplash.com/photo-1769643207226-dcc20cbe7d70?w=400&h=300&fit=crop" },
  { id: "space",    name: "Space Station",    image: "https://images.unsplash.com/photo-1548123325-525b8e0cde7c?w=400&h=300&fit=crop" },
  { id: "minimal",  name: "Minimal Workspace",image: "https://images.unsplash.com/photo-1761446812503-5d9a3d298cd7?w=400&h=300&fit=crop" },
];

const modes: { id: StudyMode; name: string; icon: any; description: string; color: string }[] = [
  {
    id: "cozy",
    name: "Cozy Mode",
    icon: Heart,
    // Soft and supportive — good for low-pressure study sessions
    description: "Soft colors, gentle reminders, and a warm supportive atmosphere",
    color: "from-pink-500 to-rose-500",
  },
  {
    id: "competitive",
    name: "Competitive Mode",
    icon: Zap,
    // High energy — good for grinding through deadlines
    description: "Bold visuals, achievement highlights, and motivating challenges",
    color: "from-orange-500 to-red-500",
  },
  {
    id: "collaborative",
    name: "Collaborative Mode",
    icon: Users,
    // Team-oriented — good for group projects and shared goals
    description: "Team features, shared goals, and group study environments",
    color: "from-blue-500 to-purple-500",
  },
];

// ── Component ──────────────────────────────────────────────────────────────

export function CustomizationPage() {
  // Pull everything we need from the context.
  // settings = the current draft (includes unsaved changes)
  // hasUnsavedChanges = true when draft differs from what's saved
  const {
    settings,
    setStudyMode,
    setTheme,
    setEnvironment,
    setBreakReminders,
    setFocusDuration,
    setBreakDuration,
    setDefaultEnvironment,
    saveChanges,
    resetToDefault,
    hasUnsavedChanges,
  } = useCustomization();

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* Page Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-4xl font-bold mb-2">Customization</h1>
          <p className="text-muted-foreground">Personalize your productivity experience</p>
        </motion.div>

        {/* ── Study Modes ─────────────────────────────────────────────────
            Clicking a mode updates settings.studyMode in the draft.
            The checkmark and border highlight the currently selected mode.
            The actual app-wide transformation happens on Save Changes.     */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="size-5 text-primary" />
            <h2 className="text-xl font-semibold">Study Modes</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {modes.map((mode, i) => {
              const isSelected = settings.studyMode === mode.id;
              return (
                <motion.button
                  key={mode.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 + i * 0.05 }}
                  onClick={() => setStudyMode(mode.id)}
                  className={`p-6 rounded-xl border-2 transition-all text-left group relative ${
                    isSelected
                      ? "border-primary bg-primary/10 shadow-lg shadow-primary/20"
                      : "border-border bg-card hover:border-primary/50"
                  }`}
                >
                  {/* Checkmark badge shown when this mode is selected */}
                  {isSelected && (
                    <div className="absolute top-3 right-3 size-6 rounded-full bg-primary flex items-center justify-center">
                      <Check className="size-3.5 text-primary-foreground" />
                    </div>
                  )}
                  <div className={`size-12 rounded-xl bg-gradient-to-br ${mode.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <mode.icon className="size-6 text-white" />
                  </div>
                  <h3 className="font-semibold mb-2">{mode.name}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{mode.description}</p>
                </motion.button>
              );
            })}
          </div>
        </motion.div>

        {/* ── Color Themes ─────────────────────────────────────────────────
            Clicking a theme calls setTheme() which immediately rewrites
            --primary and --accent on :root — live preview across the whole app.
            The ring highlight shows which theme is currently active.          */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <div className="flex items-center gap-2 mb-4">
            <Palette className="size-5 text-primary" />
            <h2 className="text-xl font-semibold">Color Themes</h2>
          </div>
          <div className="grid grid-cols-3 lg:grid-cols-6 gap-4">
            {themes.map((theme, i) => {
              const isSelected = settings.themeId === theme.id;
              return (
                <motion.button
                  key={theme.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 + i * 0.03 }}
                  onClick={() => setTheme(theme.id)}
                  className="group relative"
                >
                  <div className={`h-24 rounded-xl bg-gradient-to-br ${theme.preview} mb-3 transition-transform shadow-lg ${
                    isSelected
                      ? "ring-2 ring-white ring-offset-2 ring-offset-background scale-105"
                      : "group-hover:scale-105"
                  }`}>
                    {/* Checkmark overlay on selected theme */}
                    {isSelected && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="size-7 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center">
                          <Check className="size-4 text-white" />
                        </div>
                      </div>
                    )}
                  </div>
                  <p className={`text-sm font-medium text-center ${isSelected ? "text-primary" : ""}`}>
                    {theme.name}
                  </p>
                </motion.button>
              );
            })}
          </div>
        </motion.div>

        {/* ── Focus Environments ───────────────────────────────────────────
            Clicking an environment stores it in settings.environmentId.
            The Focus Session page will read this value to set the background.
            A primary-colored border + checkmark shows the active selection.   */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <div className="flex items-center gap-2 mb-4">
            <Moon className="size-5 text-primary" />
            <h2 className="text-xl font-semibold">Focus Environments</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {environments.map((env, i) => {
              const isSelected = settings.environmentId === env.id;
              return (
                <motion.button
                  key={env.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.6 + i * 0.05 }}
                  onClick={() => setEnvironment(env.id)}
                  className={`group relative rounded-xl overflow-hidden border-2 transition-all ${
                    isSelected
                      ? "border-primary shadow-lg shadow-primary/20"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <img
                    src={env.image}
                    alt={env.name}
                    className="w-full h-40 object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/40 to-transparent flex items-end p-4">
                    <span className="font-medium">{env.name}</span>
                  </div>
                  {/* Checkmark badge on selected environment */}
                  {isSelected && (
                    <div className="absolute top-3 right-3 size-7 rounded-full bg-primary flex items-center justify-center shadow-lg">
                      <Check className="size-4 text-primary-foreground" />
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>
        </motion.div>

        {/* ── Preferences ──────────────────────────────────────────────────
            Toggle switches for ambient sounds and break reminders.
            Dropdowns for session duration defaults.
            All values are controlled — they read from and write to context.   */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} className="space-y-4">
          <h2 className="text-xl font-semibold">Preferences</h2>
          <div className="grid md:grid-cols-2 gap-6">

            {/* Toggle switches */}
            <div className="p-6 rounded-xl bg-card border border-border space-y-4">

              {/* Break Reminders toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bell className="size-5 text-primary" />
                  <div>
                    <h4 className="font-medium">Break Reminders</h4>
                    <p className="text-sm text-muted-foreground">Gentle notifications</p>
                  </div>
                </div>
                <button
                  onClick={() => setBreakReminders(!settings.breakReminders)}
                  className={`w-11 h-6 rounded-full transition-colors relative ${
                    settings.breakReminders ? "bg-primary" : "bg-secondary"
                  }`}
                >
                  <span className={`absolute top-1 size-4 rounded-full bg-white transition-all ${
                    settings.breakReminders ? "left-6" : "left-1"
                  }`} />
                </button>
              </div>
            </div>

            {/* Session duration dropdowns */}
            <div className="p-6 rounded-xl bg-card border border-border space-y-4">
              <h4 className="font-medium">Focus Session Defaults</h4>

              {/* Focus duration — controlled select reads from settings.focusDuration */}
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Focus Duration</label>
                <select
                  value={settings.focusDuration}
                  onChange={e => setFocusDuration(e.target.value as any)}
                  className="w-full px-4 py-2 rounded-lg bg-secondary border border-border focus:border-primary outline-none"
                >
                  <option value="15">15 minutes (Quick Sprint)</option>
                  <option value="25">25 minutes (Classic Pomodoro)</option>
                  <option value="50">50 minutes (Long Focus)</option>
                </select>
              </div>

              {/* Break duration */}
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Break Duration</label>
                <select
                  value={settings.breakDuration}
                  onChange={e => setBreakDuration(e.target.value as any)}
                  className="w-full px-4 py-2 rounded-lg bg-secondary border border-border focus:border-primary outline-none"
                >
                  <option value="5">5 minutes</option>
                  <option value="10">10 minutes</option>
                  <option value="15">15 minutes</option>
                </select>
              </div>

              {/* Default environment for focus sessions */}
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Default Environment</label>
                <select
                  value={settings.defaultEnvironment}
                  onChange={e => setDefaultEnvironment(e.target.value as any)}
                  className="w-full px-4 py-2 rounded-lg bg-secondary border border-border focus:border-primary outline-none"
                >
                  {environments.map(env => (
                    <option key={env.id} value={env.id}>{env.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Save / Reset ──────────────────────────────────────────────────
            Save Changes is disabled until the user makes a change (hasUnsavedChanges).
            Reset to Default wipes everything back to DEFAULT_SETTINGS immediately.
            The warning text appears automatically when there are pending changes.  */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="flex justify-end gap-3 items-center"
        >
          {/* Unsaved changes warning */}
          {hasUnsavedChanges && (
            <p className="text-sm text-muted-foreground mr-auto">
              You have unsaved changes
            </p>
          )}

          {/* Reset button — always active */}
          <button
            onClick={resetToDefault}
            className="px-6 py-3 rounded-xl bg-card border border-border hover:bg-secondary transition-all"
          >
            Reset to Default
          </button>

          {/* Save button — greyed out until there are unsaved changes */}
          <button
            onClick={saveChanges}
            disabled={!hasUnsavedChanges}
            className="px-6 py-3 rounded-xl bg-primary text-primary-foreground hover:scale-105 transition-all shadow-lg shadow-primary/25 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            Save Changes
          </button>
        </motion.div>

      </div>
    </div>
  );
}