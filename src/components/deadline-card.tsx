"use client";

import Link from "next/link";
import {
  formatRelativeDate,
  getSourceColor,
  getSourceLabel,
  getPriorityColor,
} from "@/lib/utils";

interface DeadlineCardProps {
  id: string;
  title: string;
  dueAt: string;
  source: string;
  courseName?: string | null;
  priority: string;
  status: string;
  tasks?: { id: string; completed: boolean }[];
}

export function DeadlineCard({
  id,
  title,
  dueAt,
  source,
  courseName,
  priority,
  status,
  tasks,
}: DeadlineCardProps) {
  const due = new Date(dueAt);
  const isOverdue = due < new Date() && status !== "COMPLETED";
  const completedTasks = tasks?.filter((t) => t.completed).length ?? 0;
  const totalTasks = tasks?.length ?? 0;

  return (
    <Link
      href={`/deadline/${id}`}
      className="block rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3
            className={`truncate font-medium ${
              status === "COMPLETED" ? "text-gray-400 line-through" : "text-gray-900"
            }`}
          >
            {title}
          </h3>
          {courseName && (
            <p className="mt-0.5 text-sm text-gray-500">{courseName}</p>
          )}
        </div>
        <span
          className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium ${getSourceColor(source)}`}
        >
          {getSourceLabel(source)}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-3 text-sm">
        <span
          className={`font-medium ${isOverdue ? "text-red-600" : "text-gray-600"}`}
        >
          {formatRelativeDate(due)}
        </span>
        <span className={`${getPriorityColor(priority)}`}>
          {priority.charAt(0) + priority.slice(1).toLowerCase()}
        </span>
        {totalTasks > 0 && (
          <span className="text-gray-500">
            {completedTasks}/{totalTasks} tasks
          </span>
        )}
      </div>

      {totalTasks > 0 && (
        <div className="mt-2 h-1.5 w-full rounded-full bg-gray-100">
          <div
            className="h-1.5 rounded-full bg-blue-500 transition-all"
            style={{
              width: `${(completedTasks / totalTasks) * 100}%`,
            }}
          />
        </div>
      )}
    </Link>
  );
}
