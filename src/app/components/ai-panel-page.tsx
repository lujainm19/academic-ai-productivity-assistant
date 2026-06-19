import { motion } from "motion/react";
import { Brain, Send, User, Sparkles, Calendar, Target, TrendingUp, Zap } from "lucide-react";
import { useState, useRef, useEffect } from "react";

interface ChatMessage {
  role: "ai" | "user";
  content: string;
  timestamp: Date;
}

const initialMessages: ChatMessage[] = [
  {
    role: "ai",
    content: "Hey Alex! I've analyzed your schedule and found some important patterns.\n\nYou have **3 deadlines this week** — here's my recommended study plan:\n\n📌 Tonight 7–9 PM → COSC125 Assignment 3 (due tomorrow)\n📌 Friday 6–7 PM → Math Problem Set 8\n📌 Friday 8–9 PM → Bio Chapter 7 Notes\n📌 Sunday 7–9 PM → Physics Lab Report\n\nI moved Bio from Wednesday because your focus drops ~30% on that day. Want me to explain any of these choices?",
    timestamp: new Date(Date.now() - 5 * 60000)
  },
  {
    role: "user",
    content: "Why did you schedule COSC125 tonight specifically?",
    timestamp: new Date(Date.now() - 4 * 60000)
  },
  {
    role: "ai",
    content: "Great question! COSC125 Assignment 3 is due **tomorrow**, so it's your most urgent task right now.\n\nI also noticed you consistently hit your peak focus between **7–10 PM**. That's when your session quality is highest based on your history. Coding tasks like COSC125 benefit most from this window since they require deep concentration.\n\nI've estimated it will take about 2.5 hours — fits perfectly in tonight's slot with time to review before you sleep.",
    timestamp: new Date(Date.now() - 3 * 60000)
  },
];

const quickPrompts = [
  { icon: Calendar, label: "What's my schedule this week?" },
  { icon: Target, label: "Which task should I start now?" },
  { icon: TrendingUp, label: "How's my productivity trending?" },
  { icon: Zap, label: "When is my next peak focus window?" },
];

const aiResponses: Record<string, string> = {
  schedule: "This week you have 3 deadlines:\n\n• **COSC125 Assignment 3** — Tomorrow\n• **Math Problem Set 8** — Saturday\n• **Bio Chapter 7 Notes** — Saturday\n• **Physics Lab Report** — Wednesday (next week)\n\nYour heaviest day is Friday. I've distributed your study sessions across your free peak-hour windows to keep things balanced.",
  start: "Right now, I'd recommend starting **COSC125 Assignment 3** — it's due tomorrow and requires about 2.5 hours of deep work. You're currently approaching your peak focus window (7–10 PM), which is ideal for coding tasks.\n\nHead to the Focus Session page and I'll have it pre-loaded for you.",
  productivity: "Your productivity this week is tracking **15% above your baseline**! You've maintained a 12-day study streak and averaged 4.2 hours of focused work per day.\n\nYour strongest session was Saturday with 6.2 hours. Keep maintaining consistent evening sessions — that's when you perform best.",
  peak: "Your next peak focus window starts at **7:00 PM** tonight. Based on your patterns, your focus score reaches 88–92/100 between 7 and 10 PM — that's your optimal deep work period.\n\nI've already scheduled your most cognitively demanding tasks (COSC125, Physics) during these windows.",
  default: "I'm analyzing that based on your current workload and patterns. You have 3 upcoming deadlines and your productivity score is strong this week at 78/100.\n\nIs there a specific task, deadline, or study pattern you'd like me to dig into?",
  break: "Based on your session history, you've averaged 128 minutes of focus today. A 15-minute break now would help you maintain quality for your evening session.\n\nI'd suggest stepping away from screens — a short walk or light stretching helps reset focus effectively.",
};

function TypewriterText({ content, onDone }: { content: string; onDone?: () => void }) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (done) return;
    let i = 0;
    const interval = setInterval(() => {
      setDisplayed(content.slice(0, i + 1));
      i++;
      if (i >= content.length) {
        setDone(true);
        clearInterval(interval);
        onDone?.();
      }
    }, 10);
    return () => clearInterval(interval);
  }, [content]);

  return <span className="whitespace-pre-wrap">{done ? content : displayed}</span>;
}

