"use client";

import { useEffect, useState, useCallback } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { Plus, Sparkles, X } from "lucide-react";

interface StudySession {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  notes: string | null;
}

interface Deadline {
  id: string;
  title: string;
  dueAt: string;
  source: string;
  tasks: { id: string; title: string; completed: boolean; estimateMinutes: number | null }[];
}

export default function PlannerPage() {
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newSession, setNewSession] = useState({
    title: "",
    startAt: "",
    endAt: "",
    notes: "",
  });
  const [suggestions, setSuggestions] = useState<
    { title: string; startAt: string; endAt: string }[]
  >([]);

  const fetchData = useCallback(async () => {
    const [sessRes, dlRes] = await Promise.all([
      fetch("/api/study-sessions"),
      fetch("/api/deadlines"),
    ]);
    setSessions(await sessRes.json());
    setDeadlines(await dlRes.json());
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const createSession = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/study-sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newSession),
    });
    setNewSession({ title: "", startAt: "", endAt: "", notes: "" });
    setShowCreate(false);
    fetchData();
  };

  const deleteSession = async (id: string) => {
    await fetch(`/api/study-sessions/${id}`, { method: "DELETE" });
    fetchData();
  };

  const autoSuggest = () => {
    // Find upcoming deadlines with incomplete tasks
    const upcoming = deadlines
      .filter(
        (d) =>
          new Date(d.dueAt) > new Date() &&
          d.tasks.some((t) => !t.completed)
      )
      .slice(0, 3);

    const suggested = upcoming.map((d) => {
      const dueDate = new Date(d.dueAt);
      // Suggest studying 2 days before due date, 2-hour block in the afternoon
      const studyDate = new Date(dueDate);
      studyDate.setDate(studyDate.getDate() - 2);
      studyDate.setHours(14, 0, 0, 0);

      const endDate = new Date(studyDate);
      endDate.setHours(16, 0, 0, 0);

      return {
        title: `Study: ${d.title}`,
        startAt: studyDate.toISOString(),
        endAt: endDate.toISOString(),
      };
    });

    setSuggestions(suggested);
  };

  const acceptSuggestion = async (s: {
    title: string;
    startAt: string;
    endAt: string;
  }) => {
    await fetch("/api/study-sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(s),
    });
    setSuggestions((prev) => prev.filter((p) => p !== s));
    fetchData();
  };

  const calendarEvents = [
    ...sessions.map((s) => ({
      id: s.id,
      title: s.title,
      start: s.startAt,
      end: s.endAt,
      color: "#8b5cf6",
    })),
    ...deadlines
      .filter((d) => d.tasks.length > 0)
      .map((d) => ({
        id: `dl-${d.id}`,
        title: d.title,
        start: d.dueAt,
        color: "#ef4444",
      })),
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Study Planner</h1>
        <div className="flex gap-2">
          <button
            onClick={autoSuggest}
            className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Sparkles className="h-4 w-4 text-violet-500" />
            Suggest Sessions
          </button>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-2 rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-700"
          >
            <Plus className="h-4 w-4" />
            New Session
          </button>
        </div>
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-violet-700">
            Suggested Study Sessions
          </h2>
          {suggestions.map((s, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-lg border border-violet-200 bg-violet-50 p-3"
            >
              <div>
                <p className="font-medium text-gray-900">{s.title}</p>
                <p className="text-sm text-gray-500">
                  {new Date(s.startAt).toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}{" "}
                  —{" "}
                  {new Date(s.endAt).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => acceptSuggestion(s)}
                  className="rounded-lg bg-violet-600 px-3 py-1 text-sm text-white hover:bg-violet-700"
                >
                  Accept
                </button>
                <button
                  onClick={() =>
                    setSuggestions((prev) => prev.filter((p) => p !== s))
                  }
                  className="rounded-lg bg-gray-200 px-3 py-1 text-sm text-gray-700 hover:bg-gray-300"
                >
                  Skip
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">New Study Session</h2>
            <button
              onClick={() => setShowCreate(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <form onSubmit={createSession} className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <input
                type="text"
                required
                value={newSession.title}
                onChange={(e) =>
                  setNewSession({ ...newSession, title: e.target.value })
                }
                placeholder="e.g. Review Chapter 5"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500">Start</label>
              <input
                type="datetime-local"
                required
                value={newSession.startAt}
                onChange={(e) =>
                  setNewSession({ ...newSession, startAt: e.target.value })
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500">End</label>
              <input
                type="datetime-local"
                required
                value={newSession.endAt}
                onChange={(e) =>
                  setNewSession({ ...newSession, endAt: e.target.value })
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
              />
            </div>
            <div className="col-span-2">
              <textarea
                value={newSession.notes}
                onChange={(e) =>
                  setNewSession({ ...newSession, notes: e.target.value })
                }
                placeholder="Notes (optional)"
                rows={2}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
              />
            </div>
            <div className="col-span-2">
              <button
                type="submit"
                className="w-full rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
              >
                Create Session
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Calendar */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "timeGridWeek,dayGridMonth",
          }}
          events={calendarEvents}
          eventClick={(info) => {
            if (!info.event.id.startsWith("dl-")) {
              if (confirm("Delete this study session?")) {
                deleteSession(info.event.id);
              }
            }
          }}
          height="auto"
          slotMinTime="06:00:00"
          slotMaxTime="24:00:00"
        />
      </div>

      {/* Upcoming Sessions List */}
      {sessions.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold text-gray-900">
            Upcoming Sessions
          </h2>
          <div className="space-y-2">
            {sessions
              .filter((s) => new Date(s.startAt) > new Date())
              .map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3"
                >
                  <div>
                    <p className="font-medium text-gray-900">{s.title}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(s.startAt).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}{" "}
                      —{" "}
                      {new Date(s.endAt).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteSession(s.id)}
                    className="text-sm text-red-500 hover:text-red-700"
                  >
                    Delete
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
