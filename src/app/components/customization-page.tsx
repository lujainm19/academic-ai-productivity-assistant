import { motion } from "motion/react";
import { Palette, Sparkles, Moon, Sun, Volume2, Bell, Zap, Heart, Users } from "lucide-react";

const themes = [
  { id: "midnight", name: "Midnight Blue", primary: "#6366f1", accent: "#8b5cf6", preview: "from-blue-600 to-purple-600" },
  { id: "ocean", name: "Ocean Depths", primary: "#0ea5e9", accent: "#06b6d4", preview: "from-sky-500 to-cyan-500" },
  { id: "forest", name: "Forest Dreams", primary: "#10b981", accent: "#059669", preview: "from-emerald-500 to-green-600" },
  { id: "sunset", name: "Sunset Glow", primary: "#f59e0b", accent: "#ef4444", preview: "from-amber-500 to-red-500" },
  { id: "rose", name: "Rose Garden", primary: "#ec4899", accent: "#f43f5e", preview: "from-pink-500 to-rose-500" },
  { id: "lavender", name: "Lavender Fields", primary: "#a855f7", accent: "#d946ef", preview: "from-purple-500 to-fuchsia-500" }
];

const environments = [
  { id: "cafe", name: "Rainy Café", image: "https://images.unsplash.com/photo-1739918069081-78dddf3240a6?w=400&h=300&fit=crop" },
  { id: "academia", name: "Dark Academia", image: "https://images.unsplash.com/photo-1530984794059-26f732e6b7ab?w=400&h=300&fit=crop" },
  { id: "cyber", name: "Cyber Room", image: "https://images.unsplash.com/photo-1510519138101-570d1dca3d66?w=400&h=300&fit=crop" },
  { id: "forest", name: "Forest Cabin", image: "https://images.unsplash.com/photo-1769643207226-dcc20cbe7d70?w=400&h=300&fit=crop" },
  { id: "space", name: "Space Station", image: "https://images.unsplash.com/photo-1548123325-525b8e0cde7c?w=400&h=300&fit=crop" },
  { id: "minimal", name: "Minimal Workspace", image: "https://images.unsplash.com/photo-1761446812503-5d9a3d298cd7?w=400&h=300&fit=crop" }
];

const modes = [
  {
    id: "cozy",
    name: "Cozy Mode",
    icon: Heart,
    description: "Soft colors, gentle reminders, and a warm, supportive atmosphere",
    color: "from-pink-500 to-rose-500"
  },
  {
    id: "competitive",
    name: "Competitive Mode",
    icon: Zap,
    description: "Bold visuals, achievement highlights, and motivating challenges",
    color: "from-orange-500 to-red-500"
  },
  {
    id: "collaborative",
    name: "Collaborative Mode",
    icon: Users,
    description: "Team features, shared goals, and group study environments",
    color: "from-blue-500 to-purple-500"
  }
];

export function CustomizationPage() {
  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-4xl font-bold mb-2">Customization</h1>
          <p className="text-muted-foreground">Personalize your productivity experience</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="size-5 text-primary" />
            <h2 className="text-xl font-semibold">Study Modes</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {modes.map((mode, i) => (
              <motion.button
                key={mode.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 + i * 0.05 }}
                className="p-6 rounded-xl bg-card border-2 border-border hover:border-primary transition-all text-left group"
              >
                <div className={`size-12 rounded-xl bg-gradient-to-br ${mode.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <mode.icon className="size-6 text-white" />
                </div>
                <h3 className="font-semibold mb-2">{mode.name}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{mode.description}</p>
              </motion.button>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Palette className="size-5 text-primary" />
            <h2 className="text-xl font-semibold">Color Themes</h2>
          </div>
          <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-4">
            {themes.map((theme, i) => (
              <motion.button
                key={theme.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 + i * 0.03 }}
                className="group"
              >
                <div className={`h-24 rounded-xl bg-gradient-to-br ${theme.preview} mb-3 group-hover:scale-105 transition-transform shadow-lg`} />
                <p className="text-sm font-medium text-center">{theme.name}</p>
              </motion.button>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Moon className="size-5 text-primary" />
            <h2 className="text-xl font-semibold">Focus Environments</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {environments.map((env, i) => (
              <motion.button
                key={env.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6 + i * 0.05 }}
                className="group relative rounded-xl overflow-hidden border-2 border-border hover:border-primary transition-all"
              >
                <img src={env.image} alt={env.name} className="w-full h-40 object-cover group-hover:scale-110 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/40 to-transparent flex items-end p-4">
                  <span className="font-medium">{env.name}</span>
                </div>
              </motion.button>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="space-y-4"
        >
          <h2 className="text-xl font-semibold">Preferences</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-6 rounded-xl bg-card border border-border space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Sun className="size-5 text-primary" />
                  <div>
                    <h4 className="font-medium">Theme Mode</h4>
                    <p className="text-sm text-muted-foreground">Current: Dark Mode</p>
                  </div>
                </div>
                <button className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-all">
                  Toggle
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Volume2 className="size-5 text-primary" />
                  <div>
                    <h4 className="font-medium">Ambient Sounds</h4>
                    <p className="text-sm text-muted-foreground">Background audio</p>
                  </div>
                </div>
                <input type="checkbox" className="size-5 rounded accent-primary" defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bell className="size-5 text-primary" />
                  <div>
                    <h4 className="font-medium">Break Reminders</h4>
                    <p className="text-sm text-muted-foreground">Gentle notifications</p>
                  </div>
                </div>
                <input type="checkbox" className="size-5 rounded accent-primary" defaultChecked />
              </div>
            </div>

            <div className="p-6 rounded-xl bg-card border border-border space-y-4">
              <h4 className="font-medium mb-4">Focus Session Defaults</h4>

              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Focus Duration</label>
                <select className="w-full px-4 py-2 rounded-lg bg-secondary border border-border focus:border-primary outline-none">
                  <option>25 minutes (Classic Pomodoro)</option>
                  <option>50 minutes (Long Focus)</option>
                  <option>15 minutes (Quick Sprint)</option>
                </select>
              </div>

              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Break Duration</label>
                <select className="w-full px-4 py-2 rounded-lg bg-secondary border border-border focus:border-primary outline-none">
                  <option>5 minutes</option>
                  <option>10 minutes</option>
                  <option>15 minutes</option>
                </select>
              </div>

              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Default Environment</label>
                <select className="w-full px-4 py-2 rounded-lg bg-secondary border border-border focus:border-primary outline-none">
                  <option>Rainy Café</option>
                  <option>Dark Academia</option>
                  <option>Cyber Room</option>
                  <option>Forest Cabin</option>
                  <option>Space Station</option>
                </select>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="flex justify-end gap-3"
        >
          <button className="px-6 py-3 rounded-xl bg-card border border-border hover:bg-secondary transition-all">
            Reset to Default
          </button>
          <button className="px-6 py-3 rounded-xl bg-primary text-primary-foreground hover:scale-105 transition-all shadow-lg shadow-primary/25">
            Save Changes
          </button>
        </motion.div>
      </div>
    </div>
  );
}
