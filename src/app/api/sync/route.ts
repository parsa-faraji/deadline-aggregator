import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { syncGoogleCalendar } from "@/lib/sync/google-calendar";
import { syncCanvas } from "@/lib/sync/canvas";
import { syncGmail } from "@/lib/sync/gmail";
import { syncGradescope } from "@/lib/sync/gradescope";
import { syncEdDiscussion } from "@/lib/sync/ed-discussion";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const source = body.source as string | undefined;

  const results: Record<string, { synced?: number; error?: string }> = {};

  const syncFns: Record<string, () => Promise<{ synced: number }>> = {
    GOOGLE_CALENDAR: () => syncGoogleCalendar(session.user.id),
    CANVAS: () => syncCanvas(session.user.id),
    GMAIL: () => syncGmail(session.user.id),
    GRADESCOPE: () => syncGradescope(session.user.id),
    ED_DISCUSSION: () => syncEdDiscussion(session.user.id),
  };

  const sources = source ? [source] : Object.keys(syncFns);

  for (const src of sources) {
    if (!syncFns[src]) continue;
    try {
      const result = await syncFns[src]();
      results[src] = { synced: result.synced };
    } catch (err) {
      results[src] = { error: err instanceof Error ? err.message : "Unknown error" };
    }
  }

  return NextResponse.json(results);
}
