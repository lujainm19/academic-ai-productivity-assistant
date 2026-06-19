import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

// ── Mock Canvas LMS Data ─────────────────────────────────────────────────────
export const canvasCourses = [
  {
    id: "cosc125", name: "COSC125 - Intro to Programming", color: "#6366f1",
    assignments: [
      { id: "a1", title: "Assignment 3", due: "2026-05-29", weight: 15, difficulty: 3, estimatedHours: 2.5, submitted: false },
      { id: "a2", title: "Quiz 5", due: "2026-06-01", weight: 5, difficulty: 2, estimatedHours: 0.5, submitted: false },
      { id: "a3", title: "Final Project Proposal", due: "2026-06-10", weight: 20, difficulty: 4, estimatedHours: 4, submitted: false },
    ]
  },
  {
    id: "bio201", name: "BIO201 - Cell Biology", color: "#10b981",
    assignments: [
      { id: "b1", title: "Chapter 7 Reading Notes", due: "2026-05-30", weight: 5, difficulty: 2, estimatedHours: 1, submitted: false },
      { id: "b2", title: "Lab Report 4", due: "2026-06-03", weight: 15, difficulty: 3, estimatedHours: 3, submitted: false },
    ]
  },
  {
    id: "math210", name: "MATH210 - Calculus II", color: "#f59e0b",
    assignments: [
      { id: "m1", title: "Problem Set 8", due: "2026-05-31", weight: 10, difficulty: 4, estimatedHours: 1.5, submitted: false },
      { id: "m2", title: "Midterm Review", due: "2026-06-07", weight: 25, difficulty: 5, estimatedHours: 5, submitted: false },
    ]
  },
  {
    id: "eng102", name: "ENG102 - Composition", color: "#ec4899",
    assignments: [
      { id: "e1", title: "Essay Outline", due: "2026-06-02", weight: 8, difficulty: 2, estimatedHours: 0.75, submitted: false },
      { id: "e2", title: "Rough Draft", due: "2026-06-09", weight: 20, difficulty: 3, estimatedHours: 3, submitted: false },
    ]
  },
  {
    id: "phys110", name: "PHYS110 - Physics I", color: "#8b5cf6",
    assignments: [
      { id: "p1", title: "Lab Report", due: "2026-06-03", weight: 15, difficulty: 4, estimatedHours: 3, submitted: false },
    ]
  }
];

// ── Mock Google Calendar Events ──────────────────────────────────────────────
export const calendarEvents = [
  { id: "c1", title: "COSC125 Lecture", day: "Mon", startHour: 9, endHour: 10, recurring: true, color: "#6366f1" },
  { id: "c2", title: "BIO201 Lab", day: "Mon", startHour: 14, endHour: 16, recurring: true, color: "#10b981" },
  { id: "c3", title: "MATH210 Lecture", day: "Tue", startHour: 11, endHour: 12, recurring: true, color: "#f59e0b" },
  { id: "c4", title: "Study Group - CS", day: "Tue", startHour: 17, endHour: 18, recurring: true, color: "#6366f1" },
  { id: "c5", title: "ENG102 Lecture", day: "Wed", startHour: 10, endHour: 11, recurring: true, color: "#ec4899" },
  { id: "c6", title: "PHYS110 Lecture", day: "Wed", startHour: 13, endHour: 14, recurring: true, color: "#8b5cf6" },
  { id: "c7", title: "COSC125 Lecture", day: "Thu", startHour: 9, endHour: 10, recurring: true, color: "#6366f1" },
  { id: "c8", title: "MATH210 Lecture", day: "Thu", startHour: 11, endHour: 12, recurring: true, color: "#f59e0b" },
  { id: "c9", title: "BIO201 Lecture", day: "Fri", startHour: 10, endHour: 11, recurring: true, color: "#10b981" },
  { id: "c10", title: "Gym / Wellness", day: "Fri", startHour: 16, endHour: 17, recurring: true, color: "#64748b" },
];

