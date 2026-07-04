import { motion, AnimatePresence } from "motion/react";
import { Play, ChevronRight, RefreshCw, CheckCircle2, Plus, X, Lightbulb } from "lucide-react";
import { useNavigate } from "react-router";
import { useState } from "react";
import { useAIEngine } from "./ai-engine-context";

let nextId = 100;

const initialTasks = [
  { id: 1, title: "COSC125 Assignment 3", due: "Tomorrow", priority: "high", duration: "2h" },
  { id: 2, title: "Read Chapter 7 - Biology", due: "In 2 days", priority: "medium", duration: "1h" },
  { id: 3, title: "Math Practice Problems", due: "In 3 days", priority: "medium", duration: "1.5h" },
  { id: 4, title: "Essay Outline - English", due: "In 6 days", priority: "low", duration: "45m" }
];

function WeekAhead({ days }: { days: ReturnType<typeof useAIEngine>["workloadByDay"] }) {
  const busiest = days.reduce((max, d) => (d.workloadScore > max.workloadScore ? d : max), days[0]);
  return (
    <div className="p-4 rounded-xl bg-card border border-border">
      <h3 className="text-sm font-medium mb-0.5">Week ahead</h3>
      <p className="text-xs text-muted-foreground mb-3">{busiest?.label ?? "This week"} looks busiest</p>
      <div className="flex justify-between">
        {days.map(day => {
          const color = day.workloadScore > 70 ? "bg-red-500" : day.workloadScore > 45 ? "bg-amber-500" : "bg-green-500";
          const isBusiest = day.day === busiest?.day;
          return (
            <div key={day.day} className="text-center">
              <div className={`size-5 rounded-md ${color}`} title={`${day.label}: ${day.totalHoursNeeded.toFixed(1)}h needed`} />
              <div className={`text-[10px] mt-1 ${isBusiest ? "text-foreground font-medium" : "text-muted-foreground"}`}>{day.day.slice(0, 1)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { insights, workloadByDay, adaptedPomoDuration, isAnalyzing, triggerRescan, dismissInsight } = useAIEngine();
  const topInsight = insights.find(i => !i.dismissed);

  const [tasks, setTasks] = useState(initialTasks);
  const [checkedIds, setCheckedIds] = useState<Set<number>>(new Set());
  const [showAddInput, setShowAddInput] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");

  // Checking a task off marks it briefly, then removes it from the list entirely.
  const completeTask = (id: number) => {
    setCheckedIds(prev => new Set(prev).add(id));
    setTimeout(() => {
      setTasks(prev => prev.filter(t => t.id !== id));
      setCheckedIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 450);
  };

  const deleteTask = (id: number) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const addTask = () => {
    const title = newTaskTitle.trim();
    if (!title) {
      setShowAddInput(false);
      return;
    }
    setTasks(prev => [{ id: nextId++, title, due: "Today", priority: "high", duration: "" }, ...prev]);
    setNewTaskTitle("");
    setShowAddInput(false);
  };

  const todayTasks = tasks.filter(t => t.priority === "high");
  const laterTasks = tasks.filter(t => t.priority !== "high");
  const upNext = tasks[0];

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <div className="max-w-6xl mx-auto space-y-4">

        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
            {todayTasks.length > 0 && ` · ${todayTasks.length} due today`}
          </p>
          <button
            onClick={triggerRescan}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-card border border-border hover:border-primary/50 text-sm transition-all"
          >
            <RefreshCw className={`size-4 ${isAnalyzing ? "animate-spin text-primary" : "text-muted-foreground"}`} />
            <span className="hidden sm:block">{isAnalyzing ? "Analyzing..." : "Re-scan"}</span>
          </button>
        </div>

        {upNext ? (
          <button
            onClick={() => navigate("/focus")}
            className="w-full text-left flex items-center justify-between p-5 rounded-2xl bg-card border border-border hover:border-primary/40 transition-all group"
          >
            <div className="flex items-center gap-4 min-w-0">
              <div className="size-11 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                <Play className="size-5 text-primary fill-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground mb-0.5">Up next</p>
                <p className="font-medium truncate">{upNext.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Due {upNext.due.toLowerCase()} · suggested now, {adaptedPomoDuration}m session
                </p>
              </div>
            </div>
            <ChevronRight className="size-5 text-muted-foreground group-hover:translate-x-1 transition-transform shrink-0" />
          </button>
        ) : (
          <div className="w-full flex items-center gap-3 p-5 rounded-2xl bg-card border border-border">
            <CheckCircle2 className="size-6 text-green-500" />
            <p className="font-medium">All caught up! Nothing left to schedule.</p>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 p-5 rounded-2xl bg-card border border-border">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium">Tasks</h2>
              <button
                onClick={() => setShowAddInput(v => !v)}
                aria-label="Add task"
                className="size-7 rounded-full flex items-center justify-center hover:bg-secondary transition-colors"
              >
                <Plus className="size-4" />
              </button>
            </div>

            <AnimatePresence>
              {showAddInput && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden mb-3"
                >
                  <input
                    autoFocus
                    value={newTaskTitle}
                    onChange={e => setNewTaskTitle(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && addTask()}
                    onBlur={addTask}
                    placeholder="Add a task and press Enter"
                    className="w-full px-3 py-2 rounded-lg bg-secondary/40 border border-border text-sm outline-none focus:border-primary/50"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {todayTasks.length > 0 && (
              <>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Today</p>
                <AnimatePresence initial={false}>
                  {todayTasks.map(task => {
                    const done = checkedIds.has(task.id);
                    return (
                      <motion.div
                        key={task.id}
                        layout
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, height: 0, marginTop: 0, marginBottom: 0 }}
                        transition={{ duration: 0.25 }}
                        className="flex items-center gap-3 py-2.5 border-t border-border group"
                      >
                        <button
                          onClick={() => completeTask(task.id)}
                          className={`size-[22px] rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${done ? "border-green-500 bg-green-500/20" : "border-border hover:border-primary"}`}
                          aria-label={`Mark ${task.title} as done`}
                        >
                          {done && <CheckCircle2 className="size-3.5 text-green-500" />}
                        </button>
                        <p className={`text-sm flex-1 min-w-0 truncate ${done ? "line-through text-muted-foreground" : ""}`}>{task.title}</p>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 shrink-0">{task.due}</span>
                        <button
                          onClick={() => deleteTask(task.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-destructive/20 hover:text-destructive text-muted-foreground shrink-0"
                          aria-label={`Delete ${task.title}`}
                        >
                          <X className="size-4" />
                        </button>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </>
            )}

            {laterTasks.length > 0 && (
              <>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground mt-4 mb-1">Later this week</p>
                <AnimatePresence initial={false}>
                  {laterTasks.map(task => {
                    const done = checkedIds.has(task.id);
                    return (
                      <motion.div
                        key={task.id}
                        layout
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, height: 0, marginTop: 0, marginBottom: 0 }}
                        transition={{ duration: 0.25 }}
                        className="flex items-center gap-3 py-2.5 border-t border-border group"
                      >
                        <button
                          onClick={() => completeTask(task.id)}
                          className={`size-[22px] rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${done ? "border-green-500 bg-green-500/20" : "border-border hover:border-primary"}`}
                          aria-label={`Mark ${task.title} as done`}
                        >
                          {done && <CheckCircle2 className="size-3.5 text-green-500" />}
                        </button>
                        <p className={`text-sm flex-1 min-w-0 truncate ${done ? "line-through text-muted-foreground" : ""}`}>{task.title}</p>
                        <span className="text-xs text-muted-foreground shrink-0">{task.due}</span>
                        <button
                          onClick={() => deleteTask(task.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-destructive/20 hover:text-destructive text-muted-foreground shrink-0"
                          aria-label={`Delete ${task.title}`}
                        >
                          <X className="size-4" />
                        </button>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </>
            )}

            {tasks.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <CheckCircle2 className="size-8 mx-auto mb-2 text-green-500 opacity-50" />
                All tasks cleared!
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-card border border-border flex items-center gap-3">
              <svg width="44" height="44" viewBox="0 0 48 48" className="shrink-0">
                <circle cx="24" cy="24" r="20" fill="none" stroke="var(--color-secondary)" strokeWidth="4" />
                <circle
                  cx="24" cy="24" r="20" fill="none"
                  stroke="var(--color-primary)" strokeWidth="4"
                  strokeDasharray={2 * Math.PI * 20}
                  strokeDashoffset={2 * Math.PI * 20 * (1 - 0.62)}
                  strokeLinecap="round"
                  transform="rotate(-90 24 24)"
                />
              </svg>
              <div>
                <p className="text-sm font-medium">Level 8 · 12 day streak</p>
                <p className="text-xs text-muted-foreground mt-0.5">4.2h today</p>
              </div>
            </div>

            <WeekAhead days={workloadByDay} />

            {topInsight && (
              <div className="w-full flex items-center gap-2 p-3 rounded-xl bg-card border border-border hover:border-primary/40 transition-all group">
                <button
                  onClick={() => navigate("/ai")}
                  className="flex-1 min-w-0 flex items-center gap-2 text-left"
                >
                  <Lightbulb className="size-4 text-primary shrink-0" />
                  <span className="text-xs flex-1 min-w-0 truncate">{topInsight.title} — {topInsight.body}</span>
                </button>
                <button
                  onClick={() => dismissInsight(topInsight.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                  aria-label="Dismiss insight"
                >
                  <X className="size-3.5 text-muted-foreground hover:text-foreground" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}