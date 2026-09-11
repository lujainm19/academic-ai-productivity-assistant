// task-planner-page.tsx
// Real tasks now — the board used to run on its own hardcoded array (7
// fake tasks pinned to a fixed "today" in the past) completely disconnected
// from the store every other page reads, completing a task here did
// nothing to your XP/streak/Focus canvas. It's on useLocalData() now, the
// same store Focus's Tasks widget and the Growth streak ring read, so this
// is genuinely the same list everywhere, not a lookalike.
//
// Also gone: the fake "Canvas LMS synced" banner and the per-task
// "aiTimeSlot" chip ("Tonight 7–9 PM") — both were invented strings with
// nothing real behind them. The urgency score is still here, but it's a
// plain formula over real fields (priority + days left), not dressed up
// as "AI" when it's arithmetic.

import { motion, AnimatePresence } from "motion/react";
import { Plus, Calendar, Clock, Target, Brain, GripVertical, Search, Sparkles, CheckCircle2, ArrowUpDown, AlertCircle, Flame, ListTodo, Loader2, Trash2, X } from "lucide-react";
import { useState } from "react";
import { useAIEngine } from "./ai-engine-context";
import { useLocalData, Task } from "./local-data-context";
import { ProdigyMark } from "./prodigy-mark";

type Status = Task["status"] | "done";

const columns: { id: Status; label: string; icon: typeof ListTodo; accent: string }[] = [
  { id: "todo", label: "To Do", icon: ListTodo, accent: "bg-muted-foreground" },
  { id: "in-progress", label: "In Progress", icon: Loader2, accent: "bg-amber-500" },
  { id: "done", label: "Done", icon: CheckCircle2, accent: "bg-green-500" },
];

const PRIORITY_WEIGHT: Record<Task["priority"], number> = { high: 3, medium: 2, low: 1 };

// A plain formula, not a model: higher priority and a closer due date both
// push urgency up. No due date at all just falls back to priority alone,
// still real inputs, no invented per-task numbers standing in for it.
function urgencyScore(task: Task, today: Date): number {
  if (!task.dueDate) return PRIORITY_WEIGHT[task.priority] * 5;
  const daysLeft = Math.max(0, Math.ceil((new Date(task.dueDate).getTime() - today.getTime()) / 86400000));
  return (PRIORITY_WEIGHT[task.priority] * 10) / (daysLeft + 1);
}

function getDaysUntilDue(dueDate: string | null, today: Date): string {
  if (!dueDate) return "No due date";
  const due = new Date(dueDate);
  const diffDays = Math.ceil((due.getTime() - today.getTime()) / 86400000);
  if (diffDays < 0) return "Overdue";
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays <= 3) return `In ${diffDays} days`;
  return `${diffDays} days`;
}

// A small fixed palette, cycled by a hash of the course name, so typing
// "COSC125" always lands on the same color for that course without
// needing a real course list to look it up in.
const COURSE_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6", "#64748b"];
function courseColorFor(course: string): string {
  let hash = 0;
  for (let i = 0; i < course.length; i++) hash = (hash * 31 + course.charCodeAt(i)) >>> 0;
  return COURSE_COLORS[hash % COURSE_COLORS.length];
}

