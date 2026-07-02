import { motion } from "motion/react";
import { Trophy, Flame, Zap, Star, Award, TrendingUp, Calendar, Target, Brain, Clock } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts";
import { useCustomization } from "./customization-context";

const weeklyData = [
  { day: "Mon", hours: 3.5, tasks: 4 },
  { day: "Tue", hours: 4.2, tasks: 5 },
  { day: "Wed", hours: 2.8, tasks: 3 },
  { day: "Thu", hours: 5.1, tasks: 6 },
  { day: "Fri", hours: 3.9, tasks: 4 },
  { day: "Sat", hours: 6.2, tasks: 7 },
  { day: "Sun", hours: 4.5, tasks: 5 }
];

const achievements = [
  { id: 1, icon: Flame, title: "Week Warrior", description: "7-day focus streak", unlocked: true, color: "from-orange-500 to-red-500" },
  { id: 2, icon: Zap, title: "Deep Focus Master", description: "Complete 50 focus sessions", unlocked: true, color: "from-blue-500 to-purple-500" },
  { id: 3, icon: Star, title: "Early Bird", description: "Start 5 sessions before 8 AM", unlocked: true, color: "from-yellow-500 to-orange-500" },
  { id: 4, icon: Trophy, title: "Task Crusher", description: "Complete 100 tasks", unlocked: false, color: "from-purple-500 to-pink-500", progress: 67 },
  { id: 5, icon: Target, title: "Deadline Keeper", description: "No missed deadlines this month", unlocked: false, color: "from-green-500 to-teal-500", progress: 85 },
  { id: 6, icon: Brain, title: "Study Sage", description: "Study for 100 hours total", unlocked: false, color: "from-indigo-500 to-blue-500", progress: 42 }
];

const stats = [
  { label: "Total Focus Hours", value: "156.5", icon: Clock, change: "+12%", color: "text-blue-500" },
  { label: "Tasks Completed", value: "67", icon: Target, change: "+8%", color: "text-green-500" },
  { label: "Current Streak", value: "12", icon: Flame, change: "+3", color: "text-orange-500" },
  { label: "Avg Daily Focus", value: "4.2h", icon: TrendingUp, change: "+15%", color: "text-purple-500" }
];

export function ProgressPage() {
  const currentLevel = 8;
  const currentXP = 1240;
  const nextLevelXP = 2000;
  const xpProgress = (currentXP / nextLevelXP) * 100;
  const { savedMode } = useCustomization();

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-4xl font-bold mb-2">Your Progress</h1>
          <p className="text-muted-foreground">
            {savedMode === "cozy"        ? "Every step forward counts 🌿 Be proud of how far you've come." :
            savedMode === "competitive" ? "Dominate your goals ⚡ Push harder, level up faster." :
                                           "Your team is watching 👥 Lead by example this week."}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-8 rounded-2xl bg-gradient-to-br from-primary/10 via-accent/10 to-primary/10 border border-primary/20"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-3xl font-bold mb-1">Level {currentLevel}</h2>
              <p className="text-muted-foreground">
                {savedMode === "cozy"        ? "Gentle Scholar 🌿" :
                savedMode === "competitive" ? "Grind Mode ⚡" :
                                               "Team Player 👥"}
</p>
            </div>
            <div className="size-20 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/25">
              <Trophy className="size-10 text-white" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{currentXP} / {nextLevelXP} XP</span>
              <span className="font-semibold text-primary">{nextLevelXP - currentXP} XP to Level {currentLevel + 1}</span>
            </div>
            <div className="h-3 rounded-full bg-secondary overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${xpProgress}%` }}
                transition={{ duration: 1, delay: 0.3 }}
                className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
                style={{ boxShadow: "0 0 20px var(--glow-blue)" }}
              />
            </div>
          </div>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.05 }}
              className="p-6 rounded-xl bg-card border border-border hover:border-primary/50 transition-all"
            >
              <div className="flex items-center justify-between mb-4">
                <stat.icon className={`size-6 ${stat.color}`} />
                <span className="text-sm text-green-500 font-semibold">{stat.change}</span>
              </div>
              <div className="text-3xl font-bold mb-1">{stat.value}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="p-6 rounded-2xl bg-card border border-border"
        >
          <h2 className="text-xl font-semibold mb-6">This Week's Activity</h2>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={weeklyData}>
              <defs>
                <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="day" stroke="var(--color-muted-foreground)" />
              <YAxis stroke="var(--color-muted-foreground)" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--color-card)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "0.5rem"
                }}
              />
              <Area
                type="monotone"
                dataKey="hours"
                stroke="var(--color-primary)"
                strokeWidth={2}
                fill="url(#colorHours)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <h2 className="text-xl font-semibold mb-4">Achievements</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {achievements.map((achievement, i) => (
              <motion.div
                key={achievement.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6 + i * 0.05 }}
                className={`relative p-6 rounded-xl border transition-all ${
                  achievement.unlocked
                    ? "bg-card border-border hover:border-primary/50"
                    : "bg-card/50 border-border/50 opacity-75"
                }`}
              >
                {!achievement.unlocked && achievement.progress && (
                  <div className="absolute top-3 right-3 px-2 py-1 rounded-full bg-primary/20 text-primary text-xs font-semibold">
                    {achievement.progress}%
                  </div>
                )}
                <div className={`size-14 rounded-xl bg-gradient-to-br ${achievement.color} flex items-center justify-center mb-4 ${
                  achievement.unlocked ? "shadow-lg" : "opacity-50"
                }`}>
                  <achievement.icon className="size-7 text-white" />
                </div>
                <h3 className="font-semibold mb-1">{achievement.title}</h3>
                <p className="text-sm text-muted-foreground mb-3">{achievement.description}</p>
                {!achievement.unlocked && achievement.progress && (
                  <div className="h-2 rounded-full bg-secondary overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r ${achievement.color} rounded-full`}
                      style={{ width: `${achievement.progress}%` }}
                    />
                  </div>
                )}
                {achievement.unlocked && (
                  <div className="flex items-center gap-1 text-xs text-primary">
                    <Award className="size-3" />
                    Unlocked
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="p-6 rounded-2xl bg-gradient-to-br from-green-500/10 to-teal-500/10 border border-green-500/20"
        >
          <div className="flex items-center gap-3 mb-3">
            <TrendingUp className="size-6 text-green-500" />
            <h3 className="font-semibold">This Month's Insights</h3>
          </div>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div className="p-4 rounded-xl bg-card/50 backdrop-blur-sm">
              <p className="text-muted-foreground mb-1">Best Focus Time</p>
              <p className="font-semibold">7:00 PM - 10:00 PM</p>
            </div>
            <div className="p-4 rounded-xl bg-card/50 backdrop-blur-sm">
              <p className="text-muted-foreground mb-1">Most Productive Day</p>
              <p className="font-semibold">Saturday (avg 6.2h)</p>
            </div>
            <div className="p-4 rounded-xl bg-card/50 backdrop-blur-sm">
              <p className="text-muted-foreground mb-1">Favorite Environment</p>
              <p className="font-semibold">Rainy Café</p>
            </div>
            <div className="p-4 rounded-xl bg-card/50 backdrop-blur-sm">
              <p className="text-muted-foreground mb-1">Completion Rate</p>
              <p className="font-semibold">89% (67/75 tasks)</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
