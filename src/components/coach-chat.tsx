"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";

const STORAGE_KEY = "deadline-aggregator-coach-messages";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function loadStoredMessages(): ChatMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ChatMessage[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveMessages(messages: ChatMessage[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  } catch {
    // ignore
  }
}

async function fetchContext(): Promise<string> {
  try {
    const [dRes, tRes] = await Promise.all([
      fetch("/api/deadlines"),
      fetch("/api/tasks"),
    ]);
    const deadlines = (await dRes.json()) as Array<{
      title: string;
      dueAt: string;
      status: string;
      tasks?: { completed: boolean }[];
    }>;
    const tasks = (await tRes.json()) as Array<{
      title: string;
      completed: boolean;
      deadlineId: string | null;
    }>;

    const now = new Date();
    const endOfWeek = new Date(now);
    endOfWeek.setDate(now.getDate() + 7);

    const pending = deadlines.filter((d) => d.status !== "COMPLETED");
    const dueThisWeek = pending.filter(
      (d) => new Date(d.dueAt) <= endOfWeek && new Date(d.dueAt) >= now
    );
    const overdue = pending.filter((d) => new Date(d.dueAt) < now);
    const incompleteTasks = tasks.filter((t) => !t.completed);

    const parts: string[] = [];
    if (overdue.length > 0) {
      parts.push(
        `Overdue: ${overdue.map((d) => `"${d.title}" (${new Date(d.dueAt).toLocaleDateString()})`).join("; ")}.`
      );
    }
    if (dueThisWeek.length > 0) {
      parts.push(
        `Due this week: ${dueThisWeek.map((d) => `"${d.title}" due ${new Date(d.dueAt).toLocaleDateString()}`).join("; ")}.`
      );
    }
    if (incompleteTasks.length > 0) {
      parts.push(
        `Incomplete tasks: ${incompleteTasks.length} total (e.g. ${incompleteTasks.slice(0, 3).map((t) => `"${t.title}"`).join(", ")}).`
      );
    }
    return parts.length > 0 ? parts.join(" ") : "No upcoming deadlines or incomplete tasks.";
  } catch {
    return "Could not load deadline/task context.";
  }
}

export function CoachChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [contextFetched, setContextFetched] = useState(false);
  const [context, setContext] = useState<string>("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages(loadStoredMessages());
    }
  }, [open]);

  useEffect(() => {
    if (open && !contextFetched) {
      setContextFetched(true);
      fetchContext().then(setContext);
    }
  }, [open, contextFetched]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    const userMsg: ChatMessage = { role: "user", content: text };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
          context: context || undefined,
        }),
      });
      const data = (await res.json()) as { message?: string; error?: string };
      const reply = data.message || data.error || "Sorry, I couldn't respond.";
      const assistantMsg: ChatMessage = { role: "assistant", content: reply };
      const updated = [...nextMessages, assistantMsg];
      setMessages(updated);
      saveMessages(updated);
    } catch {
      const assistantMsg: ChatMessage = {
        role: "assistant",
        content: "Something went wrong. Please try again.",
      };
      const updated = [...nextMessages, assistantMsg];
      setMessages(updated);
      saveMessages(updated);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        aria-label="Open motivation coach"
      >
        <MessageCircle className="h-6 w-6" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-black/30"
            aria-hidden
            onClick={() => setOpen(false)}
          />
          <div className="relative flex w-full max-w-md flex-col bg-white shadow-xl sm:max-w-lg">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
              <h2 className="text-lg font-semibold text-gray-900">
                Motivation coach
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px] max-h-[60vh]">
              {messages.length === 0 && !loading && (
                <p className="text-sm text-gray-500">
                  Say hi! Ask for a nudge, suggest a 25-minute focus block, or
                  tell me what you want to work on. I can see your deadlines and
                  tasks to give you relevant suggestions.
                </p>
              )}
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                      m.role === "user"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-900"
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-600">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Thinking…
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            <div className="border-t border-gray-200 p-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Message the coach…"
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={send}
                  disabled={!input.trim() || loading}
                  className="flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
