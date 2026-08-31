import { motion, AnimatePresence } from "motion/react";
import { Plus, Calendar, Clock, Zap, Target, Brain, GripVertical, Search, Sparkles, CheckCircle2, ArrowUpDown, AlertCircle, Link2, Flame, ListTodo, Loader2 } from "lucide-react";
import { useState } from "react";
import { useAIEngine, canvasCourses } from "./ai-engine-context";
import { useCustomization } from "./customization-context";

type Status = "todo" | "in-progress" | "done";

const initialTasks = [
  { id: 1, title: "COSC125 Assignment 3", due: "2026-05-29", priority: "high" as const, energy: "Deep Work", duration: "2h", durationHours: 2, course: "COSC125", courseColor: "#6366f1", status: "todo" as Status, weight: 15, difficulty: 3, aiTimeSlot: "Tonight 7–9 PM" },
  { id: 2, title: "Read Chapter 7 - Biology", due: "2026-05-30", priority: "medium" as const, energy: "Medium Focus", duration: "1h", durationHours: 1, course: "BIO201", courseColor: "#10b981", status: "in-progress" as Status, weight: 5, difficulty: 2, aiTimeSlot: "Fri 8–9 PM" },
  { id: 3, title: "Math Practice Problems", due: "2026-05-31", priority: "medium" as const, energy: "Deep Work", duration: "1.5h", durationHours: 1.5, course: "MATH210", courseColor: "#f59e0b", status: "todo" as Status, weight: 10, difficulty: 4, aiTimeSlot: "Fri 6–7 PM" },
  { id: 4, title: "Essay Outline - English", due: "2026-06-02", priority: "low" as const, energy: "Low Energy", duration: "45m", durationHours: 0.75, course: "ENG102", courseColor: "#ec4899", status: "todo" as Status, weight: 8, difficulty: 2, aiTimeSlot: "Mon 5–6 PM" },
  { id: 5, title: "Physics Lab Report", due: "2026-06-03", priority: "high" as const, energy: "Deep Work", duration: "3h", durationHours: 3, course: "PHYS110", courseColor: "#8b5cf6", status: "todo" as Status, weight: 15, difficulty: 4, aiTimeSlot: "Sun 7–10 PM" },
  { id: 6, title: "History Reading Notes", due: "2026-06-04", priority: "low" as const, energy: "Low Energy", duration: "30m", durationHours: 0.5, course: "HIST150", courseColor: "#64748b", status: "done" as Status, weight: 5, difficulty: 1, aiTimeSlot: "Sat 3–4 PM" },
  { id: 7, title: "Programming Project Setup", due: "2026-06-05", priority: "medium" as const, energy: "Medium Focus", duration: "1h", durationHours: 1, course: "COSC125", courseColor: "#6366f1", status: "in-progress" as Status, weight: 20, difficulty: 3, aiTimeSlot: "Tue 7–8 PM" },
];

type PlannerTask = typeof initialTasks[0];

const TODAY = new Date("2026-05-28");

const urgencyScore = (task: PlannerTask) => {
  const due = new Date(task.due);
  const daysLeft = Math.max(0, Math.ceil((due.getTime() - TODAY.getTime()) / (1000 * 60 * 60 * 24)));
  return (task.weight * task.difficulty) / (daysLeft + 1);
};

const columns: { id: Status; label: string; icon: typeof ListTodo; accent: string }[] = [
  { id: "todo", label: "To Do", icon: ListTodo, accent: "bg-muted-foreground" },
  { id: "in-progress", label: "In Progress", icon: Loader2, accent: "bg-amber-500" },
  { id: "done", label: "Done", icon: CheckCircle2, accent: "bg-green-500" },
];

