import { motion, AnimatePresence } from "motion/react";
import { Flame, Brain, Target, TrendingUp, Calendar, Clock, Zap, Play, ChevronRight, Sparkles, Trophy, Activity, CheckCircle2, AlertCircle, Link2, ArrowRight, RefreshCw, BookOpen, X } from "lucide-react";
import { useNavigate } from "react-router";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { useState } from "react";
import { useAIEngine, canvasCourses } from "./ai-engine-context";
import { useCustomization } from "./customization-context";

const focusData = [
  { day: "Mon", hours: 3.5 },
  { day: "Tue", hours: 4.2 },
  { day: "Wed", hours: 2.8 },
  { day: "Thu", hours: 5.1 },
  { day: "Fri", hours: 3.9 },
  { day: "Sat", hours: 6.2 },
  { day: "Sun", hours: 4.5 }
];

const initialTasks = [
  { id: 1, title: "COSC125 Assignment 3", due: "Tomorrow", priority: "high", energy: "Deep Work", duration: "2h", courseColor: "#6366f1", aiScheduled: "Tonight 7–9 PM" },
  { id: 2, title: "Read Chapter 7 - Biology", due: "In 2 days", priority: "medium", energy: "Medium Focus", duration: "1h", courseColor: "#10b981", aiScheduled: "Fri 8–9 PM" },
  { id: 3, title: "Math Practice Problems", due: "In 3 days", priority: "medium", energy: "Deep Work", duration: "1.5h", courseColor: "#f59e0b", aiScheduled: "Fri 6–7 PM" },
  { id: 4, title: "Essay Outline - English", due: "Next Week", priority: "low", energy: "Low Energy", duration: "45m", courseColor: "#ec4899", aiScheduled: "Mon 5–6 PM" }
];

