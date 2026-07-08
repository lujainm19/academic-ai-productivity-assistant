import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { toLocalDateStr } from "../lib/date";

export interface Task {
  id: string;
  title: string;
  due: string;
  dueDate: string | null; // ISO yyyy-mm-dd, so downstream logic (workload, insights) can reason about actual dates instead of parsing the display label
  priority: "high" | "medium";
  completed: boolean;
  completedAt: string | null; // ISO string, so it survives localStorage round-trips
  createdAt: number;
}

export interface UserStats {
  xp: number;
  level: number;
  streak: number;
  lastActiveDate: string | null;
  tasksCompleted: number;
}

export interface Badge {
  id: string;
  title: string;
  description: string;
  emoji: string;
}

interface LocalDataContextValue {
  tasks: Task[];
  stats: UserStats;
  addTask: (title: string, due: string, priority: "high" | "medium", dueDate?: string | null) => void;
  completeTask: (id: string) => { xpGained: number; isLate: boolean };
  deleteTask: (id: string) => void;
  pendingBadgeUnlocks: Badge[];
  dismissBadgeUnlock: (id: string) => void;
  resetProgress: () => void;
}

const LocalDataContext = createContext<LocalDataContextValue | null>(null);

const TASKS_KEY = "adaptive.tasks";
const STATS_KEY = "adaptive.stats";
const BADGES_KEY = "adaptive.badges";
// Full XP for finishing on time (or early), reduced XP for finishing after
// the due date - the gap is the motivating nudge to not let tasks slip.
const XP_ON_TIME = 20;
const XP_LATE = 8;
const XP_PER_LEVEL = 500;

// Milestones checked against `stats` every time it changes. Ordered roughly
// by how soon a real user hits them, so early wins land quickly.
const BADGE_DEFS: (Badge & { check: (s: UserStats) => boolean })[] = [
  { id: "first-task", title: "First Steps", description: "Completed your first task", emoji: "🎉", check: s => s.tasksCompleted >= 1 },
  { id: "streak-3", title: "Getting Started", description: "3-day streak", emoji: "🌱", check: s => s.streak >= 3 },
  { id: "streak-7", title: "Week Warrior", description: "7-day streak", emoji: "🔥", check: s => s.streak >= 7 },
  { id: "streak-14", title: "Two-Week Titan", description: "14-day streak", emoji: "⚡", check: s => s.streak >= 14 },
  { id: "streak-30", title: "Unstoppable", description: "30-day streak", emoji: "🏆", check: s => s.streak >= 30 },
  { id: "level-5", title: "Rising Star", description: "Reached Level 5", emoji: "⭐", check: s => s.level >= 5 },
  { id: "level-10", title: "Achiever", description: "Reached Level 10", emoji: "🎖️", check: s => s.level >= 10 },
  { id: "level-20", title: "Master Scholar", description: "Reached Level 20", emoji: "👑", check: s => s.level >= 20 },
  { id: "xp-1000", title: "XP Hoarder", description: "Earned 1,000 XP", emoji: "💎", check: s => s.xp >= 1000 },
];

function todayStr() {
  return toLocalDateStr(new Date());
}

function loadTasks(): Task[] {
  try {
    const raw = localStorage.getItem(TASKS_KEY);
    return raw ? (JSON.parse(raw) as Task[]) : [];
  } catch {
    return [];
  }
}

// `completedTasksFallback` backfills tasksCompleted for stats saved before
// that field existed, from the real completed-task count - so a returning
// user with existing history doesn't get wrongly told this is their "first"
// task the next time they finish one.
function loadStats(completedTasksFallback: number): UserStats {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<UserStats>;
      return {
        xp: parsed.xp ?? 0,
        level: parsed.level ?? 1,
        streak: parsed.streak ?? 0,
        lastActiveDate: parsed.lastActiveDate ?? null,
        tasksCompleted: parsed.tasksCompleted ?? completedTasksFallback,
      };
    }
  } catch {
    // fall through to defaults
  }
  return { xp: 0, level: 1, streak: 0, lastActiveDate: null, tasksCompleted: completedTasksFallback };
}

