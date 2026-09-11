import { motion } from "motion/react";
import { X, ChevronRight, Sparkles, AlertCircle, TrendingUp, Clock } from "lucide-react";
import { type AIInsight } from "./ai-engine-context";
import { useNavigate } from "react-router";
import { ProdigyMark } from "./prodigy-mark";

const iconMap: Record<string, any> = {
  schedule: Clock,
  deadline: AlertCircle,
  optimization: TrendingUp,
  burnout: AlertCircle,
  celebration: Sparkles,
  integration: ProdigyMark,
};

function NotificationCard({ insight, onDismiss }: { insight: AIInsight; onDismiss: () => void }) {
  const navigate = useNavigate();
  const Icon = iconMap[insight.type] ?? Sparkles;

  const priorityStyle = {
    urgent: "border-red-500/40 bg-red-500/5 shadow-red-500/10",
    high: "border-amber-500/40 bg-amber-500/5 shadow-amber-500/10",
    medium: "border-primary/30 bg-card/95",
    low: "border-border/60 bg-card/90",
  }[insight.priority];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 60, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 60, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className={`relative w-80 rounded-xl border backdrop-blur-xl shadow-2xl overflow-hidden ${priorityStyle}`}
    >
      {/* Glow pulse for urgent */}
      {insight.priority === "urgent" && (
        <div className="absolute inset-0 rounded-xl ring-1 ring-red-500/40 animate-pulse pointer-events-none" />
      )}

      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className={`size-8 rounded-lg flex items-center justify-center shrink-0 ${
            insight.priority === "urgent" ? "bg-red-500/20" :
            insight.priority === "high" ? "bg-amber-500/20" :
            "bg-primary/15"
          }`}>
            <Icon className={`size-4 ${
              insight.priority === "urgent" ? "text-red-400" :
              insight.priority === "high" ? "text-amber-400" :
              "text-primary"
            }`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-1.5 mb-0.5">
                <div className="size-1.5 rounded-full bg-primary animate-pulse" />
                <span className="text-xs text-primary font-medium">AI Assistant</span>
              </div>
              <button onClick={onDismiss} className="shrink-0 p-0.5 rounded hover:bg-secondary transition-colors">
                <X className="size-3.5 text-muted-foreground" />
              </button>
            </div>
            <p className="text-sm font-semibold leading-snug">{insight.title}</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">{insight.body}</p>
          </div>
        </div>

        {insight.actionLabel && (
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={() => { navigate("/ai"); onDismiss(); }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs hover:opacity-90 transition-all"
            >
              {insight.actionLabel}
              <ChevronRight className="size-3" />
            </button>
            <button onClick={onDismiss} className="px-3 py-1.5 rounded-lg bg-secondary text-muted-foreground text-xs hover:text-foreground transition-all">
              Later
            </button>
            <div className="ml-auto text-xs text-muted-foreground">{insight.confidence}%</div>
          </div>
        )}
      </div>

      {/* Bottom confidence bar */}
      <div className="h-0.5 bg-secondary">
        <div className="h-full bg-gradient-to-r from-primary to-accent" style={{ width: `${insight.confidence}%` }} />
      </div>
    </motion.div>
  );
}

// Disabled — the drip-feed toast queue below was judged too noisy/distracting
// in practice and turned off, kept here (unreachable, past the early return)
// in case the notification design comes back later rather than being
// rewritten from scratch. Its "analyzing" indicator referenced a fake
// timer-driven status that's since been removed for real everywhere else.
export function AINotificationOverlay() {
  return null;
}