// ── Simulated Historical Productivity Patterns ───────────────────────────────
export const productivityPatterns = {
  peakHours: [19, 20, 21], // 7–10 PM
  averageFocusHoursPerDay: 4.2,
  longestFocusStreak: 12,
  preferredSessionLength: 28, // slightly above 25 for this student
  weakDays: ["Wed"], // tends to underperform
  strongDays: ["Thu", "Sat"],
  focusScoreByHour: {
    8: 45, 9: 52, 10: 60, 11: 65, 12: 50, 13: 42, 14: 55, 15: 58,
    16: 60, 17: 68, 18: 72, 19: 88, 20: 92, 21: 90, 22: 75, 23: 55
  },
  recentSessionLog: [
    { date: "2026-05-27", sessions: 4, totalMinutes: 120, longestSessionMin: 35 },
    { date: "2026-05-26", sessions: 5, totalMinutes: 148, longestSessionMin: 40 },
    { date: "2026-05-25", sessions: 3, totalMinutes: 90, longestSessionMin: 30 },
    { date: "2026-05-24", sessions: 6, totalMinutes: 180, longestSessionMin: 45 },
    { date: "2026-05-23", sessions: 4, totalMinutes: 110, longestSessionMin: 30 },
  ]
};

// ── Types ────────────────────────────────────────────────────────────────────
export type InsightType = "schedule" | "burnout" | "deadline" | "optimization" | "celebration" | "integration";
export type InsightPriority = "urgent" | "high" | "medium" | "low";

export interface AIInsight {
  id: string;
  type: InsightType;
  priority: InsightPriority;
  title: string;
  body: string;
  action?: string;
  actionLabel?: string;
  timestamp: Date;
  dismissed: boolean;
  course?: string;
  courseColor?: string;
  confidence: number; // 0-100
}

export interface SmartScheduleBlock {
  id: string;
  title: string;
  course: string;
  courseColor: string;
  day: string;
  startHour: number;
  endHour: number;
  type: "deep" | "review" | "break" | "class";
  aiGenerated: boolean;
  confidence: number;
  reason: string;
}

export interface WorkloadDay {
  day: string;
  label: string;
  workloadScore: number; // 0-100
  totalHoursNeeded: number;
  deadlines: number;
  freeHours: number;
}

