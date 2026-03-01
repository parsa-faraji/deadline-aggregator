"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  Trash2,
  ExternalLink,
  GripVertical,
} from "lucide-react";
import {
  formatRelativeDate,
  getSourceColor,
  getSourceLabel,
  getPriorityColor,
} from "@/lib/utils";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Task {
  id: string;
  title: string;
  completed: boolean;
  sortOrder: number;
  estimateMinutes: number | null;
}

interface Deadline {
  id: string;
  title: string;
  description: string | null;
  dueAt: string;
  source: string;
  courseName: string | null;
  priority: string;
  status: string;
  url: string | null;
  tasks: Task[];
}

function SortableTask({
  task,
  onToggle,
  onDelete,
}: {
  task: Task;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2"
    >
      <button {...attributes} {...listeners} className="cursor-grab text-gray-400">
        <GripVertical className="h-4 w-4" />
      </button>
      <input
        type="checkbox"
        checked={task.completed}
        onChange={onToggle}
        className="h-4 w-4 rounded border-gray-300"
      />
      <span
        className={`flex-1 text-sm ${
          task.completed ? "text-gray-400 line-through" : "text-gray-900"
        }`}
      >
        {task.title}
      </span>
      {task.estimateMinutes && (
        <span className="text-xs text-gray-400">{task.estimateMinutes}m</span>
      )}
      <button onClick={onDelete} className="text-gray-400 hover:text-red-500">
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function DeadlineDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [deadline, setDeadline] = useState<Deadline | null>(null);
  const [newTask, setNewTask] = useState("");
  const [newEstimate, setNewEstimate] = useState("");
  const [loading, setLoading] = useState(true);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const fetchDeadline = useCallback(async () => {
    const res = await fetch(`/api/deadlines/${id}`);
    if (res.ok) {
      setDeadline(await res.json());
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchDeadline();
  }, [fetchDeadline]);

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.trim()) return;

    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deadlineId: id,
        title: newTask,
        estimateMinutes: newEstimate ? parseInt(newEstimate) : null,
      }),
    });

    setNewTask("");
    setNewEstimate("");
    fetchDeadline();
  };

  const toggleTask = async (taskId: string, completed: boolean) => {
    await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: !completed }),
    });
    fetchDeadline();
  };

  const deleteTask = async (taskId: string) => {
    await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
    fetchDeadline();
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !deadline) return;

    const oldIndex = deadline.tasks.findIndex((t) => t.id === active.id);
    const newIndex = deadline.tasks.findIndex((t) => t.id === over.id);
    const reordered = arrayMove(deadline.tasks, oldIndex, newIndex);

    setDeadline({ ...deadline, tasks: reordered });

    await fetch("/api/tasks/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedIds: reordered.map((t) => t.id) }),
    });
  };

  const updateStatus = async (status: string) => {
    await fetch(`/api/deadlines/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchDeadline();
  };

  const deleteDeadline = async () => {
    await fetch(`/api/deadlines/${id}`, { method: "DELETE" });
    router.push("/dashboard");
  };

  if (loading) {
    return <div className="flex h-full items-center justify-center text-gray-400">Loading...</div>;
  }

  if (!deadline) {
    return <div className="flex h-full items-center justify-center text-gray-400">Deadline not found</div>;
  }

  const due = new Date(deadline.dueAt);
  const completedTasks = deadline.tasks.filter((t) => t.completed).length;
  const totalTasks = deadline.tasks.length;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      {/* Deadline Header */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{deadline.title}</h1>
            {deadline.courseName && (
              <p className="mt-1 text-sm text-gray-500">{deadline.courseName}</p>
            )}
          </div>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${getSourceColor(deadline.source)}`}
          >
            {getSourceLabel(deadline.source)}
          </span>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
          <span className="text-gray-600">
            Due:{" "}
            {due.toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </span>
          <span className="font-medium text-gray-500">
            ({formatRelativeDate(due)})
          </span>
          <span className={getPriorityColor(deadline.priority)}>
            {deadline.priority}
          </span>
        </div>

        {deadline.description && (
          <p className="mt-4 text-sm text-gray-600">{deadline.description}</p>
        )}

        {deadline.url && (
          <a
            href={deadline.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            View original
          </a>
        )}

        <div className="mt-4 flex gap-2">
          {deadline.status !== "COMPLETED" ? (
            <button
              onClick={() => updateStatus("COMPLETED")}
              className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700"
            >
              Mark Complete
            </button>
          ) : (
            <button
              onClick={() => updateStatus("PENDING")}
              className="rounded-lg bg-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-300"
            >
              Reopen
            </button>
          )}
          {deadline.source === "MANUAL" && (
            <button
              onClick={deleteDeadline}
              className="rounded-lg bg-red-100 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-200"
            >
              Delete
            </button>
          )}
        </div>
      </div>

      {/* Tasks / Subtasks */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Subtasks
            {totalTasks > 0 && (
              <span className="ml-2 text-sm font-normal text-gray-500">
                {completedTasks}/{totalTasks} done
              </span>
            )}
          </h2>
        </div>

        {totalTasks > 0 && (
          <div className="mb-4 h-2 w-full rounded-full bg-gray-100">
            <div
              className="h-2 rounded-full bg-blue-500 transition-all"
              style={{ width: `${(completedTasks / totalTasks) * 100}%` }}
            />
          </div>
        )}

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={deadline.tasks.map((t) => t.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {deadline.tasks.map((task) => (
                <SortableTask
                  key={task.id}
                  task={task}
                  onToggle={() => toggleTask(task.id, task.completed)}
                  onDelete={() => deleteTask(task.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        <form onSubmit={addTask} className="mt-4 flex gap-2">
          <input
            type="text"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            placeholder="Add a subtask..."
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <input
            type="number"
            value={newEstimate}
            onChange={(e) => setNewEstimate(e.target.value)}
            placeholder="Min"
            className="w-16 rounded-lg border border-gray-300 px-2 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Add
          </button>
        </form>
      </div>
    </div>
  );
}
