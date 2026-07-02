import { motion, AnimatePresence } from "motion/react";
import { Plus, Calendar, Clock, Zap, Target, Brain, GripVertical, Search, Sparkles, CheckCircle2, ArrowUpDown, AlertCircle, Link2 } from "lucide-react";
import { useState } from "react";
import { useAIEngine, canvasCourses } from "./ai-engine-context";
import { useCustomization } from "./customization-context";

const allTasks = [
  { id: 1, title: "COSC125 Assignment 3", due: "2026-05-29", priority: "high" as const, energy: "Deep Work", duration: "2h", course: "COSC125", courseColor: "#6366f1", status: "todo", weight: 15, difficulty: 3, aiTimeSlot: "Tonight 7–9 PM", conflictFree: true },
  { id: 2, title: "Read Chapter 7 - Biology", due: "2026-05-30", priority: "medium" as const, energy: "Medium Focus", duration: "1h", course: "BIO201", courseColor: "#10b981", status: "todo", weight: 5, difficulty: 2, aiTimeSlot: "Fri 8–9 PM", conflictFree: true },
  { id: 3, title: "Math Practice Problems", due: "2026-05-31", priority: "medium" as const, energy: "Deep Work", duration: "1.5h", course: "MATH210", courseColor: "#f59e0b", status: "todo", weight: 10, difficulty: 4, aiTimeSlot: "Fri 6–7 PM", conflictFree: true },
  { id: 4, title: "Essay Outline - English", due: "2026-06-02", priority: "low" as const, energy: "Low Energy", duration: "45m", course: "ENG102", courseColor: "#ec4899", status: "todo", weight: 8, difficulty: 2, aiTimeSlot: "Mon 5–6 PM", conflictFree: true },
  { id: 5, title: "Physics Lab Report", due: "2026-06-03", priority: "high" as const, energy: "Deep Work", duration: "3h", course: "PHYS110", courseColor: "#8b5cf6", status: "todo", weight: 15, difficulty: 4, aiTimeSlot: "Sun 7–10 PM", conflictFree: true },
  { id: 6, title: "History Reading Notes", due: "2026-06-04", priority: "low" as const, energy: "Low Energy", duration: "30m", course: "HIST150", courseColor: "#64748b", status: "todo", weight: 5, difficulty: 1, aiTimeSlot: "Sat 3–4 PM", conflictFree: true },
  { id: 7, title: "Programming Project Setup", due: "2026-06-05", priority: "medium" as const, energy: "Medium Focus", duration: "1h", course: "COSC125", courseColor: "#6366f1", status: "todo", weight: 20, difficulty: 3, aiTimeSlot: "Tue 7–8 PM", conflictFree: true },
];