function formatMessage(content: string) {
  return content.split("\n").map((line, i) => {
    const boldified = line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    return <p key={i} className={line === "" ? "h-2" : "leading-relaxed"} dangerouslySetInnerHTML={{ __html: boldified }} />;
  });
}

export function AIPanelPage() {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [lastAiIndex, setLastAiIndex] = useState<number | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const sendMessage = (text: string) => {
    if (!text.trim() || isTyping) return;
    const userMsg: ChatMessage = { role: "user", content: text, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    setTimeout(() => {
      const lower = text.toLowerCase();
      const reply =
        lower.includes("schedule") || lower.includes("week") ? aiResponses.schedule
        : lower.includes("start") || lower.includes("now") || lower.includes("which") ? aiResponses.start
        : lower.includes("productiv") || lower.includes("trend") || lower.includes("progress") ? aiResponses.productivity
        : lower.includes("peak") || lower.includes("focus window") || lower.includes("when") ? aiResponses.peak
        : lower.includes("break") || lower.includes("rest") ? aiResponses.break
        : aiResponses.default;

      const aiMsg: ChatMessage = { role: "ai", content: reply, timestamp: new Date() };
      setMessages(prev => {
        const next = [...prev, aiMsg];
        setLastAiIndex(next.length - 1);
        return next;
      });
      setIsTyping(false);
    }, 1000 + Math.random() * 500);
  };

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="shrink-0 p-6 border-b border-border flex items-center gap-4"
      >
        <div className="size-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/25">
          <Brain className="size-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">AI Assistant</h1>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="size-2 rounded-full bg-green-500 animate-pulse inline-block" />
            Active · Monitoring your schedule
          </div>
        </div>
      </motion.div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
        {messages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i < initialMessages.length ? 0 : 0.1 }}
            className={`flex items-start gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
          >
            <div className={`size-9 rounded-full flex items-center justify-center shrink-0 ${
              msg.role === "ai"
                ? "bg-gradient-to-br from-primary to-accent shadow-md shadow-primary/20"
                : "bg-secondary border border-border"
            }`}>
              {msg.role === "ai"
                ? <Brain className="size-4 text-white" />
                : <User className="size-4 text-foreground" />
              }
            </div>
            <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm ${
              msg.role === "ai"
                ? "bg-card border border-border text-foreground rounded-tl-sm"
                : "bg-primary text-primary-foreground rounded-tr-sm"
            }`}>
              {i === lastAiIndex && msg.role === "ai"
                ? <TypewriterText content={msg.content} />
                : formatMessage(msg.content)
              }
              <p className={`text-xs mt-2 ${msg.role === "ai" ? "text-muted-foreground" : "text-primary-foreground/60"}`}>
                {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </motion.div>
        ))}

        {isTyping && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-3"
          >
            <div className="size-9 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-md shadow-primary/20">
              <Brain className="size-4 text-white" />
            </div>
            <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-card border border-border">
              <div className="flex gap-1.5 items-center h-4">
                {[0, 1, 2].map(i => (
                  <span key={i} className="size-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          </motion.div>
        )}
        <div ref={endRef} />
      </div>

      {/* Quick Prompts */}
      {messages.length <= initialMessages.length && (
        <div className="shrink-0 px-6 pb-2">
          <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
            <Sparkles className="size-3" /> Quick actions
          </p>
          <div className="flex gap-2 flex-wrap">
            {quickPrompts.map((p, i) => (
              <button
                key={i}
                onClick={() => sendMessage(p.label)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-card border border-border hover:border-primary/50 hover:bg-secondary transition-all text-sm"
              >
                <p.icon className="size-3.5 text-primary" />
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="shrink-0 p-4 border-t border-border">
        <div className="flex items-center gap-3 p-2 rounded-2xl bg-card border border-border focus-within:border-primary transition-all">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage(input)}
            placeholder="Ask anything about your schedule, tasks, or study patterns…"
            className="flex-1 bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-muted-foreground"
            disabled={isTyping}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isTyping}
            className="size-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            <Send className="size-4" />
          </button>
        </div>
        <p className="text-xs text-muted-foreground text-center mt-2">AI responses are based on your Canvas data and productivity patterns</p>
      </div>
    </div>
  );
}