function WorkloadHeatmap({ days }: { days: ReturnType<typeof useAIEngine>["workloadByDay"] }) {
  return (
    <div className="flex gap-2">
      {days.map(day => {
        const color = day.workloadScore > 70 ? "bg-red-500" : day.workloadScore > 45 ? "bg-amber-500" : "bg-green-500";
        return (
          <div key={day.day} className="flex-1 text-center group relative">
            <div className="relative">
              <motion.div
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className={`h-12 rounded-lg ${color} origin-bottom`}
                style={{ opacity: Math.max(0.2, day.workloadScore / 100) }}
              />
              {day.deadlines > 0 && (
                <div className="absolute -top-1 -right-1 size-3.5 rounded-full bg-red-500 border border-background flex items-center justify-center">
                  <span className="text-[8px] text-white font-bold">{day.deadlines}</span>
                </div>
              )}
            </div>
            <div className="text-[10px] text-muted-foreground mt-1">{day.day}</div>
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
              <div className="bg-card border border-border rounded-lg px-2 py-1.5 text-xs whitespace-nowrap shadow-xl">
                <div className="font-medium">{day.label}</div>
                <div className="text-muted-foreground">{day.totalHoursNeeded.toFixed(1)}h study needed</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function DashboardPage() {
  const { savedMode } = useCustomization();
  const navigate = useNavigate();
  const { insights, workloadByDay, adaptedPomoDuration, integrations, isAnalyzing, triggerRescan, dismissInsight } = useAIEngine();
  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? "Good morning" : currentHour < 18 ? "Good afternoon" : "Good evening";
  const activeInsights = insights.filter(i => !i.dismissed).slice(0, 3);

  const [tasks, setTasks] = useState(initialTasks);
  const [completedIds, setCompletedIds] = useState<Set<number>>(new Set());

  const toggleTask = (id: number) => {
    setCompletedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const deleteTask = (id: number) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    setCompletedIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  return (
    <div className={`min-h-screen bg-background text-foreground p-6 transition-all duration-500 ${
      savedMode === "competitive" ? "font-semibold tracking-tight" :
      savedMode === "cozy"        ? "font-light" :
                                    "font-medium"
    }`}>
      <div className="max-w-7xl mx-auto space-y-6">

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-1">{greeting}, Alex</h1>
            <p className="text-muted-foreground">
              {savedMode === "cozy"        ? "Ready when you are 🌿 You have 3 deadlines this week." :
              savedMode === "competitive" ? "Let's crush it today ⚡ 3 deadlines to destroy this week." :
                                            "Your study group is active 👥 3 deadlines on deck this week."}
            </p>
          </div>
          <button
            onClick={triggerRescan}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-card border border-border hover:border-primary/50 text-sm transition-all"
          >
            <RefreshCw className={`size-4 ${isAnalyzing ? "animate-spin text-primary" : "text-muted-foreground"}`} />
            <span className="hidden sm:block">{isAnalyzing ? "Analyzing..." : "Re-scan"}</span>
          </button>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <div className="flex items-center gap-3 flex-wrap">
            {integrations.map(int => (
              <div key={int.name} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-card border border-border text-xs">
                <Link2 className="size-3" />
                <span>{int.name}</span>
                <span className={`size-2 rounded-full ${int.status === "connected" ? "bg-green-500" : int.status === "syncing" ? "bg-amber-500 animate-pulse" : "bg-red-500"}`} />
              </div>
            ))}
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="lg:col-span-2 space-y-6">

            <button
              onClick={() => navigate("/focus")}
              className="w-full group relative overflow-hidden p-8 rounded-2xl bg-gradient-to-br from-primary/20 via-accent/20 to-primary/20 border border-primary/30 hover:scale-[1.01] transition-all"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-accent/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="size-14 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/25">
                    <Play className="size-7 text-white fill-white" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-2xl font-bold mb-1">Start Focus Session</h3>
                    <div className="flex items-center gap-3">
                      <p className="text-sm text-muted-foreground">AI recommends:</p>
                      <span className="text-sm text-primary font-medium">COSC125 · {adaptedPomoDuration}m session</span>
                    </div>
                  </div>
                </div>
                <ChevronRight className="size-8 text-muted-foreground group-hover:translate-x-2 transition-transform" />
              </div>
            </button>

            <div className="p-6 rounded-2xl bg-card border border-border">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold">Weekly Workload</h2>
                  <p className="text-xs text-muted-foreground">Calculated from Canvas deadlines + calendar</p>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><span className="size-2 rounded-sm bg-green-500 inline-block" /> Light</span>
                  <span className="flex items-center gap-1"><span className="size-2 rounded-sm bg-amber-500 inline-block" /> Moderate</span>
                  <span className="flex items-center gap-1"><span className="size-2 rounded-sm bg-red-500 inline-block" /> Heavy</span>
                </div>
              </div>
              <WorkloadHeatmap days={workloadByDay} />
            </div>

            <div className="p-6 rounded-2xl bg-card border border-border">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-xl font-semibold">Today's Tasks</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Click to complete · hover to delete</p>
                </div>
                <button onClick={() => navigate("/tasks")} className="text-sm text-primary hover:underline flex items-center gap-1">
                  View all <ChevronRight className="size-4" />
                </button>
              </div>
              <AnimatePresence>
                <div className="space-y-3">
                  {tasks.map((task, i) => {
                    const done = completedIds.has(task.id);
                    return (
                      <motion.div
                        key={task.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: done ? 0.5 : 1, x: 0 }}
                        exit={{ opacity: 0, height: 0, marginTop: 0 }}
                        transition={{ delay: done ? 0 : i * 0.07 }}
                        layout
                        className={`group p-4 rounded-xl border transition-all ${done ? "bg-secondary/10 border-border/50" : "bg-secondary/30 border-border hover:border-primary/40"}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-0.5 self-stretch rounded-full mt-1" style={{ background: task.courseColor }} />
                          <button
                            onClick={() => toggleTask(task.id)}
                            className={`mt-0.5 size-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${done ? "border-green-500 bg-green-500/20" : "border-border hover:border-primary"}`}
                          >
                            {done && <CheckCircle2 className="size-3 text-green-500" />}
                          </button>
                          <div className="flex-1 min-w-0">
                            <h4 className={`font-medium mb-1 ${done ? "line-through text-muted-foreground" : ""}`}>{task.title}</h4>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                              <span className="flex items-center gap-1"><Calendar className="size-3" />{task.due}</span>
                              <span className="flex items-center gap-1"><Clock className="size-3" />{task.duration}</span>
                              {!done && (
                                <span className={`px-2 py-0.5 rounded-full ${task.energy === "Deep Work" ? "bg-primary/20 text-primary" : task.energy === "Medium Focus" ? "bg-accent/20 text-accent" : "bg-muted/50 text-muted-foreground"}`}>
                                  {task.energy}
                                </span>
                              )}
                            </div>
                          </div>
                          {!done && (
                            <div className="flex items-center gap-1 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                              <Sparkles className="size-3" />
                              <span>{task.aiScheduled}</span>
                            </div>
                          )}
                          <button
                            onClick={() => deleteTask(task.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-destructive/20 hover:text-destructive text-muted-foreground shrink-0"
                          >
                            <X className="size-4" />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                  {tasks.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      <CheckCircle2 className="size-8 mx-auto mb-2 text-green-500 opacity-50" />
                      All tasks cleared!
                    </div>
                  )}
                </div>
              </AnimatePresence>
            </div>

            <div className="p-6 rounded-2xl bg-card border border-border">
              <h2 className="text-xl font-semibold mb-6">This Week's Focus</h2>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={focusData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="day" stroke="var(--color-muted-foreground)" />
                  <YAxis stroke="var(--color-muted-foreground)" />
                  <Bar dataKey="hours" fill="var(--color-primary)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="space-y-6">

            <div className="grid grid-cols-2 gap-4">
              <div className="p-5 rounded-xl bg-gradient-to-br from-orange-500/10 to-orange-600/10 border border-orange-500/20">
                <Flame className="size-8 text-orange-500 mb-3" />
                <div className="text-3xl font-bold mb-1">12</div>
                <div className="text-sm text-muted-foreground">Day Streak</div>
              </div>
              <div className="p-5 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20">
                <Zap className="size-8 text-primary mb-3" />
                <div className="text-3xl font-bold mb-1">4.2h</div>
                <div className="text-sm text-muted-foreground">Today</div>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-gradient-to-br from-primary/5 via-accent/5 to-primary/5 border border-primary/20">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Brain className="size-5 text-primary" />
                  <h3 className="font-semibold">AI Insights</h3>
                </div>
                <button onClick={() => navigate("/ai")} className="text-xs text-primary hover:underline flex items-center gap-0.5">
                  All <ArrowRight className="size-3" />
                </button>
              </div>
              <div className="space-y-3">
                <AnimatePresence>
                  {activeInsights.map((insight, i) => {
                    const icons: Record<string, any> = { schedule: Clock, deadline: AlertCircle, optimization: TrendingUp, burnout: Activity, celebration: Zap, integration: Link2 };
                    const Icon = icons[insight.type] ?? Sparkles;
                    const iconColor = insight.priority === "urgent" ? "text-red-400" : insight.priority === "high" ? "text-amber-400" : insight.type === "optimization" ? "text-green-400" : "text-primary";
                    return (
                      <motion.div
                        key={insight.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="p-3 rounded-xl bg-card/60 backdrop-blur-sm border border-border/60 group"
                      >
                        <div className="flex items-start gap-2">
                          <Icon className={`size-4 mt-0.5 shrink-0 ${iconColor}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium mb-0.5">{insight.title}</p>
                            <p className="text-xs text-muted-foreground line-clamp-2">{insight.body}</p>
                          </div>
                          <button onClick={() => dismissInsight(insight.id)} className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            <X className="size-3.5 text-muted-foreground hover:text-foreground transition-colors" />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
                {activeInsights.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-2">All insights reviewed ✓</p>
                )}
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-card border border-border">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <BookOpen className="size-4 text-primary" />
                Canvas Deadlines
              </h3>
              <div className="space-y-2">
                {canvasCourses.flatMap(c => c.assignments.filter(a => !a.submitted).map(a => ({ ...a, courseColor: c.color, courseName: c.id.toUpperCase() }))).slice(0, 4).map(a => {
                  const dueDate = new Date(a.due);
                  const today = new Date("2026-05-28");
                  const diff = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                  const urgent = diff <= 1;
                  return (
                    <div key={a.id} className="flex items-center gap-2">
                      <div className="size-2 rounded-full shrink-0" style={{ background: a.courseColor }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{a.title}</p>
                        <p className="text-xs text-muted-foreground">{a.courseName}</p>
                      </div>
                      <span className={`text-xs font-medium shrink-0 ${urgent ? "text-red-400" : "text-muted-foreground"}`}>
                        {diff === 0 ? "Today" : diff === 1 ? "Tomorrow" : `${diff}d`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <button
              onClick={() => navigate("/progress")}
              className="w-full p-4 rounded-xl bg-card border border-border hover:border-primary/50 transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <Trophy className="size-6 text-primary" />
                <div className="text-left">
                  <div className="font-semibold">Level 8</div>
                  <div className="text-xs text-muted-foreground">1,240 / 2,000 XP</div>
                </div>
              </div>
              <ChevronRight className="size-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