export interface AIEngineState {
  // Data
  insights: AIInsight[];
  smartSchedule: SmartScheduleBlock[];
  workloadByDay: WorkloadDay[];
  burnoutRisk: number;
  adaptedPomoDuration: number;
  productivityScore: number;
  integrations: { name: string; status: "connected" | "syncing" | "error"; lastSync: string; }[];
  agentActionLog: { id: string; timestamp: Date; action: string; detail: string; impact: string; }[];
  // Actions
  dismissInsight: (id: string) => void;
  acceptSuggestion: (id: string) => void;
  triggerRescan: () => void;
  // State
  isAnalyzing: boolean;
  lastAnalyzed: Date;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function computeWorkloadByDay(): WorkloadDay[] {
  const today = new Date("2026-05-28");
  const days = ["Thu", "Fri", "Sat", "Sun", "Mon", "Tue", "Wed"];
  const labels = ["Today", "Fri 5/29", "Sat 5/30", "Sun 5/31", "Mon 6/1", "Tue 6/2", "Wed 6/3"];

  return days.map((day, i) => {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const dateStr = date.toISOString().split("T")[0];

    // Count assignments due on or very near this date
    let hoursNeeded = 0;
    let deadlinesOnDay = 0;

    canvasCourses.forEach(course => {
      course.assignments.forEach(a => {
        const dueDate = new Date(a.due);
        const diff = Math.ceil((dueDate.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
        if (diff >= 0 && diff <= 1) {
          deadlinesOnDay++;
          hoursNeeded += a.estimatedHours * 0.6; // partial prep weight
        } else if (diff === 2) {
          hoursNeeded += a.estimatedHours * 0.3;
        }
      });
    });

    // Add class time from calendar
    const classHours = calendarEvents
      .filter(e => e.day === day.slice(0, 3))
      .reduce((acc, e) => acc + (e.endHour - e.startHour), 0);

    const totalBusy = classHours + hoursNeeded;
    const freeHours = Math.max(0, 14 - totalBusy); // assume 14 usable hours/day
    const workloadScore = Math.min(100, Math.round((totalBusy / 10) * 100));

    return { day: days[i], label: labels[i], workloadScore, totalHoursNeeded: hoursNeeded, deadlines: deadlinesOnDay, freeHours };
  });
}

function computeBurnoutRisk(): number {
  const log = productivityPatterns.recentSessionLog;
  if (!log.length) return 20;
  const avgMinutes = log.reduce((a, b) => a + b.totalMinutes, 0) / log.length;
  const avgSessions = log.reduce((a, b) => a + b.sessions, 0) / log.length;
  const risk = Math.min(100, Math.round((avgMinutes / 180) * 50 + (avgSessions / 6) * 50));
  return risk;
}

function generateInsights(): AIInsight[] {
  const now = new Date();
  return [
    {
      id: "ins-1", type: "schedule", priority: "urgent", confidence: 94,
      title: "Critical Deadline Tomorrow",
      body: "COSC125 Assignment 3 is due tomorrow. Based on your pace and 2.5h estimate, start at 7 PM tonight during your peak focus window.",
      action: "schedule-cosc125",
      actionLabel: "Schedule Now",
      course: "COSC125", courseColor: "#6366f1",
      timestamp: now, dismissed: false
    },
    {
      id: "ins-2", type: "deadline", priority: "high", confidence: 88,
      title: "3 Deadlines This Week",
      body: "COSC125 (Thu), Bio Notes (Fri), Math Problems (Sat). Your Tuesday afternoon is free — ideal for getting ahead on Math.",
      action: "plan-week",
      actionLabel: "View Week Plan",
      timestamp: now, dismissed: false
    },
    {
      id: "ins-3", type: "optimization", priority: "medium", confidence: 91,
      title: "Peak Hours Detected",
      body: "You consistently enter deep focus between 7–10 PM with 92% focus score. All deep work tasks have been scheduled in this window.",
      timestamp: now, dismissed: false
    },
    {
      id: "ins-4", type: "burnout", priority: "medium", confidence: 78,
      title: "Elevated Session Load",
      body: "You've averaged 5.2 sessions/day over 5 days. Consider capping at 4 sessions today and taking a longer 20-min break after session 3.",
      action: "adapt-session",
      actionLabel: "Adapt Today's Plan",
      timestamp: now, dismissed: false
    },
    {
      id: "ins-5", type: "optimization", priority: "low", confidence: 85,
      title: "Wednesday Pattern",
      body: "Your focus drops ~30% on Wednesdays. The AI has moved Wednesday's biology reading to Monday evening to protect your performance.",
      timestamp: now, dismissed: false
    },
    {
      id: "ins-6", type: "celebration", priority: "low", confidence: 100,
      title: "12-Day Streak!",
      body: "You've studied every day for 12 consecutive days. Your productivity is 15% above your weekly baseline. Keep it up!",
      timestamp: now, dismissed: false
    },
    {
      id: "ins-7", type: "integration", priority: "medium", confidence: 96,
      title: "Canvas Sync Complete",
      body: "Pulled 8 upcoming assignments across 5 courses. Detected 2 weight-heavy exams in the next 14 days. Study plan updated automatically.",
      timestamp: now, dismissed: false
    },
  ];
}

function generateSmartSchedule(): SmartScheduleBlock[] {
  return [
    { id: "s1", title: "COSC125 Assignment 3", course: "COSC125", courseColor: "#6366f1", day: "Thu", startHour: 19, endHour: 21, type: "deep", aiGenerated: true, confidence: 94, reason: "Peak focus window + urgent deadline" },
    { id: "s2", title: "Bio Chapter 7 Notes", course: "BIO201", courseColor: "#10b981", day: "Fri", startHour: 20, endHour: 21, type: "review", aiGenerated: true, confidence: 87, reason: "Moved from Wed (low perf day)" },
    { id: "s3", title: "Math Problem Set 8", course: "MATH210", courseColor: "#f59e0b", day: "Fri", startHour: 18, endHour: 19, type: "deep", aiGenerated: true, confidence: 89, reason: "Due Saturday, Friday evening slot free" },
    { id: "s4", title: "Physics Lab Report", course: "PHYS110", courseColor: "#8b5cf6", day: "Sun", startHour: 19, endHour: 21, type: "deep", aiGenerated: true, confidence: 82, reason: "High-weight task, peak window on Sunday" },
    { id: "s5", title: "Essay Outline", course: "ENG102", courseColor: "#ec4899", day: "Mon", startHour: 17, endHour: 18, type: "review", aiGenerated: true, confidence: 85, reason: "Low-energy task, pre-dinner slot" },
    { id: "s6", title: "COSC125 Final Project Start", course: "COSC125", courseColor: "#6366f1", day: "Tue", startHour: 19, endHour: 21, type: "deep", aiGenerated: true, confidence: 80, reason: "Light deadline week ahead, ideal to start early" },
  ];
}

function generateAgentLog() {
  return [
    { id: "log-1", timestamp: new Date("2026-05-28T08:30:00"), action: "Canvas Sync", detail: "Pulled 8 assignments from 5 courses", impact: "Study plan updated with 3 new blocks" },
    { id: "log-2", timestamp: new Date("2026-05-28T08:31:00"), action: "Schedule Optimization", detail: "Moved Bio reading from Wed → Mon (low performance pattern)", impact: "Projected focus score +12%" },
    { id: "log-3", timestamp: new Date("2026-05-28T08:31:30"), action: "Priority Reorder", detail: "Elevated COSC125 A3 to critical — due in 1 day", impact: "Added urgent insight card" },
    { id: "log-4", timestamp: new Date("2026-05-28T08:32:00"), action: "Burnout Detection", detail: "5-day rolling average: 130 min/day → moderate risk", impact: "Suggested session cap for today" },
    { id: "log-5", timestamp: new Date("2026-05-28T08:32:30"), action: "Pomodoro Adaptation", detail: "Task type is deep work; extended session to 35 min", impact: "Estimated 18% better retention" },
    { id: "log-6", timestamp: new Date("2026-05-27T21:15:00"), action: "Focus Pattern Update", detail: "Confirmed peak window 7–10 PM (92% focus score)", impact: "All deep tasks rescheduled to evenings" },
    { id: "log-7", timestamp: new Date("2026-05-27T10:00:00"), action: "Google Calendar Sync", detail: "Detected 9 class blocks and 1 study group event", impact: "Free windows mapped for study scheduling" },
  ];
}

// ── Context ──────────────────────────────────────────────────────────────────
const AIEngineContext = createContext<AIEngineState | null>(null);

export function AIEngineProvider({ children }: { children: ReactNode }) {
  const [insights, setInsights] = useState<AIInsight[]>(generateInsights());
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastAnalyzed, setLastAnalyzed] = useState(new Date());

  const workloadByDay = computeWorkloadByDay();
  const burnoutRisk = computeBurnoutRisk();
  const smartSchedule = generateSmartSchedule();
  const agentActionLog = generateAgentLog();

  const adaptedPomoDuration = (() => {
    const hour = new Date().getHours();
    const score = productivityPatterns.focusScoreByHour[hour as keyof typeof productivityPatterns.focusScoreByHour] ?? 60;
    if (score >= 85) return 35;
    if (score >= 65) return 28;
    return 20;
  })();

  const productivityScore = Math.min(100, Math.round(
    (productivityPatterns.recentSessionLog.slice(-3).reduce((a, b) => a + b.totalMinutes, 0) / 3 / 150) * 100
  ));

  const integrations = [
    { name: "Google Calendar", status: "connected" as const, lastSync: "2 min ago" },
    { name: "Canvas LMS", status: "connected" as const, lastSync: "8 min ago" },
  ];

  const dismissInsight = useCallback((id: string) => {
    setInsights(prev => prev.map(ins => ins.id === id ? { ...ins, dismissed: true } : ins));
  }, []);

  const acceptSuggestion = useCallback((id: string) => {
    setInsights(prev => prev.map(ins => ins.id === id ? { ...ins, dismissed: true } : ins));
  }, []);

  const triggerRescan = useCallback(() => {
    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);
      setLastAnalyzed(new Date());
    }, 2200);
  }, []);

  // Simulate periodic re-analysis
  useEffect(() => {
    const interval = setInterval(() => {
      setIsAnalyzing(true);
      setTimeout(() => {
        setIsAnalyzing(false);
        setLastAnalyzed(new Date());
      }, 1500);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <AIEngineContext.Provider value={{
      insights,
      smartSchedule,
      workloadByDay,
      burnoutRisk,
      adaptedPomoDuration,
      productivityScore,
      integrations,
      agentActionLog,
      dismissInsight,
      acceptSuggestion,
      triggerRescan,
      isAnalyzing,
      lastAnalyzed,
    }}>
      {children}
    </AIEngineContext.Provider>
  );
}

export function useAIEngine(): AIEngineState {
  const ctx = useContext(AIEngineContext);
  if (!ctx) throw new Error("useAIEngine must be used within AIEngineProvider");
  return ctx;
}