// First run ever (no saved badge list): silently seed whatever's already
// earned so returning users aren't hit with a wall of unlock toasts for
// progress they made before this feature existed.
function loadBadgeIds(stats: UserStats): string[] {
  try {
    const raw = localStorage.getItem(BADGES_KEY);
    if (raw) return JSON.parse(raw) as string[];
  } catch {
    // fall through to seeding
  }
  return BADGE_DEFS.filter(b => b.check(stats)).map(b => b.id);
}

export function LocalDataProvider({ children }: { children: ReactNode }) {
  // Lazy initializers so the very first render already has whatever was
  // saved last time - no flash of empty state, no example/demo tasks.
  const [tasks, setTasks] = useState<Task[]>(loadTasks);
  const [stats, setStats] = useState<UserStats>(() => loadStats(tasks.filter(t => t.completed).length));
  const [unlockedBadgeIds, setUnlockedBadgeIds] = useState<string[]>(() => loadBadgeIds(stats));
  const [pendingBadgeUnlocks, setPendingBadgeUnlocks] = useState<Badge[]>([]);

  // Every change (add, complete, delete) writes straight to localStorage,
  // so switching pages or refreshing never loses or resurrects a task.
  useEffect(() => {
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  }, [stats]);

  useEffect(() => {
    localStorage.setItem(BADGES_KEY, JSON.stringify(unlockedBadgeIds));
  }, [unlockedBadgeIds]);

  // Whenever xp/level/streak change, see if any new milestone was crossed.
  useEffect(() => {
    setUnlockedBadgeIds(prevUnlocked => {
      const newly = BADGE_DEFS.filter(b => b.check(stats) && !prevUnlocked.includes(b.id));
      if (newly.length === 0) return prevUnlocked;
      setPendingBadgeUnlocks(prevPending => [...prevPending, ...newly]);
      return [...prevUnlocked, ...newly.map(b => b.id)];
    });
  }, [stats]);

  const dismissBadgeUnlock = useCallback((id: string) => {
    setPendingBadgeUnlocks(prev => prev.filter(b => b.id !== id));
  }, []);

  const addTask = (title: string, due: string, priority: "high" | "medium", dueDate: string | null = null) => {
    const task: Task = {
      id: crypto.randomUUID(),
      title,
      due,
      dueDate,
      priority,
      completed: false,
      completedAt: null,
      createdAt: Date.now(),
    };
    setTasks(prev => [task, ...prev]);
  };

  const completeTask = (id: string) => {
    const today = todayStr();
    const task = tasks.find(t => t.id === id);
    const isLate = !!task?.dueDate && task.dueDate < today;
    const xpGained = isLate ? XP_LATE : XP_ON_TIME;

    const nowIso = new Date().toISOString();
    setTasks(prev => prev.map(t => (t.id === id ? { ...t, completed: true, completedAt: nowIso } : t)));

    setStats(prev => {
      const newXp = prev.xp + xpGained;
      const newLevel = Math.floor(newXp / XP_PER_LEVEL) + 1;
      let newStreak = prev.streak;
      if (prev.lastActiveDate !== today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = toLocalDateStr(yesterday);
        newStreak = prev.lastActiveDate === yesterdayStr ? prev.streak + 1 : 1;
      }
      return { xp: newXp, level: newLevel, streak: newStreak, lastActiveDate: today, tasksCompleted: prev.tasksCompleted + 1 };
    });

    return { xpGained, isLate };
  };

  const deleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  // Wipes everything gamification/task-related back to a brand-new-install
  // state. Customization settings (theme, study mode, etc.) live under a
  // separate key and are intentionally left untouched.
  const resetProgress = useCallback(() => {
    setTasks([]);
    setStats({ xp: 0, level: 1, streak: 0, lastActiveDate: null, tasksCompleted: 0 });
    setUnlockedBadgeIds([]);
    setPendingBadgeUnlocks([]);
  }, []);

  return (
    <LocalDataContext.Provider value={{ tasks, stats, addTask, completeTask, deleteTask, pendingBadgeUnlocks, dismissBadgeUnlock, resetProgress }}>
      {children}
    </LocalDataContext.Provider>
  );
}

export function useLocalData() {
  const ctx = useContext(LocalDataContext);
  if (!ctx) throw new Error("useLocalData must be used within LocalDataProvider");
  return ctx;
}