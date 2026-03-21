"use client";

import { useEffect, useState, useCallback } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { useRouter } from "next/navigation";

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end?: string;
  color: string;
  extendedProps: { type: "deadline" | "study" };
}

const SOURCE_COLORS: Record<string, string> = {
  GOOGLE_CALENDAR: "#3b82f6",
  CANVAS: "#ef4444",
  GMAIL: "#eab308",
  GRADESCOPE: "#22c55e",
  ED_DISCUSSION: "#a855f7",
  MANUAL: "#6b7280",
};

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const router = useRouter();

  const fetchEvents = useCallback(async () => {
    const [deadlinesRes, sessionsRes] = await Promise.all([
      fetch("/api/deadlines"),
      fetch("/api/study-sessions"),
    ]);

    const deadlines = await deadlinesRes.json();
    const sessions = await sessionsRes.json();

    const deadlineEvents: CalendarEvent[] = deadlines
      .filter((d: { status: string }) => d.status !== "DISMISSED")
      .map(
        (d: {
          id: string;
          title: string;
          dueAt: string;
          source: string;
          courseName: string | null;
        }) => ({
          id: `deadline-${d.id}`,
          title: `${d.courseName ? `[${d.courseName}] ` : ""}${d.title}`,
          start: d.dueAt,
          color: SOURCE_COLORS[d.source] || SOURCE_COLORS.MANUAL,
          extendedProps: { type: "deadline" as const },
        })
      );

    const sessionEvents: CalendarEvent[] = sessions.map(
      (s: { id: string; title: string; startAt: string; endAt: string }) => ({
        id: `study-${s.id}`,
        title: s.title,
        start: s.startAt,
        end: s.endAt,
        color: "#8b5cf6",
        extendedProps: { type: "study" as const },
      })
    );

    setEvents([...deadlineEvents, ...sessionEvents]);
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Calendar</h1>

      <div className="mb-4 flex gap-3 text-xs">
        <span className="flex items-center gap-1">
          <span className="h-3 w-3 rounded-full bg-blue-500" /> Google Calendar
        </span>
        <span className="flex items-center gap-1">
          <span className="h-3 w-3 rounded-full bg-red-500" /> Canvas
        </span>
        <span className="flex items-center gap-1">
          <span className="h-3 w-3 rounded-full bg-yellow-500" /> Gmail
        </span>
        <span className="flex items-center gap-1">
          <span className="h-3 w-3 rounded-full bg-green-500" /> Gradescope
        </span>
        <span className="flex items-center gap-1">
          <span className="h-3 w-3 rounded-full bg-purple-500" /> Ed Discussion
        </span>
        <span className="flex items-center gap-1">
          <span className="h-3 w-3 rounded-full bg-violet-500" /> Study Session
        </span>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek",
          }}
          events={events}
          eventClick={(info) => {
            const id = info.event.id;
            if (id.startsWith("deadline-")) {
              router.push(`/deadline/${id.replace("deadline-", "")}`);
            }
          }}
          height="auto"
        />
      </div>
    </div>
  );
}
