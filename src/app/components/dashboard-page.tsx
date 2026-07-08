import { motion, AnimatePresence } from "motion/react";
import { Play, ChevronRight, RefreshCw, CheckCircle2, Plus, X, Lightbulb, Calendar } from "lucide-react";
import { useNavigate } from "react-router";
import { MouseEvent, useEffect, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { useAIEngine } from "./ai-engine-context";
import { useLocalData } from "./local-data-context";
import { toLocalDateStr } from "../lib/date";

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
  const { tasks, stats, addTask, completeTask, deleteTask, pendingBadgeUnlocks, dismissBadgeUnlock } = useLocalData();
  const { insights, workloadByDay, adaptedPomoDuration, isAnalyzing, dismissInsight } = useAIEngine();
  const topInsight = insights.find(i => !i.dismissed);

  const [checkingIds, setCheckingIds] = useState<Set<string>>(new Set());
  const [showAddInput, setShowAddInput] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const dueOptions = ["Today", "Tomorrow", "This week"] as const;
  const [newTaskDue, setNewTaskDue] = useState<string>("Today");
  const [customDate, setCustomDate] = useState("");
  const customDateInputRef = useRef<HTMLInputElement>(null);

  // Show unlocks one at a time; a fun little side-cannon confetti burst
  // plus an auto-dismissing toast celebrates each new badge as it lands.
  const currentBadge = pendingBadgeUnlocks[0] ?? null;
  useEffect(() => {
    if (!currentBadge) return;
    confetti({
      particleCount: 70,
      spread: 100,
      startVelocity: 42,
      gravity: 0.9,
      scalar: 1,
      origin: { x: 0.5, y: 0.25 },
      colors: ["#facc15", "#6366f1", "#22c55e", "#ec4899", "#38bdf8"],
    });
    const timer = setTimeout(() => dismissBadgeUnlock(currentBadge.id), 5000);
    return () => clearTimeout(timer);
  }, [currentBadge, dismissBadgeUnlock]);

  // `completedToday` below is computed fresh on every render from the real
  // clock, but nothing re-renders this component by itself as midnight
  // passes - a tab left open overnight would keep showing yesterday's list
  // until some unrelated state change happened to re-render it. This tick
  // forces one: a timer fires just after the next local midnight, then
  // reschedules itself for the following one, and a visibilitychange check
  // catches the case where the tab was backgrounded/throttled right through
  // the boundary.
  const [, setMidnightTick] = useState(0);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const scheduleNext = () => {
      const now = new Date();
      const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 2);
      timer = setTimeout(() => {
        setMidnightTick(t => t + 1);
        scheduleNext();
      }, nextMidnight.getTime() - now.getTime());
    };
    scheduleNext();
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") setMidnightTick(t => t + 1);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  // Only ever show items finished on today's real calendar date. This reads
  // straight from localStorage-backed state, so it's correct after a page
  // navigation or a full refresh - not just while the tab happens to stay open.
  const completedToday = tasks.filter(
    t => t.completed && t.completedAt && new Date(t.completedAt).toDateString() === new Date().toDateString()
  );
  const activeTasks = tasks.filter(t => !t.completed);
  const todayTasks = activeTasks.filter(t => t.priority === "high");
  const laterTasks = activeTasks.filter(t => t.priority !== "high");
  const upNext = activeTasks[0];

  // Show the checkmark for a beat, then let the task actually leave the
  // active list (it moves into "Completed today" below instead of vanishing).
  const handleComplete = (id: string, e: MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const origin = {
      x: (rect.left + rect.width / 2) / window.innerWidth,
      y: (rect.top + rect.height / 2) / window.innerHeight,
    };

    setCheckingIds(prev => new Set(prev).add(id));
    setTimeout(() => {
      const { isLate } = completeTask(id);
      confetti({
        particleCount: 16,
        spread: 55,
        startVelocity: 25,
        gravity: 1.2,
        scalar: 0.75,
        ticks: 60,
        origin,
        colors: isLate ? ["#f59e0b", "#fbbf24", "#94a3b8"] : ["#22c55e", "#6366f1", "#facc15"],
      });
      setCheckingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 450);
  };

  const isoDaysFromNow = (offset: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return toLocalDateStr(d);
  };

  const handleAddTask = () => {
    const title = newTaskTitle.trim();
    if (!title) {
      setShowAddInput(false);
      return;
    }
    const dueDate = customDate
      ? customDate
      : newTaskDue === "Today"
      ? isoDaysFromNow(0)
      : newTaskDue === "Tomorrow"
      ? isoDaysFromNow(1)
      : isoDaysFromNow(6);
    const due = customDate
      ? new Date(customDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })
      : newTaskDue;
    const priority = due === "Today" || due === "Tomorrow" ? "high" : "medium";
    addTask(title, due, priority, dueDate);
    setNewTaskTitle("");
    setCustomDate("");
    setNewTaskDue("Today");
    setShowAddInput(false);
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-6 overflow-x-auto">
      <AnimatePresence>
        {currentBadge && (
          <motion.div
            key={currentBadge.id}
            initial={{ opacity: 0, y: -24, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 22 }}
            className="fixed top-6 right-6 z-50 w-80 p-4 rounded-2xl bg-gradient-to-br from-primary/20 via-card to-card border border-primary/40 shadow-2xl shadow-primary/20 flex items-start gap-3"
          >
            <motion.div
              initial={{ rotate: 0 }}
              animate={{ rotate: [0, -12, 12, -8, 8, 0] }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="size-12 rounded-xl bg-primary/15 flex items-center justify-center text-2xl shrink-0"
            >
              {currentBadge.emoji}
            </motion.div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] uppercase tracking-wide text-primary font-semibold mb-0.5">Badge unlocked!</p>
              <p className="text-sm font-semibold">{currentBadge.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{currentBadge.description}</p>
            </div>
            <button
              onClick={() => dismissBadgeUnlock(currentBadge.id)}
              className="shrink-0 p-1 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Dismiss badge notification"
            >
              <X className="size-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="max-w-6xl min-w-[860px] mx-auto space-y-4">

        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
            {todayTasks.length > 0 && ` · ${todayTasks.length} due today`}
          </p>
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            {isAnalyzing && <RefreshCw className="size-3 animate-spin text-primary" />}
            {isAnalyzing ? "Syncing..." : "Saved"}
          </p>
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
            <p className="font-medium">All caught up! Add a task below whenever you're ready.</p>
          </div>
        )}

        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 space-y-4">
          <div className="p-5 rounded-2xl bg-card border border-border">
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
                  <div className="p-3 rounded-lg bg-secondary/30 border border-border space-y-2">
                    <input
                      autoFocus
                      value={newTaskTitle}
                      onChange={e => setNewTaskTitle(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && handleAddTask()}
                      placeholder="Add a task..."
                      className="w-full px-2 py-1.5 bg-transparent text-sm outline-none"
                    />
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {dueOptions.map(opt => (
                        <button
                          key={opt}
                          onClick={() => { setNewTaskDue(opt); setCustomDate(""); }}
                          className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                            newTaskDue === opt && !customDate
                              ? "bg-primary/15 border-primary/40 text-primary"
                              : "border-border text-muted-foreground hover:border-primary/30"
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          const input = customDateInputRef.current;
                          if (!input) return;
                          if (typeof input.showPicker === "function") {
                            input.showPicker();
                          } else {
                            input.focus();
                            input.click();
                          }
                        }}
                        className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full border cursor-pointer transition-colors ${customDate ? "bg-primary/15 border-primary/40 text-primary" : "border-border text-muted-foreground hover:border-primary/30"}`}
                      >
                        <Calendar className="size-3.5" />
                        {customDate ? new Date(customDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Pick date"}
                        <input
                          ref={customDateInputRef}
                          type="date"
                          value={customDate}
                          onChange={e => setCustomDate(e.target.value)}
                          className="sr-only"
                          tabIndex={-1}
                        />
                      </button>
                      <button
                        onClick={handleAddTask}
                        className="ml-auto text-xs px-3 py-1 rounded-full bg-primary text-primary-foreground hover:opacity-90"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {todayTasks.length > 0 && (
              <>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Today</p>
                <AnimatePresence initial={false}>
                  {todayTasks.map(task => {
                    const done = checkingIds.has(task.id);
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
                          onClick={(e) => handleComplete(task.id, e)}
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
                    const done = checkingIds.has(task.id);
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
                          onClick={(e) => handleComplete(task.id, e)}
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

            {activeTasks.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <CheckCircle2 className="size-8 mx-auto mb-2 text-green-500 opacity-50" />
                No tasks yet. Add one above to get started.
              </div>
            )}
          </div>

          {completedToday.length > 0 && (
            <div className="p-4 rounded-xl bg-card border border-border">
              <h3 className="text-sm font-medium mb-2">Completed today</h3>
              <AnimatePresence initial={false}>
                {completedToday.map(task => (
                  <motion.div
                    key={task.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-center gap-3 py-2 border-t border-border first:border-t-0"
                  >
                    <CheckCircle2 className="size-4 text-green-500 shrink-0" />
                    <p className="text-sm flex-1 min-w-0 truncate text-muted-foreground line-through">{task.title}</p>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {task.completedAt && new Date(task.completedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                    </span>
                  </motion.div>
                ))}
              </AnimatePresence>
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
                  strokeDashoffset={2 * Math.PI * 20 * (1 - ((stats.xp % 500) / 500))}
                  strokeLinecap="round"
                  transform="rotate(-90 24 24)"
                />
              </svg>
              <div>
                <p className="text-sm font-medium">Level {stats.level} · {stats.streak} day streak</p>
                <p className="text-xs text-muted-foreground mt-0.5">{completedToday.length} task{completedToday.length === 1 ? "" : "s"} done today</p>
              </div>
            </div>

            <WeekAhead days={workloadByDay} />

            {topInsight && (
              <div className="w-full flex items-start gap-2 p-3 rounded-xl bg-card border border-border hover:border-primary/40 transition-all group">
                <button
                  onClick={() => navigate("/ai")}
                  className="flex-1 min-w-0 flex items-start gap-2 text-left"
                >
                  <Lightbulb className="size-4 text-primary shrink-0 mt-0.5" />
                  <span className="text-xs flex-1 min-w-0">{topInsight.title} — {topInsight.body}</span>
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