import { motion, AnimatePresence } from "motion/react";
import { Play, Pause, SkipForward, Settings, Volume2, X, ChevronLeft, Brain, Sparkles, Activity, Clock, CheckCircle2, AlertCircle, Zap } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { useAIEngine, productivityPatterns } from "./ai-engine-context";
import { useCustomization } from "./customization-context";

const environments = [
  { id: "cafe", name: "Rainy Café", image: "https://images.unsplash.com/photo-1739918069081-78dddf3240a6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1920" },
  { id: "academia", name: "Dark Academia", image: "https://images.unsplash.com/photo-1530984794059-26f732e6b7ab?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1920" },
  { id: "cyber", name: "Cyber Room", image: "https://images.unsplash.com/photo-1510519138101-570d1dca3d66?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1920" },
  { id: "forest", name: "Forest Cabin", image: "https://images.unsplash.com/photo-1769643207226-dcc20cbe7d70?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1920" },
  { id: "space", name: "Space Station", image: "https://images.unsplash.com/photo-1548123325-525b8e0cde7c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1920" }
];

const currentTasks = [
  { id: 1, title: "COSC125 Assignment 3", course: "COSC125", courseColor: "#6366f1" },
  { id: 2, title: "Math Problem Set 8", course: "MATH210", courseColor: "#f59e0b" },
  { id: 3, title: "Physics Lab Report", course: "PHYS110", courseColor: "#8b5cf6" },
];

interface SessionEntry {
  taskTitle: string;
  durationMin: number;
  completedAt: Date;
}