export function TaskPlannerPage() {
  const { insights } = useAIEngine();
  const { tasks, addTask, completeTask, setTaskStatus, deleteTask } = useLocalData();
  const [filter, setFilter] = useState<"all" | "high" | "medium" | "low">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [aiSorted, setAiSorted] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<Status | null>(null);

  const [newTitle, setNewTitle] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [newCourse, setNewCourse] = useState("");
  const [newPriority, setNewPriority] = useState<Task["priority"]>("medium");
  const [titleError, setTitleError] = useState(false);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const filtered = tasks
    .filter(t => filter === "all" || t.priority === filter)
    .filter(t => !searchQuery || t.title.toLowerCase().includes(searchQuery.toLowerCase()) || (t.course ?? "").toLowerCase().includes(searchQuery.toLowerCase()));

  const [sortedIds, setSortedIds] = useState<string[] | null>(null);
  const handleAISort = () => {
    setAiSorted(true);
    setSortedIds([...tasks].sort((a, b) => urgencyScore(b, today) - urgencyScore(a, today)).map(t => t.id));
  };

  const moveTask = (id: string, target: Status) => {
    if (target === "done") completeTask(id);
    else setTaskStatus(id, target);
  };

  const resetAddForm = () => {
    setNewTitle(""); setNewDueDate(""); setNewCourse(""); setNewPriority("medium"); setTitleError(false);
  };

  const handleSubmitAdd = () => {
    if (!newTitle.trim()) { setTitleError(true); return; }
    addTask({
      title: newTitle.trim(),
      priority: newPriority,
      dueDate: newDueDate || null,
      course: newCourse.trim() || undefined,
      courseColor: newCourse.trim() ? courseColorFor(newCourse.trim()) : undefined,
    });
    resetAddForm();
    setShowAddModal(false);
  };

  const aiInsight = insights.find(i => !i.dismissed && i.type === "schedule");

  // ── Board stats ──────────────────────────────────────────────────────────
  const openTasks = tasks.filter(t => !t.completed);
  const highPriorityOpen = openTasks.filter(t => t.priority === "high").length;
  const hoursRemaining = openTasks.reduce((sum, t) => sum + (t.estimatedHours ?? 1), 0);
  const doneCount = tasks.filter(t => t.completed).length;
  const completionPct = tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0;

  // If a sort was applied, use it to order every column; otherwise fall
  // back to however useLocalData already orders things (newest first).
  const ordered = sortedIds ? [...filtered].sort((a, b) => sortedIds.indexOf(a.id) - sortedIds.indexOf(b.id)) : filtered;

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <div className="max-w-7xl mx-auto space-y-5">

        {/* Header — a board, not a checklist: the framing here is workload
            and throughput ("what's open, what's moving"), distinct from a
            single "what's next right now" framing. */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-4xl font-bold mb-2">Task Planner</h1>
            <p className="text-muted-foreground">ranked by urgency. tackle the hardest tasks first!</p>
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
                    <ProdigyMark size={16} className="text-primary" />
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
            Three columns instead of one flat list. Drag a card (or use the
            arrow buttons that appear on hover, for keyboard/touch users) to
            move it. Moving into Done actually completes the task, XP and
            streak included, the same as finishing it anywhere else. */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
          {columns.map(col => {
            const colTasks = ordered.filter(t => (col.id === "done" ? t.completed : !t.completed && t.status === col.id));
            const isOver = dragOverCol === col.id;
            return (
              <div
                key={col.id}
                onDragOver={e => { e.preventDefault(); setDragOverCol(col.id); }}
                onDragLeave={() => setDragOverCol(prev => (prev === col.id ? null : prev))}
                onDrop={e => {
                  e.preventDefault();
                  const id = e.dataTransfer.getData("text/plain");
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
                    const daysLeft = task.dueDate ? Math.ceil((new Date(task.dueDate).getTime() - today.getTime()) / 86400000) : null;
                    const urgency = urgencyScore(task, today);
                    const done = task.completed;

                    return (
                      <motion.div
                        key={task.id}
                        layout
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, height: 0 }}
                        draggable
                        onDragStart={e => { e.dataTransfer.setData("text/plain", task.id); setDraggingId(task.id); }}
                        onDragEnd={() => { setDraggingId(null); setDragOverCol(null); }}
                        className={`group p-4 rounded-xl bg-card border transition-all cursor-grab active:cursor-grabbing ${
                          draggingId === task.id ? "opacity-40" : "opacity-100"
                        } ${done ? "border-border" : "border-border hover:border-primary/40"} ${task.priority === "high" && !done ? "ring-1 ring-destructive/20" : ""}`}
                      >
                        <div className="flex items-start gap-2">
                          <GripVertical className="size-4 text-muted-foreground mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                          {task.courseColor && <div className="w-0.5 self-stretch rounded-full shrink-0" style={{ background: task.courseColor }} />}
                          <div className="flex-1 min-w-0 space-y-2">
                            <div className="flex items-start gap-2 flex-wrap">
                              <h4 className={`text-sm font-semibold ${done ? "line-through text-muted-foreground" : ""}`}>{task.title}</h4>
                              {task.priority === "high" && daysLeft !== null && daysLeft <= 2 && !done && (
                                <span className="flex items-center gap-1 text-[10px] text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded-full">
                                  <AlertCircle className="size-2.5" /> Urgent
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                              <span className="flex items-center gap-1"><Calendar className="size-3" />{getDaysUntilDue(task.dueDate, today)}</span>
                              {task.estimatedHours && <span className="flex items-center gap-1"><Clock className="size-3" />{task.estimatedHours}h</span>}
                              {task.course && <span className="px-1.5 py-0.5 rounded-full bg-muted/50" style={{ color: task.courseColor }}>{task.course}</span>}
                            </div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <div className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${task.priority === "high" ? "bg-destructive/20 text-destructive" : task.priority === "medium" ? "bg-accent/20 text-accent" : "bg-muted/50 text-muted-foreground"}`}>
                                {task.priority === "high" ? "High" : task.priority === "medium" ? "Medium" : "Low"}
                              </div>
                              {!done && (
                                <div className={`ml-auto text-[10px] font-bold ${urgency > 20 ? "text-red-400" : urgency > 10 ? "text-amber-400" : "text-muted-foreground"}`}>
                                  urgency {urgency.toFixed(0)}
                                </div>
                              )}
                            </div>

                            {/* Move controls — hover-revealed, keeps the board
                                usable without relying on drag alone */}
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pt-1">
                              {columns.filter(c => c.id !== (done ? "done" : task.status)).map(c => (
                                <button
                                  key={c.id}
                                  onClick={() => moveTask(task.id, c.id)}
                                  className="text-[10px] px-2 py-1 rounded-md bg-secondary hover:bg-secondary/70 text-muted-foreground hover:text-foreground transition-colors"
                                >
                                  Move to {c.label}
                                </button>
                              ))}
                              <button
                                onClick={() => deleteTask(task.id)}
                                aria-label="Delete task"
                                className="ml-auto p-1 rounded-md hover:bg-destructive/15 text-muted-foreground hover:text-destructive transition-colors"
                              >
                                <Trash2 className="size-3" />
                              </button>
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
              onClick={() => { setShowAddModal(false); resetAddForm(); }}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={e => e.stopPropagation()}
                className="w-full max-w-md p-6 rounded-2xl bg-card border border-border shadow-2xl space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Brain className="size-5 text-primary" />
                    <h3 className="font-semibold">Add New Task</h3>
                  </div>
                  <button onClick={() => { setShowAddModal(false); resetAddForm(); }} aria-label="Close" className="text-muted-foreground hover:text-foreground transition-colors">
                    <X className="size-4" />
                  </button>
                </div>

                <div>
                  <input
                    placeholder="Task title"
                    value={newTitle}
                    onChange={e => { setNewTitle(e.target.value); if (titleError) setTitleError(false); }}
                    onKeyDown={e => { if (e.key === "Enter") handleSubmitAdd(); }}
                    className={`w-full px-4 py-3 rounded-xl bg-secondary border outline-none text-sm transition-colors ${titleError ? "border-destructive" : "border-border focus:border-primary"}`}
                  />
                  {titleError && <p className="text-xs text-destructive mt-1.5">Give it a title first</p>}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="date"
                    value={newDueDate}
                    onChange={e => setNewDueDate(e.target.value)}
                    className="px-4 py-3 rounded-xl bg-secondary border border-border focus:border-primary outline-none text-sm"
                  />
                  <input
                    placeholder="Course (optional)"
                    value={newCourse}
                    onChange={e => setNewCourse(e.target.value)}
                    className="px-4 py-3 rounded-xl bg-secondary border border-border focus:border-primary outline-none text-sm"
                  />
                </div>

                <div>
                  <p className="text-xs text-muted-foreground mb-2">Priority</p>
                  <div className="grid grid-cols-3 gap-2">
                    {(["high", "medium", "low"] as const).map(p => (
                      <button
                        key={p}
                        onClick={() => setNewPriority(p)}
                        className={`py-2 rounded-lg text-sm font-medium transition-colors ${
                          newPriority === p
                            ? p === "high" ? "bg-destructive text-destructive-foreground"
                              : p === "medium" ? "bg-accent text-accent-foreground"
                              : "bg-muted text-muted-foreground"
                            : "bg-secondary border border-border hover:bg-secondary/70"
                        }`}
                      >
                        {p === "high" ? "High" : p === "medium" ? "Medium" : "Low"}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button onClick={handleSubmitAdd} className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-all">
                    Add Task
                  </button>
                  <button onClick={() => { setShowAddModal(false); resetAddForm(); }} className="px-5 py-3 rounded-xl bg-secondary border border-border text-sm hover:bg-secondary/80 transition-all">
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
