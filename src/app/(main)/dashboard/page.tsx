"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Plus, RefreshCw, AlertTriangle, CheckCircle2, Target, ChevronRight } from "lucide-react";
import { DeadlineCard } from "@/components/deadline-card";
import { AddDeadlineModal } from "@/components/add-deadline-modal";
import { formatTimeAgo, getSourceLabel } from "@/lib/utils";

interface Deadline {
  id: string;
  title: string;
  dueAt: string;
  source: string;
  courseName: string | null;
  priority: string;
  status: string;
  suggested: boolean;
  tasks: { id: string; title: string; completed: boolean }[];
}

interface Integration {
  id: string;
  type: string;
  status: string;
  lastSync: string | null;
  error: string | null;
}

export default function DashboardPage() {
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const fetchDeadlines = useCallback(async () => {
    const res = await fetch("/api/deadlines");
    const data = await res.json();
    setDeadlines(data);
    setLoading(false);
  }, []);

  const fetchIntegrations = useCallback(async () => {
    const res = await fetch("/api/integrations");
    const data = await res.json();
    setIntegrations(data);
  }, []);

  useEffect(() => {
    fetchDeadlines();
    fetchIntegrations();
  }, [fetchDeadlines, fetchIntegrations]);

  const handleSync = async () => {
    setSyncing(true);
    await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    await fetchDeadlines();
    await fetchIntegrations();
    setSyncing(false);
  };

  const handleDismiss = async (id: string) => {
    await fetch(`/api/deadlines/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "DISMISSED" }),
    });
    fetchDeadlines();
  };

  const handleConfirm = async (id: string) => {
    await fetch(`/api/deadlines/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ suggested: false }),
    });
    fetchDeadlines();
  };

  const now = new Date();
  const endOfWeek = new Date(now);
  endOfWeek.setDate(now.getDate() + 7);

  const confirmed = deadlines.filter(
    (d) => !d.suggested && d.status !== "DISMISSED"
  );
  const suggested = deadlines.filter(
    (d) => d.suggested && d.status !== "DISMISSED"
  );
  const dueThisWeek = confirmed.filter(
    (d) => new Date(d.dueAt) <= endOfWeek && d.status !== "COMPLETED"
  );
  const overdue = confirmed.filter(
    (d) => new Date(d.dueAt) < now && d.status !== "COMPLETED"
  );
  const completed = confirmed.filter((d) => d.status === "COMPLETED");

  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const endOfTomorrow = new Date(startOfToday);
  endOfTomorrow.setDate(endOfTomorrow.getDate() + 2);

  const doToday = confirmed.filter((d) => {
    if (d.status === "COMPLETED") return false;
    const due = new Date(d.dueAt);
    return due < endOfTomorrow;
  }).sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());

  const pendingByDue = confirmed
    .filter((d) => d.status !== "COMPLETED")
    .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());
  const nextDeadline = pendingByDue[0];
  const nextTask = nextDeadline?.tasks?.find((t) => !t.completed);

  const lastSyncDate = integrations
    .map((i) => (i.lastSync ? new Date(i.lastSync) : null))
    .filter(Boolean) as Date[];
  const lastSync =
    lastSyncDate.length > 0
      ? new Date(Math.max(...lastSyncDate.map((d) => d.getTime())))
      : null;

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500">
            {confirmed.length} deadlines tracked
          </p>
          {integrations.length > 0 && (
            <p className="mt-1 text-xs text-gray-400">
              {lastSync ? (
                <>Last synced: {formatTimeAgo(lastSync)}</>
              ) : (
                "Sync to see source status"
              )}
              {integrations.some((i) => i.error) && (
                <span className="ml-2 text-amber-600">
                  · Some sources had errors
                </span>
              )}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`}
            />
            Sync All
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Add Deadline
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            Overdue
          </div>
          <p className="mt-1 text-2xl font-bold text-red-600">
            {overdue.length}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <RefreshCw className="h-4 w-4 text-blue-500" />
            Due This Week
          </div>
          <p className="mt-1 text-2xl font-bold text-blue-600">
            {dueThisWeek.length}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            Completed
          </div>
          <p className="mt-1 text-2xl font-bold text-green-600">
            {completed.length}
          </p>
        </div>
      </div>

      {/* Sync status per source */}
      {integrations.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {integrations.map((i) => (
            <span
              key={i.id}
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                i.error
                  ? "bg-amber-100 text-amber-800"
                  : "bg-gray-100 text-gray-700"
              }`}
              title={i.error ?? (i.lastSync ? `Synced ${formatTimeAgo(new Date(i.lastSync))}` : "Not synced yet")}
            >
              {getSourceLabel(i.type)}
              {i.error ? ": " + i.error : i.lastSync ? " ✓" : ""}
            </span>
          ))}
        </div>
      )}

      {/* Focus: Do today + Next action */}
      <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-gray-900">
          <Target className="h-5 w-5 text-blue-600" />
          What should I do now?
        </h2>
        {nextDeadline && (
          <div className="mb-3">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Next action
            </p>
            <Link
              href={`/deadline/${nextDeadline.id}`}
              className="mt-1 flex items-center gap-2 rounded-lg border border-blue-200 bg-white p-3 transition hover:border-blue-300 hover:bg-blue-50/50"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-900">{nextDeadline.title}</p>
                <p className="text-sm text-gray-500">
                  Due {new Date(nextDeadline.dueAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  {nextTask && (
                    <span className="ml-2 text-blue-600">
                      → First: {nextTask.title}
                    </span>
                  )}
                </p>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-gray-400" />
            </Link>
          </div>
        )}
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
          Do today
        </p>
        <p className="mt-1 text-sm text-gray-600">
          Due today, overdue, or tomorrow ({doToday.length} items)
        </p>
        {doToday.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">
            Nothing due today or tomorrow. Use &quot;All Upcoming&quot; below to plan ahead.
          </p>
        ) : (
          <ul className="mt-2 space-y-1">
            {doToday.slice(0, 6).map((d) => (
              <li key={d.id}>
                <Link
                  href={`/deadline/${d.id}`}
                  className="text-sm font-medium text-blue-700 hover:underline"
                >
                  {d.title}
                  <span className="ml-2 text-gray-500 font-normal">
                    {new Date(d.dueAt) < now
                      ? " (overdue)"
                      : new Date(d.dueAt).toDateString() === now.toDateString()
                        ? " (today)"
                        : " (tomorrow)"}
                  </span>
                </Link>
              </li>
            ))}
            {doToday.length > 6 && (
              <li className="text-sm text-gray-500">
                +{doToday.length - 6} more below
              </li>
            )}
          </ul>
        )}
      </div>

      {/* Suggested Deadlines (Gmail) */}
      {suggested.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold text-yellow-700">
            Suggested Deadlines
          </h2>
          <div className="space-y-2">
            {suggested.map((d) => (
              <div
                key={d.id}
                className="flex items-center justify-between rounded-lg border border-yellow-200 bg-yellow-50 p-3"
              >
                <div>
                  <p className="font-medium text-gray-900">{d.title}</p>
                  <p className="text-sm text-gray-500">
                    Due{" "}
                    {new Date(d.dueAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleConfirm(d.id)}
                    className="rounded-lg bg-green-600 px-3 py-1 text-sm text-white hover:bg-green-700"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => handleDismiss(d.id)}
                    className="rounded-lg bg-gray-200 px-3 py-1 text-sm text-gray-700 hover:bg-gray-300"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Due This Week */}
      {dueThisWeek.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold text-gray-900">
            Due This Week
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {dueThisWeek.map((d) => (
              <DeadlineCard key={d.id} {...d} />
            ))}
          </div>
        </div>
      )}

      {/* All Upcoming */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-gray-900">
          All Upcoming
        </h2>
        {confirmed.filter((d) => d.status !== "COMPLETED").length === 0 ? (
          <p className="text-center text-gray-500 py-8">
            No upcoming deadlines. Click &quot;Sync All&quot; to fetch from your
            connected services, or add one manually.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {confirmed
              .filter((d) => d.status !== "COMPLETED")
              .map((d) => (
                <DeadlineCard key={d.id} {...d} />
              ))}
          </div>
        )}
      </div>

      <AddDeadlineModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onCreated={fetchDeadlines}
      />
    </div>
  );
}
