import { Outlet, useNavigate, useLocation } from "react-router";
import { LayoutDashboard, Target, Zap, Trophy, Settings, Brain } from "lucide-react";
import { motion } from "motion/react";
import { useAIEngine } from "./ai-engine-context";
import { AINotificationOverlay } from "./ai-notification-overlay";
import { useLocalData } from "./local-data-context";

const navItems = [
  { path: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { path: "/tasks", icon: Target, label: "Tasks" },
  { path: "/focus", icon: Zap, label: "Focus" },
  { path: "/ai", icon: Brain, label: "AI Assistant", highlight: true },
  { path: "/progress", icon: Trophy, label: "Progress" },
  { path: "/customize", icon: Settings, label: "Customize" }
];

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { insights, isAnalyzing } = useAIEngine();
  const { stats } = useLocalData();
  const urgentCount = insights.filter(i => !i.dismissed && (i.priority === "urgent" || i.priority === "high")).length;
  const xpIntoLevel = stats.xp % 500;

  return (
    <div className="flex h-screen bg-background dark">
      <motion.aside
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="w-20 lg:w-64 border-r border-border flex flex-col bg-card/30 backdrop-blur-sm"
      >
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0 shadow-lg shadow-primary/20">
              <Brain className="size-6 text-white" />
            </div>
            <div className="hidden lg:block">
              <h2 className="font-semibold">Adaptive</h2>
              <p className="text-xs text-muted-foreground">Productivity</p>
            </div>
          </div>
        </div>

        {/* AI Status Strip */}
        <div className="hidden lg:block px-4 py-3 border-b border-border/50">
          <div className="flex items-center gap-2">
            <div className={`size-2 rounded-full ${isAnalyzing ? "bg-amber-500 animate-pulse" : "bg-green-500"}`} />
            <span className="text-xs text-muted-foreground">
              {isAnalyzing ? "AI analyzing..." : "AI active · monitoring"}
            </span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1.5">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all relative ${
                  isActive
                    ? item.highlight
                      ? "bg-gradient-to-r from-primary to-accent text-white shadow-lg shadow-primary/25"
                      : "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                    : item.highlight
                      ? "hover:bg-primary/10 text-muted-foreground hover:text-primary border border-transparent hover:border-primary/20"
                      : "hover:bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                <item.icon className="size-5 shrink-0" />
                <span className="hidden lg:block font-medium">{item.label}</span>
                {item.highlight && urgentCount > 0 && !isActive && (
                  <span className="hidden lg:flex ml-auto size-5 rounded-full bg-red-500 text-white text-[10px] font-bold items-center justify-center">
                    {urgentCount}
                  </span>
                )}
                {item.highlight && urgentCount > 0 && !isActive && (
                  <span className="lg:hidden absolute -top-1 -right-1 size-3 rounded-full bg-red-500 border border-card" />
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border">
          <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 via-accent/10 to-primary/10 border border-primary/20">
            <div className="flex items-center gap-3 mb-3">
              <div className="size-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0">
                <Brain className="size-5 text-white" />
              </div>
              <div className="hidden lg:block flex-1 min-w-0">
                <h4 className="font-medium truncate">You</h4>
                <p className="text-xs text-muted-foreground">Level {stats.level} · {stats.xp.toLocaleString()} XP</p>
              </div>
            </div>
            <div className="hidden lg:block">
              <div className="h-2 rounded-full bg-secondary overflow-hidden">
                <div className="h-full bg-gradient-to-r from-primary to-accent rounded-full" style={{ width: `${(xpIntoLevel / 500) * 100}%` }} />
              </div>
            </div>
          </div>
        </div>
      </motion.aside>

      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>

      <AINotificationOverlay />
    </div>
  );
}