export function FocusSessionPage() {
  const { savedMode, savedSettings } = useCustomization();
  const navigate = useNavigate();
  const { burnoutRisk, adaptedPomoDuration, insights } = useAIEngine();

  const currentHour = new Date().getHours();
  const focusScore = productivityPatterns.focusScoreByHour[currentHour as keyof typeof productivityPatterns.focusScoreByHour] ?? 60;
  const inPeakWindow = productivityPatterns.peakHours.includes(currentHour);

  const [isRunning, setIsRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(adaptedPomoDuration * 60);
  // Use savedSettings not draft so environment only updates after Save Changes
  const savedEnv = environments.find(e => e.id === savedSettings.environmentId) ?? environments[0];
  const [selectedEnv, setSelectedEnv] = useState(savedEnv);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedTask, setSelectedTask] = useState(currentTasks[0]);
  const [mode, setMode] = useState<"focus" | "break">("focus");
  const [sessionCount, setSessionCount] = useState(0);
  const [sessionLog, setSessionLog] = useState<SessionEntry[]>([]);
  const [showBurnoutWarning, setShowBurnoutWarning] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(false);
  // Start with saved preference, not AI duration
  const [useAdaptedDuration, setUseAdaptedDuration] = useState(false);
  // Default custom duration reads from user's saved preference
  const [customDuration, setCustomDuration] = useState(parseInt(savedSettings.focusDuration));
  const hasShownBurnoutWarning = useRef(false);
  const [showBreakReminder, setShowBreakReminder] = useState(false);
  const [showBreakStarted, setShowBreakStarted] = useState(false);

  // Read focus and break duration from saved user preferences
  const savedFocusMins = parseInt(savedSettings.focusDuration);
  const savedBreakMins = parseInt(savedSettings.breakDuration);
  const focusDuration = (useAdaptedDuration ? adaptedPomoDuration : savedFocusMins) * 60;
  const breakDuration = (sessionCount >= 3 ? 20 : savedBreakMins) * 60;

  useEffect(() => {
    setTimeLeft(focusDuration);
  }, [useAdaptedDuration, customDuration, adaptedPomoDuration]);

  useEffect(() => {
    // Show burnout warning if risk is high and 3+ sessions done
    if (burnoutRisk > 55 && sessionCount >= 3 && !hasShownBurnoutWarning.current) {
      setShowBurnoutWarning(true);
      hasShownBurnoutWarning.current = true;
    }
  }, [sessionCount, burnoutRisk]);

  // Break reminder — fires 5 mins before break and when break starts
// Only runs if user has break reminders enabled in preferences
useEffect(() => {
  if (!savedSettings.breakReminders) return;

  // 5 minutes warning before focus ends
  if (mode === "focus" && isRunning && timeLeft === 5 * 60) {
    setShowBreakReminder(true);
    setTimeout(() => setShowBreakReminder(false), 8000);
  }

  // Break just started
  if (mode === "break" && timeLeft === breakDuration) {
    setShowBreakStarted(true);
    setTimeout(() => setShowBreakStarted(false), 8000);
  }
}, [timeLeft, mode, isRunning, savedSettings.breakReminders, breakDuration]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (timeLeft === 0) {
      if (mode === "focus") {
        setSessionCount(c => c + 1);
        setSessionLog(log => [...log, { taskTitle: selectedTask.title, durationMin: useAdaptedDuration ? adaptedPomoDuration : customDuration, completedAt: new Date() }]);
        setMode("break");
        setTimeLeft(breakDuration);
      } else {
        setMode("focus");
        setTimeLeft(focusDuration);
      }
      setIsRunning(false);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [isRunning, timeLeft, mode, focusDuration, breakDuration, selectedTask, adaptedPomoDuration, customDuration, useAdaptedDuration]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const duration = mode === "focus" ? focusDuration : breakDuration;
  const progress = ((duration - timeLeft) / duration) * 100;

  const toggleTimer = () => setIsRunning(!isRunning);
  const skipSession = () => {
    if (mode === "focus") { setMode("break"); setTimeLeft(breakDuration); }
    else { setMode("focus"); setTimeLeft(focusDuration); }
    setIsRunning(false);
  };

  const aiCheckIn = insights.find(i => !i.dismissed && i.type === "burnout");

  return (
    <div className={`relative min-h-screen overflow-hidden transition-all duration-500 ${
      savedMode === "competitive" ? "font-semibold" :
      savedMode === "cozy"        ? "font-light" :
                                    "font-medium"
    }`}>
      {/* Background */}
      <motion.div key={selectedEnv.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0">
        <img src={selectedEnv.image} alt={selectedEnv.name} className="size-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/80 to-background/95" />
      </motion.div>

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Nav */}
        <nav className="p-6 flex items-center justify-between">
          <button onClick={() => navigate("/dashboard")} className="p-2 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-all">
            <ChevronLeft className="size-5 text-white" />
          </button>

          {/* AI Status Pill */}
          <button
            onClick={() => setShowAIPanel(!showAIPanel)}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-all"
          >
            <div className="size-2 rounded-full bg-primary animate-pulse" />
            <Brain className="size-4 text-white" />
            <span className="text-sm font-medium text-white">AI Active</span>
          </button>

          <div className="flex items-center gap-3">
            <button onClick={() => setShowSettings(!showSettings)} className="p-2 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-all">
              <Settings className="size-5 text-white" />
            </button>
            <button className="p-2 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-all">
              <Volume2 className="size-5 text-white" />
            </button>
          </div>
        </nav>

        {/* AI Check-in Banner */}
        <AnimatePresence>
          {aiCheckIn && isRunning && sessionCount === 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mx-6 mb-2 p-3 rounded-xl bg-card/40 backdrop-blur-sm border border-primary/20 flex items-center gap-2"
            >
              <Sparkles className="size-4 text-primary shrink-0" />
              <p className="text-xs text-muted-foreground flex-1">{aiCheckIn.body}</p>
              <button onClick={() => {}} className="text-xs text-primary shrink-0">OK</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 5 minute warning banner */}
        <AnimatePresence>
          {showBreakReminder && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mx-6 mb-2 p-3 rounded-xl bg-amber-500/20 backdrop-blur-sm border border-amber-500/30 flex items-center gap-2"
            >
              <AlertCircle className="size-4 text-amber-400 shrink-0" />
              <p className="text-xs text-amber-200 flex-1">⏰ Break in 5 minutes — finish up your current thought</p>
              <button onClick={() => setShowBreakReminder(false)} className="text-xs text-amber-400 shrink-0">OK</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Break started banner */}
        <AnimatePresence>
          {showBreakStarted && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mx-6 mb-2 p-3 rounded-xl bg-green-500/20 backdrop-blur-sm border border-green-500/30 flex items-center gap-2"
            >
              <Activity className="size-4 text-green-400 shrink-0" />
              <p className="text-xs text-green-200 flex-1">
                {[
                  "🍫 Go treat yourself to some chocolate, you earned it!",
                  "📱 Doomscroll guilt-free for 5 minutes, we won't judge.",
                  "🚶 Take a little walk, even just to the kitchen and back.",
                  "💧 Hydrate! Your brain is basically a wrinkly water balloon.",
                  "🐱 Go pet an animal if one is nearby. Mandatory.",
                  "🪟 Stare out a window and think about absolutely nothing.",
                  "🧃 Snack time. You studied hard, you deserve it.",
                ][Math.floor(Math.random() * 7)]}
              </p>
              <button onClick={() => setShowBreakStarted(false)} className="text-xs text-green-400 shrink-0">OK</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* AI Panel Dropdown */}
        <AnimatePresence>
          {showAIPanel && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-20 left-1/2 -translate-x-1/2 w-full max-w-md z-30 px-6"
            >
              <div className="p-5 rounded-2xl bg-card/95 backdrop-blur-xl border border-border shadow-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Brain className="size-5 text-primary" />
                    <span className="font-semibold">AI Session Assistant</span>
                  </div>
                  <button onClick={() => setShowAIPanel(false)}>
                    <X className="size-4 text-muted-foreground" />
                  </button>
                </div>

                {/* Session Stats */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Sessions Today", value: sessionCount + productivityPatterns.recentSessionLog[0].sessions, icon: Zap, color: "text-primary" },
                    { label: "Session Duration", value: `${useAdaptedDuration ? adaptedPomoDuration : customDuration}m`, icon: Clock, color: "text-accent" },
                  ].map(stat => (
                    <div key={stat.label} className="p-3 rounded-xl bg-secondary text-center">
                      <stat.icon className={`size-4 mx-auto mb-1 ${stat.color}`} />
                      <div className={`font-bold text-sm ${stat.color}`}>{stat.value}</div>
                      <div className="text-xs text-muted-foreground">{stat.label}</div>
                    </div>
                  ))}
                </div>

                {/* Adapted Duration Info */}
                <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="size-4 text-primary" />
                    <span className="text-sm font-medium">AI-Adapted Duration: {adaptedPomoDuration} minutes</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {inPeakWindow
                      ? `Extended to ${adaptedPomoDuration}m — you're in your peak focus window (${focusScore}/100 score). Deep work tasks benefit from longer sessions.`
                      : `Set to ${adaptedPomoDuration}m — moderate focus period. AI will extend if you enter peak hours (7–10 PM).`
                    }
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      onClick={() => setUseAdaptedDuration(true)}
                      className={`text-xs px-3 py-1.5 rounded-lg transition-all ${useAdaptedDuration ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
                    >
                      Use AI ({adaptedPomoDuration}m)
                    </button>
                    <button
                      onClick={() => setUseAdaptedDuration(false)}
                      className={`text-xs px-3 py-1.5 rounded-lg transition-all ${!useAdaptedDuration ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
                    >
                      Custom
                    </button>
                    {!useAdaptedDuration && (
                      <input
                        type="number"
                        value={customDuration}
                        onChange={e => setCustomDuration(Math.max(5, Math.min(60, parseInt(e.target.value) || 25)))}
                        className="w-16 px-2 py-1.5 rounded-lg bg-secondary border border-border text-xs text-center outline-none focus:border-primary"
                        min={5} max={60}
                      />
                    )}
                  </div>
                </div>

                {/* Today's session log */}
                {sessionLog.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Today's Sessions</p>
                    <div className="space-y-1.5">
                      {sessionLog.map((entry, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          <CheckCircle2 className="size-3 text-green-500 shrink-0" />
                          <span className="flex-1 truncate text-muted-foreground">{entry.taskTitle}</span>
                          <span className="text-muted-foreground">{entry.durationMin}m</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Settings Panel */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-20 right-6 p-6 rounded-2xl bg-black/80 backdrop-blur-xl border border-white/20 shadow-2xl max-w-sm w-full z-30"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-white">Environment</h3>
                <button onClick={() => setShowSettings(false)}>
                  <X className="size-5 text-muted-foreground hover:text-foreground" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {environments.map(env => (
                  <button
                    key={env.id}
                    onClick={() => { setSelectedEnv(env); setShowSettings(false); }}
                    className={`relative rounded-xl overflow-hidden border-2 transition-all ${selectedEnv.id === env.id ? "border-primary scale-105" : "border-transparent hover:border-border"}`}
                  >
                    <img src={env.image} alt={env.name} className="w-full h-24 object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/40 to-transparent flex items-end p-2">
                      <span className="text-xs font-medium text-white">{env.name}</span>
                    </div>
                  </button>
                ))}
              </div>

              {/* Task Switcher */}
              <div className="mt-4 border-t border-border pt-4">
                <h4 className="text-sm font-medium mb-3 text-white">Current Task</h4>
                <div className="space-y-2">
                  {currentTasks.map(task => (
                    <button
                      key={task.id}
                      onClick={() => { setSelectedTask(task); setShowSettings(false); }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center gap-2 ${selectedTask.id === task.id ? "bg-primary/20 border border-primary/40" : "bg-secondary hover:bg-secondary/80"}`}
                    >
                      <div className="size-2 rounded-full shrink-0" style={{ background: task.courseColor }} />
                      <span className="flex-1 truncate text-white/90">{task.title}</span>
                      {selectedTask.id === task.id && <CheckCircle2 className="size-4 text-primary shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Timer */}
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="text-center space-y-10 max-w-2xl w-full">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}>
              <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-card/30 backdrop-blur-sm border border-border/50 mb-6">
                <div className={`size-2 rounded-full ${isRunning ? "bg-green-500 animate-pulse" : "bg-muted-foreground"}`} />
                <span className="text-sm font-medium">{mode === "focus" ? "Focus Session" : sessionCount >= 3 ? "Long Break" : "Short Break"}</span>
                <span className="text-xs text-muted-foreground">· Session {sessionCount + 1}</span>
              </div>
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="size-2 rounded-full shrink-0" style={{ background: selectedTask.courseColor }} />
                <h2 className="text-2xl text-white/90 drop-shadow-md">{selectedTask.title}</h2>
              </div>
              {inPeakWindow && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center justify-center gap-1.5 text-xs text-primary"
                >
                  <Zap className="size-3 fill-primary" />
                  Peak Focus Window · AI extended to {adaptedPomoDuration}m
                </motion.div>
              )}
            </motion.div>

            {/* Circle Timer */}
            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }} className="relative">
              <svg className="size-80 mx-auto -rotate-90">
                <circle cx="160" cy="160" r="140" stroke="var(--color-border)" strokeWidth="8" fill="none" opacity="0.3" />
                <motion.circle
                  cx="160" cy="160" r="140"
                  stroke={mode === "focus" ? "var(--color-primary)" : "var(--color-accent)"}
                  strokeWidth="8" fill="none" strokeLinecap="round"
                  animate={{ pathLength: progress / 100 }}
                  transition={{ duration: 0.5 }}
                  style={{
                    strokeDasharray: 2 * Math.PI * 140,
                    filter: `drop-shadow(0 0 20px ${mode === "focus" ? "var(--glow-blue)" : "var(--glow-purple)"})`
                  }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-8xl font-bold tabular-nums tracking-tight text-white drop-shadow-lg">
                    {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
                  </div>
                  <div className="text-sm text-white/70 mt-2 drop-shadow-md">
                    {mode === "focus" ? "Until break" : "Until next focus"}
                </div>
                  {isRunning && (
                    <div className="mt-2 flex items-center justify-center gap-1 text-xs text-primary">
                      <Brain className="size-3" />
                      <span>AI monitoring</span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Controls */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="flex items-center justify-center gap-4">
              <button onClick={skipSession} className="p-4 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 hover:scale-110 transition-all">
                <SkipForward className="size-6 text-white" />
              </button>
              <button
                onClick={toggleTimer}
                className="p-8 rounded-full bg-gradient-to-br from-primary to-accent shadow-2xl shadow-primary/50 hover:scale-110 transition-all"
              >
                {isRunning ? <Pause className="size-10 text-white fill-white" /> : <Play className="size-10 text-white fill-white ml-1" />}
              </button>
              <button onClick={() => setShowAIPanel(!showAIPanel)} className="p-4 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 hover:scale-110 transition-all">
                <Brain className="size-6 text-white" />
              </button>
            </motion.div>

            {/* Break message */}
            <AnimatePresence>
              {mode === "break" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="p-4 rounded-xl bg-accent/10 border border-accent/20"
                >
                  <p className="text-sm text-muted-foreground">
                    {sessionCount >= 4
                      ? "Outstanding! You've completed 4 focus sessions. AI recommends a 20-minute restorative break — stretch, hydrate, and step outside if possible."
                      : "Great work! Take a moment to stretch, hydrate, and rest your eyes. AI will notify you when it's time to refocus."
                    }
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 flex items-center justify-between">
          <div className="px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20">
            <span className="text-sm text-white/80">Environment: {selectedEnv.name}</span>
          </div>
          {sessionLog.length > 0 && (
            <div className="px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center gap-2">
              <CheckCircle2 className="size-4 text-green-400" />
              <span className="text-sm text-white/80">{sessionLog.length} session{sessionLog.length > 1 ? "s" : ""} completed</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
