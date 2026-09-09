import { Outlet, useNavigate, useLocation } from "react-router";
import { Target, Zap, Settings, Brain } from "lucide-react";
import { motion } from "motion/react";
import { useAIEngine } from "./ai-engine-context";
import { AINotificationOverlay } from "./ai-notification-overlay";
import { ProdigyMark } from "./prodigy-mark";

const navItems = [
  { path: "/tasks", icon: Target, label: "Tasks" },
  { path: "/focus", icon: Zap, label: "Focus" },
  { path: "/ai", icon: Brain, label: "Prodigy - AI Assistant", highlight: true },
  { path: "/settings", icon: Settings, label: "Settings" }
];

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { insights, isAnalyzing } = useAIEngine();
  const urgentCount = insights.filter(i => !i.dismissed && (i.priority === "urgent" || i.priority === "high")).length;

  return (
    <div className="flex h-screen bg-background dark">
      <motion.aside
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="w-20 lg:w-64 border-r border-border flex flex-col bg-card/30 backdrop-blur-sm"
      >
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <ProdigyMark size={30} className="shrink-0 text-foreground" />
            <h2 className="hidden lg:block font-bold text-xl tracking-tight text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              prodigy
            </h2>
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
      </motion.aside>

      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>

      <AINotificationOverlay />
    </div>
  );
}