const urgencyScore = (task: typeof allTasks[0]) => {
  const due = new Date(task.due);
  const today = new Date("2026-05-28");
  const daysLeft = Math.max(0, Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
  return (task.weight * task.difficulty) / (daysLeft + 1);
};

export function TaskPlannerPage() {
  const { savedMode } = useCustomization();
  const { insights, isAnalyzing } = useAIEngine();
  const [tasks, setTasks] = useState(allTasks);
  const [filter, setFilter] = useState<"all" | "high" | "medium" | "low">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [aiSorted, setAiSorted] = useState(false);
  const [completedIds, setCompletedIds] = useState<Set<number>>(new Set());
  const [showAddModal, setShowAddModal] = useState(false);

  const filtered = tasks
    .filter(t => filter === "all" || t.priority === filter)
    .filter(t => !searchQuery || t.title.toLowerCase().includes(searchQuery.toLowerCase()) || t.course.toLowerCase().includes(searchQuery.toLowerCase()));

  const getDaysUntilDue = (dueDate: string) => {
    const due = new Date(dueDate);
    const today = new Date("2026-05-28");
    const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return "Overdue";
    if (diffDays === 1) return "Tomorrow";
    if (diffDays <= 3) return `In ${diffDays} days`;
    return `${diffDays} days`;
  };

  const handleAISort = () => {
    setAiSorted(true);
    const sorted = [...tasks].sort((a, b) => urgencyScore(b) - urgencyScore(a));
    setTasks(sorted);
  };

  const toggleComplete = (id: number) => {
    setCompletedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const aiInsight = insights.find(i => !i.dismissed && i.type === "schedule");

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
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
            Canvas LMS · {allTasks.length} tasks synced
            <span className="size-2 rounded-full bg-green-500" />
          </div>
          <div className="text-xs text-muted-foreground">Last sync 8 min ago</div>
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

        {/* Task List */}
        <div className="space-y-3">
          <AnimatePresence>
            {filtered.map((task, i) => {
              const done = completedIds.has(task.id);
              const daysLeft = Math.ceil((new Date(task.due).getTime() - new Date("2026-05-28").getTime()) / (1000 * 60 * 60 * 24));
              const urgency = urgencyScore(task);

              return (
                <motion.div
                  key={task.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: done ? 0.5 : 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className={`group p-5 rounded-xl bg-card border transition-all ${done ? "border-border" : "border-border hover:border-primary/40"} ${task.priority === "high" && !done ? "ring-1 ring-destructive/20" : ""}`}
                >
                  <div className="flex items-start gap-4">
                    <GripVertical className="size-5 text-muted-foreground mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab" />
                    <div className="w-0.5 self-stretch rounded-full" style={{ background: task.courseColor }} />
                    <button
                      onClick={() => toggleComplete(task.id)}
                      className={`mt-1.5 size-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${done ? "border-green-500 bg-green-500/20" : "border-border hover:border-primary"}`}
                    >
                      {done && <CheckCircle2 className="size-3 text-green-500" />}
                    </button>
                    <div className="flex-1 space-y-3 min-w-0">
                      <div>
                        <div className="flex items-start gap-2 flex-wrap">
                          <h4 className={`font-semibold ${done ? "line-through text-muted-foreground" : ""}`}>{task.title}</h4>
                          {task.priority === "high" && daysLeft <= 2 && !done && (
                            <span className="flex items-center gap-1 text-xs text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full">
                              <AlertCircle className="size-3" /> Urgent
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap mt-1">
                          <span className="flex items-center gap-1.5"><Calendar className="size-4" />{getDaysUntilDue(task.due)}</span>
                          <span className="flex items-center gap-1.5"><Clock className="size-4" />{task.duration}</span>
                          <span className="px-2 py-0.5 rounded-full bg-muted/50 text-xs" style={{ color: task.courseColor }}>{task.course}</span>
                          <span className="text-xs text-muted-foreground">Weight: {task.weight}%</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className={`px-3 py-1 rounded-full text-xs font-medium ${task.priority === "high" ? "bg-destructive/20 text-destructive" : task.priority === "medium" ? "bg-accent/20 text-accent" : "bg-muted/50 text-muted-foreground"}`}>
                          {task.priority === "high" ? "High Priority" : task.priority === "medium" ? "Medium Priority" : "Low Priority"}
                        </div>
                        <div className={`px-3 py-1 rounded-full text-xs font-medium ${task.energy === "Deep Work" ? "bg-primary/20 text-primary" : task.energy === "Medium Focus" ? "bg-accent/20 text-accent" : "bg-muted/50 text-muted-foreground"}`}>
                          {task.energy === "Deep Work" ? <Zap className="size-3 inline mr-1" /> : <Target className="size-3 inline mr-1" />}
                          {task.energy}
                        </div>
                        {!done && (
                          <div className="flex items-center gap-1 px-3 py-1 rounded-full text-xs bg-primary/10 text-primary border border-primary/20">
                            <Sparkles className="size-3" />
                            {task.aiTimeSlot}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Urgency Score */}
                    {!done && (
                      <div className="shrink-0 text-right">
                        <div className="text-xs text-muted-foreground mb-1">AI Score</div>
                        <div className={`text-lg font-bold ${urgency > 20 ? "text-red-400" : urgency > 10 ? "text-amber-400" : "text-muted-foreground"}`}>
                          {urgency.toFixed(0)}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Target className="size-12 mx-auto mb-4 opacity-50" />
              <p>No tasks found</p>
            </div>
          )}
        </div>

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
