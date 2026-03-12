import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDistanceToNow } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRelativeDate(date: Date): string {
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);

  if (diff < 0) return "Overdue";
  if (hours < 1) return "Due soon";
  if (hours < 24) return `${hours}h left`;
  if (days === 1) return "Tomorrow";
  if (days < 7) return `${days} days`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function getSourceColor(source: string): string {
  const colors: Record<string, string> = {
    GOOGLE_CALENDAR: "bg-blue-100 text-blue-800",
    CANVAS: "bg-red-100 text-red-800",
    GMAIL: "bg-yellow-100 text-yellow-800",
    GRADESCOPE: "bg-green-100 text-green-800",
    ED_DISCUSSION: "bg-purple-100 text-purple-800",
    MANUAL: "bg-gray-100 text-gray-800",
  };
  return colors[source] || colors.MANUAL;
}

export function getSourceLabel(source: string): string {
  const labels: Record<string, string> = {
    GOOGLE_CALENDAR: "Google Calendar",
    CANVAS: "Canvas",
    GMAIL: "Gmail",
    GRADESCOPE: "Gradescope",
    ED_DISCUSSION: "Ed Discussion",
    MANUAL: "Manual",
  };
  return labels[source] || source;
}

export function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    LOW: "text-gray-500",
    MEDIUM: "text-yellow-600",
    HIGH: "text-orange-600",
    URGENT: "text-red-600",
  };
  return colors[priority] || "";
}

export function formatTimeAgo(date: Date): string {
  return formatDistanceToNow(date, { addSuffix: true });
}
