import { auth, signIn } from "@/lib/auth";
import { redirect } from "next/navigation";
import { CalendarDays } from "lucide-react";

export default async function Home() {
  const session = await auth();

  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="w-full max-w-md space-y-8 rounded-2xl bg-white p-8 shadow-lg">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600">
            <CalendarDays className="h-8 w-8 text-white" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-gray-900">
            Deadline Aggregator
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            All your school deadlines from Google Calendar, Canvas, Gmail, and
            Gradescope — in one place.
          </p>
        </div>

        <form
          action={async () => {
            "use server";
            await signIn("google");
          }}
        >
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-3 rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Sign in with Google
          </button>
        </form>

        <div className="space-y-3 text-center text-xs text-gray-500">
          <p>
            We&apos;ll request read-only access to your Google Calendar and Gmail
            to automatically find deadlines.
          </p>
          <div className="flex justify-center gap-4">
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-blue-700">
              Google Calendar
            </span>
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-red-700">
              Canvas
            </span>
            <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-yellow-700">
              Gmail
            </span>
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-green-700">
              Gradescope
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
