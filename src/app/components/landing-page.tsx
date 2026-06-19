import { motion } from "motion/react";
import { Brain, Target, Zap, Trophy, TrendingUp, Users, ArrowRight, Sparkles, Timer, BookOpen } from "lucide-react";
import { useNavigate } from "react-router";

export function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Brain className="size-5 text-white" />
            </div>
            <span className="font-semibold">Adaptive Productivity</span>
          </div>
          <button
            onClick={() => navigate("/dashboard")}
            className="px-5 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-all"
          >
            Get Started
          </button>
        </div>
      </nav>

      <section className="relative min-h-screen flex items-center justify-center px-6 pt-20">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 size-96 bg-primary/20 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 size-96 bg-accent/20 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-5xl mx-auto text-center space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card/50 backdrop-blur-sm border border-border/50"
          >
            <Sparkles className="size-4 text-primary" />
            <span className="text-sm text-muted-foreground">AI-powered student productivity platform</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl md:text-7xl font-bold tracking-tight"
          >
            Productivity that adapts to
            <br />
            <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
              how you work best
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xl text-muted-foreground max-w-2xl mx-auto"
          >
            Combine tasks, deep focus sessions, and AI insights in one beautiful platform designed specifically for students.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex items-center gap-4 justify-center flex-wrap"
          >
            <button
              onClick={() => navigate("/dashboard")}
              className="px-8 py-4 rounded-xl bg-primary text-primary-foreground hover:scale-105 transition-all flex items-center gap-2 shadow-lg shadow-primary/25"
            >
              Start Focusing Now
              <ArrowRight className="size-5" />
            </button>
            <button className="px-8 py-4 rounded-xl bg-card border border-border hover:bg-secondary transition-all">
              Watch Demo
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="mt-16 relative"
          >
            <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 rounded-2xl blur-2xl" />
            <img
              src="https://images.unsplash.com/photo-1510519138101-570d1dca3d66?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1200"
              alt="Productivity Dashboard Preview"
              className="relative rounded-2xl border border-border/50 shadow-2xl"
            />
          </motion.div>
        </div>
      </section>

      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-4xl font-bold">Everything you need to study smarter</h2>
            <p className="text-muted-foreground text-lg">Powerful features that adapt to your unique learning style</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Brain,
                title: "AI Study Assistant",
                description: "Get personalized study recommendations, schedule optimization, and smart workload balancing.",
                color: "from-blue-500 to-purple-500"
              },
              {
                icon: Timer,
                title: "Immersive Focus Sessions",
                description: "Pomodoro timers in beautiful, customizable environments. Stay focused, stay motivated.",
                color: "from-purple-500 to-pink-500"
              },
              {
                icon: Target,
                title: "Smart Task Planning",
                description: "Auto-prioritize tasks by energy level, deadline, and your personal productivity patterns.",
                color: "from-pink-500 to-orange-500"
              },
              {
                icon: Trophy,
                title: "Healthy Gamification",
                description: "Track streaks, earn achievements, and level up without toxic competition.",
                color: "from-orange-500 to-yellow-500"
              },
              {
                icon: TrendingUp,
                title: "Productivity Analytics",
                description: "Understand your focus patterns, peak hours, and progress over time.",
                color: "from-green-500 to-teal-500"
              },
              {
                icon: BookOpen,
                title: "Multiple Study Modes",
                description: "Switch between Cozy, Competitive, and Collaborative modes to match your mood.",
                color: "from-teal-500 to-blue-500"
              }
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group relative p-6 rounded-2xl bg-card border border-border hover:border-primary/50 transition-all"
              >
                <div className={`size-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <feature.icon className="size-6 text-white" />
                </div>
                <h3 className="font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 px-6 bg-card/30">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl font-bold mb-4">Join thousands of students studying smarter</h2>
            <p className="text-muted-foreground text-lg mb-8">
              Stop fighting distractions. Start achieving your academic goals with an AI assistant that understands you.
            </p>
            <button
              onClick={() => navigate("/dashboard")}
              className="px-10 py-5 rounded-xl bg-primary text-primary-foreground hover:scale-105 transition-all flex items-center gap-2 mx-auto shadow-lg shadow-primary/25"
            >
              Get Started Free
              <ArrowRight className="size-5" />
            </button>
          </motion.div>

          <div className="grid grid-cols-3 gap-8 pt-12 border-t border-border/50">
            <div>
              <div className="text-3xl font-bold text-primary">50K+</div>
              <div className="text-sm text-muted-foreground">Active Students</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary">2M+</div>
              <div className="text-sm text-muted-foreground">Focus Hours</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary">4.9★</div>
              <div className="text-sm text-muted-foreground">Student Rating</div>
            </div>
          </div>
        </div>
      </section>

      <footer className="py-12 px-6 border-t border-border/50">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Brain className="size-5 text-white" />
            </div>
            <span className="font-semibold">Adaptive Productivity</span>
          </div>
          <p className="text-sm text-muted-foreground">© 2026 Adaptive Productivity. Built for students, by students.</p>
        </div>
      </footer>
    </div>
  );
}
