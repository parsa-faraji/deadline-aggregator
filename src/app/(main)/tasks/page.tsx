"use client";

import { useEffect, useState, useCallback } from "react";
import { CheckCircle2, Circle, Filter } from "lucide-react";
import Link from "next/link";
import { getSourceColor, getSourceLabel } from "@/lib/utils";

interface Task {
  id: string;
  title: string;
  completed: boolean;
  estimateMinutes: number | null;
  deadline: {
    id: string;
    title: string;
    dueAt: string;
    source: string;
    courseName: string | null;
  } | null;
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "completed">("all");
  const [loading, setLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    const res = await fetch("/api/tasks");
    setTasks(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const toggleTask = async (id: string, completed: boolean) => {
    await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: !completed }),
    });
    fetchTasks();
  };

  const filtered = tasks.filter((t) => {
    if (filter === "pending") return !t.completed;
    if (filter === "completed") return t.completed;
    return true;
  });

  // Group by deadline
  const grouped = new Map<string, Task[]>();
  const standalone: Task[] = [];

  for (const task of filtered) {
    if (task.deadline) {
      const key = task.deadline.id;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(task);
    } else {
      standalone.push(task);
    }
  }

  if (loading) {
    return <div className="flex h-full items-center justify-center text-gray-400">Loading...</div>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400" />
          {(["all", "pending", "completed"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-3 py-1 text-sm font-medium ${
                filter === f
                  ? "bg-blue-100 text-blue-700"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {tasks.length === 0 && (
        <p className="py-12 text-center text-gray-500">
          No tasks yet. Open a deadline and add subtasks to get started.
        </p>
      )}

      {/* Grouped by deadline */}
      {Array.from(grouped.entries()).map(([deadlineId, deadlineTasks]) => {
        const dl = deadlineTasks[0].deadline!;
        return (
          <div
            key={deadlineId}
            className="rounded-xl border border-gray-200 bg-white"
          >
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <Link
                href={`/deadline/${deadlineId}`}
                className="font-medium text-gray-900 hover:text-blue-600"
              >
                {dl.title}
              </Link>
              <div className="flex items-center gap-2">
                {dl.courseName && (
                  <span className="text-sm text-gray-500">
                    {dl.courseName}
                  </span>
                )}
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${getSourceColor(dl.source)}`}
                >
                  {getSourceLabel(dl.source)}
                </span>
              </div>
            </div>
            <div className="divide-y divide-gray-50">
              {deadlineTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-3 px-4 py-2.5"
                >
                  <button onClick={() => toggleTask(task.id, task.completed)}>
                    {task.completed ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <Circle className="h-5 w-5 text-gray-300" />
                    )}
                  </button>
                  <span
                    className={`flex-1 text-sm ${
                      task.completed
                        ? "text-gray-400 line-through"
                        : "text-gray-900"
                    }`}
                  >
                    {task.title}
                  </span>
                  {task.estimateMinutes && (
                    <span className="text-xs text-gray-400">
                      {task.estimateMinutes}m
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Standalone tasks */}
      {standalone.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-4 py-3">
            <span className="font-medium text-gray-900">Standalone Tasks</span>
          </div>
          <div className="divide-y divide-gray-50">
            {standalone.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-3 px-4 py-2.5"
              >
                <button onClick={() => toggleTask(task.id, task.completed)}>
                  {task.completed ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <Circle className="h-5 w-5 text-gray-300" />
                  )}
                </button>
                <span
                  className={`flex-1 text-sm ${
                    task.completed
                      ? "text-gray-400 line-through"
                      : "text-gray-900"
                  }`}
                >
                  {task.title}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
