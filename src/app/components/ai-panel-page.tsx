// ai-panel-page.tsx
// Prodigy AI chat page — powered by Gemini via the backend /api/ai/chat endpoint.
// Sends the full conversation history with every message so Prodigy remembers
// the context of the ongoing conversation, not just the last message.

import { motion } from "motion/react";
import { Send, User, Sparkles, Calendar, Target, TrendingUp, Zap, AlertCircle } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { ProdigyMark } from "./prodigy-mark";
import { useLocalData } from "./local-data-context";

interface ChatMessage {
  role: "ai" | "user";
  content: string;
  timestamp: Date;
}

const quickPrompts = [
  { icon: Calendar, label: "What's my schedule this week?" },
  { icon: Target, label: "Which task should I start now?" },
  { icon: TrendingUp, label: "How's my productivity trending?" },
  { icon: Zap, label: "When is my next peak focus window?" },
];

// Formats **bold** markdown and newlines into readable JSX
function formatMessage(content: string) {
  return content.split("\n").map((line, i) => {
    const boldified = line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    return (
      <p
        key={i}
        className={line === "" ? "h-2" : "leading-relaxed"}
        dangerouslySetInnerHTML={{ __html: boldified }}
      />
    );
  });
}

// Typewriter effect for the latest AI message so it feels alive
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

export function AIPanelPage() {
  // Pull real task data to give Prodigy context about what the student has to do
  const { tasks, stats } = useLocalData();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [lastAiIndex, setLastAiIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom whenever messages update
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Build a context string from the student's real tasks so Prodigy
  // gives grounded answers instead of generic ones
  const buildContext = () => {
    const pendingTasks = tasks.filter(t => !t.completed);
    const completedCount = tasks.filter(t => t.completed).length;

    const taskList = pendingTasks.length > 0
      ? pendingTasks
          .map(t => `- ${t.title} (due: ${t.dueDate ?? "no due date"}, priority: ${t.priority})`)
          .join("\n")
      : "No pending tasks.";

    return [
      `Student stats: Level ${stats.level}, ${stats.xp} XP, ${stats.streak}-day streak, ${completedCount} tasks completed.`,
      `Pending tasks:\n${taskList}`,
      `Current time: ${new Date().toLocaleString()}.`,
    ].join("\n\n");
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || isTyping) return;

    const userMsg: ChatMessage = { role: "user", content: text, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);
    setError(null);

    try {
      // Send full conversation history so Prodigy remembers context
      const history = messages.map(m => ({ role: m.role, content: m.content }));

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history,
          context: buildContext(),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? `Server error ${res.status}`);
      }

      const { reply } = await res.json();

      const aiMsg: ChatMessage = { role: "ai", content: reply, timestamp: new Date() };
      setMessages(prev => {
        const next = [...prev, aiMsg];
        setLastAiIndex(next.length - 1);
        return next;
      });
    } catch (err: any) {
      setError(err.message ?? "Something went wrong. Try again.");
    } finally {
      setIsTyping(false);
    }
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
          <ProdigyMark size={26} blink className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Prodigy</h1>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="size-2 rounded-full bg-green-500 animate-pulse inline-block" />
            Active · Ready to help you study smarter
          </div>
        </div>
      </motion.div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">

        {/* Empty state — shown before first message */}
        {messages.length === 0 && !isTyping && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center h-full text-center gap-4 pb-20"
          >
            <div className="size-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/25">
              <ProdigyMark size={32} blink className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold mb-1">Hey, I'm Prodigy</h2>
              <p className="text-sm text-muted-foreground max-w-xs">
                Your AI study assistant. Ask me anything about your tasks, deadlines, or how to study smarter.
              </p>
            </div>
          </motion.div>
        )}

        {messages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className={`flex items-start gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
          >
            <div className={`size-9 rounded-full flex items-center justify-center shrink-0 ${
              msg.role === "ai"
                ? "bg-gradient-to-br from-primary to-accent shadow-md shadow-primary/20"
                : "bg-secondary border border-border"
            }`}>
              {msg.role === "ai"
                ? <ProdigyMark size={18} className="text-white" />
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

        {/* Typing indicator */}
        {isTyping && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-3"
          >
            <div className="size-9 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-md shadow-primary/20">
              <ProdigyMark size={18} className="text-white" />
            </div>
            <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-card border border-border">
              <div className="flex gap-1.5 items-center h-4">
                {[0, 1, 2].map(j => (
                  <span
                    key={j}
                    className="size-2 rounded-full bg-muted-foreground animate-bounce"
                    style={{ animationDelay: `${j * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Error message */}
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm"
          >
            <AlertCircle className="size-4 shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}

        <div ref={endRef} />
      </div>

      {/* Quick Prompts — shown before first message */}
      {messages.length === 0 && (
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
            placeholder="Ask Prodigy anything about your tasks, schedule, or study habits…"
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
        <p className="text-xs text-muted-foreground text-center mt-2">
          Prodigy sees your real tasks and stats to give you grounded advice
        </p>
      </div>
    </div>
  );
}