export function TaskPlannerPage() {
  const { savedMode } = useCustomization();
  const { insights, isAnalyzing } = useAIEngine();
  const [tasks, setTasks] = useState<PlannerTask[]>(initialTasks);
  const [filter, setFilter] = useState<"all" | "high" | "medium" | "low">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [aiSorted, setAiSorted] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [dragOverCol, setDragOverCol] = useState<Status | null>(null);

  const filtered = tasks
    .filter(t => filter === "all" || t.priority === filter)
    .filter(t => !searchQuery || t.title.toLowerCase().includes(searchQuery.toLowerCase()) || t.course.toLowerCase().includes(searchQuery.toLowerCase()));

  const getDaysUntilDue = (dueDate: string) => {
    const due = new Date(dueDate);
    const diffDays = Math.ceil((due.getTime() - TODAY.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return "Overdue";
    if (diffDays === 1) return "Tomorrow";
    if (diffDays <= 3) return `In ${diffDays} days`;
    return `${diffDays} days`;
  };

  const handleAISort = () => {
    setAiSorted(true);
    setTasks(prev => [...prev].sort((a, b) => urgencyScore(b) - urgencyScore(a)));
  };

  const moveTask = (id: number, status: Status) => {
    setTasks(prev => prev.map(t => (t.id === id ? { ...t, status } : t)));
  };

  const aiInsight = insights.find(i => !i.dismissed && i.type === "schedule");

  // ── Board stats ──────────────────────────────────────────────────────────
  const openTasks = tasks.filter(t => t.status !== "done");
  const highPriorityOpen = openTasks.filter(t => t.priority === "high").length;
  const hoursRemaining = openTasks.reduce((sum, t) => sum + t.durationHours, 0);
  const doneCount = tasks.filter(t => t.status === "done").length;
  const completionPct = tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <div className="max-w-7xl mx-auto space-y-5">

        {/* Header — a board, not a checklist: the framing here is workload
            and throughput ("what's open, what's moving"), distinct from the
            Dashboard's "what's next right now" framing. */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-4xl font-bold mb-2">Task Planner</h1>
            <p className="text-muted-foreground">
              {savedMode === "cozy"        ? "Take it one task at a time 🌿 No rush, just progress." :
              savedMode === "competitive" ? "Ranked by urgency ⚡ Attack the hardest tasks first." :
                                             "Synced with your team 👥 Stay on track together."}
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-5 py-3 rounded-xl bg-primary text-primary-foreground hover:scale-105 transition-all flex items-center gap-2 shadow-lg shadow-primary/25"
          >
            <Plus className="size-5" />
            Add Task
          </button>
        </motion.div>

        {/* Board stats strip — the planner's own identity: workload at a
            glance across the whole board, not a single "up next" card. */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Open tasks", value: openTasks.length, icon: ListTodo, color: "text-foreground" },
            { label: "High priority", value: highPriorityOpen, icon: Flame, color: highPriorityOpen > 0 ? "text-destructive" : "text-foreground" },
            { label: "Hours remaining", value: `${hoursRemaining % 1 === 0 ? hoursRemaining : hoursRemaining.toFixed(1)}h`, icon: Clock, color: "text-foreground" },
            { label: "Completed", value: `${completionPct}%`, icon: CheckCircle2, color: "text-green-500" },
          ].map(stat => (
            <div key={stat.label} className="p-4 rounded-xl bg-card border border-border flex items-center gap-3">
              <div className="size-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                <stat.icon className={`size-4 ${stat.color}`} />
              </div>
              <div className="min-w-0">
                <p className={`text-lg font-bold leading-tight ${stat.color}`}>{stat.value}</p>
                <p className="text-xs text-muted-foreground truncate">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* AI Suggestion Banner */}
        <AnimatePresence>
          {aiInsight && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              className="p-4 rounded-2xl bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 border border-primary/20"
            >
              <div className="flex items-start gap-3">
                <div className="size-8 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                  <Sparkles className="size-4 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Brain className="size-4 text-primary" />
                    <span className="text-sm font-semibold">AI Recommendation</span>
                    <span className="text-xs text-muted-foreground">· {aiInsight.confidence}% confidence</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{aiInsight.body}</p>
                </div>
                {!aiSorted && (
                  <button
                    onClick={handleAISort}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs hover:opacity-90 transition-all shrink-0"
                  >
                    <ArrowUpDown className="size-3" />
                    Auto-Prioritize
                  </button>
                )}
                {aiSorted && (
                  <span className="flex items-center gap-1 text-xs text-green-400 shrink-0">
                    <CheckCircle2 className="size-3" /> Sorted
                  </span>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Canvas Integration Status */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-card border border-border text-xs">
            <Link2 className="size-3 text-green-500" />
            Canvas LMS · {tasks.length} tasks synced
            <span className="size-2 rounded-full bg-green-500" />
          </div>
          <div className="text-xs text-muted-foreground">Last sync 8 min ago</div>
          {isAnalyzing && (
            <div className="flex items-center gap-1.5 text-xs text-primary">
              <Loader2 className="size-3 animate-spin" /> Re-analyzing workload…
            </div>
          )}
        </div>

        {/* Search + Filter */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex-1 relative min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search tasks or courses..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-card border border-border focus:border-primary outline-none transition-all"
            />
          </div>
          <div className="flex items-center gap-2">
            {(["all", "high", "medium", "low"] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg transition-all text-sm ${
                  filter === f
                    ? f === "high" ? "bg-destructive text-destructive-foreground"
                      : f === "medium" ? "bg-accent text-accent-foreground"
                      : f === "low" ? "bg-muted text-muted-foreground"
                      : "bg-primary text-primary-foreground"
                    : "bg-card border border-border hover:bg-secondary"
                }`}
              >
                {f === "all" ? "All" : f === "high" ? "High" : f === "medium" ? "Medium" : "Low"}
              </button>
            ))}
          </div>
        </div>

        {/* ── Status board ──────────────────────────────────────────────────
            Three columns instead of one flat list — this is the planner's
            distinct layout paradigm. Drag a card (or use the arrow buttons
            that appear on hover, for keyboard/touch users) to move it. */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
          {columns.map(col => {
            const colTasks = filtered.filter(t => t.status === col.id);
            const isOver = dragOverCol === col.id;
            return (
              <div
                key={col.id}
                onDragOver={e => { e.preventDefault(); setDragOverCol(col.id); }}
                onDragLeave={() => setDragOverCol(prev => (prev === col.id ? null : prev))}
                onDrop={e => {
                  e.preventDefault();
                  const id = Number(e.dataTransfer.getData("text/plain"));
                  if (id) moveTask(id, col.id);
                  setDraggingId(null);
                  setDragOverCol(null);
                }}
                className={`rounded-2xl border p-3 space-y-3 min-h-[160px] transition-colors ${
                  isOver ? "border-primary/50 bg-primary/5" : "border-border bg-card/40"
                }`}
              >
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <span className={`size-2 rounded-full ${col.accent}`} />
                    <h3 className="text-sm font-semibold">{col.label}</h3>
                  </div>
                  <span className="text-xs text-muted-foreground px-2 py-0.5 rounded-full bg-secondary">{colTasks.length}</span>
                </div>

                <AnimatePresence>
                  {colTasks.map(task => {
                    const daysLeft = Math.ceil((new Date(task.due).getTime() - TODAY.getTime()) / (1000 * 60 * 60 * 24));
                    const urgency = urgencyScore(task);
                    const done = task.status === "done";

                    return (
                      <motion.div
                        key={task.id}
                        layout
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, height: 0 }}
                        draggable
                        onDragStart={e => { e.dataTransfer.setData("text/plain", String(task.id)); setDraggingId(task.id); }}
                        onDragEnd={() => { setDraggingId(null); setDragOverCol(null); }}
                        className={`group p-4 rounded-xl bg-card border transition-all cursor-grab active:cursor-grabbing ${
                          draggingId === task.id ? "opacity-40" : "opacity-100"
                        } ${done ? "border-border" : "border-border hover:border-primary/40"} ${task.priority === "high" && !done ? "ring-1 ring-destructive/20" : ""}`}
                      >
                        <div className="flex items-start gap-2">
                          <GripVertical className="size-4 text-muted-foreground mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                          <div className="w-0.5 self-stretch rounded-full shrink-0" style={{ background: task.courseColor }} />
                          <div className="flex-1 min-w-0 space-y-2">
                            <div className="flex items-start gap-2 flex-wrap">
                              <h4 className={`text-sm font-semibold ${done ? "line-through text-muted-foreground" : ""}`}>{task.title}</h4>
                              {task.priority === "high" && daysLeft <= 2 && !done && (
                                <span className="flex items-center gap-1 text-[10px] text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded-full">
                                  <AlertCircle className="size-2.5" /> Urgent
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                              <span className="flex items-center gap-1"><Calendar className="size-3" />{getDaysUntilDue(task.due)}</span>
                              <span className="flex items-center gap-1"><Clock className="size-3" />{task.duration}</span>
                              <span className="px-1.5 py-0.5 rounded-full bg-muted/50" style={{ color: task.courseColor }}>{task.course}</span>
                            </div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <div className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${task.priority === "high" ? "bg-destructive/20 text-destructive" : task.priority === "medium" ? "bg-accent/20 text-accent" : "bg-muted/50 text-muted-foreground"}`}>
                                {task.priority === "high" ? "High" : task.priority === "medium" ? "Medium" : "Low"}
                              </div>
                              {!done && (
                                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-primary/10 text-primary border border-primary/20">
                                  <Sparkles className="size-2.5" />
                                  {task.aiTimeSlot}
                                </div>
                              )}
                              {!done && (
                                <div className={`ml-auto text-[10px] font-bold ${urgency > 20 ? "text-red-400" : urgency > 10 ? "text-amber-400" : "text-muted-foreground"}`}>
                                  AI {urgency.toFixed(0)}
                                </div>
                              )}
                            </div>

                            {/* Move controls — hover-revealed, keeps the board
                                usable without relying on drag alone */}
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pt-1">
                              {columns.filter(c => c.id !== task.status).map(c => (
                                <button
                                  key={c.id}
                                  onClick={() => moveTask(task.id, c.id)}
                                  className="text-[10px] px-2 py-1 rounded-md bg-secondary hover:bg-secondary/70 text-muted-foreground hover:text-foreground transition-colors"
                                >
                                  Move to {c.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>

                {colTasks.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground text-xs">
                    Drop a task here
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Target className="size-12 mx-auto mb-4 opacity-50" />
            <p>No tasks found</p>
          </div>
        )}

        {/* Add Task Modal */}
        <AnimatePresence>
          {showAddModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-6"
              onClick={() => setShowAddModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={e => e.stopPropagation()}
                className="w-full max-w-md p-6 rounded-2xl bg-card border border-border shadow-2xl space-y-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Brain className="size-5 text-primary" />
                  <h3 className="font-semibold">Add New Task</h3>
                </div>
                <input placeholder="Task title" className="w-full px-4 py-3 rounded-xl bg-secondary border border-border focus:border-primary outline-none text-sm" />
                <div className="grid grid-cols-2 gap-3">
                  <input type="date" className="px-4 py-3 rounded-xl bg-secondary border border-border focus:border-primary outline-none text-sm" />
                  <select className="px-4 py-3 rounded-xl bg-secondary border border-border focus:border-primary outline-none text-sm">
                    {canvasCourses.map(c => <option key={c.id}>{c.id.toUpperCase()}</option>)}
                  </select>
                </div>
                <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 flex items-start gap-2">
                  <Sparkles className="size-4 text-primary mt-0.5 shrink-0" />
                  <p className="text-xs text-muted-foreground">AI will automatically determine priority, schedule the optimal study time, and add it to your focus plan.</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setShowAddModal(false)} className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-all">
                    Add & Let AI Schedule
                  </button>
                  <button onClick={() => setShowAddModal(false)} className="px-5 py-3 rounded-xl bg-secondary border border-border text-sm hover:bg-secondary/80 transition-all">
                    Cancel
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
