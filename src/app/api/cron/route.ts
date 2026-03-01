import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { syncGoogleCalendar } from "@/lib/sync/google-calendar";
import { syncCanvas } from "@/lib/sync/canvas";
import { syncGmail } from "@/lib/sync/gmail";
import { processNotifications } from "@/lib/notifications/scheduler";

// This endpoint is called by Vercel Cron or Upstash QStash
export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const users = await prisma.user.findMany({
    include: { integrations: true },
  });

  const results: Record<string, unknown>[] = [];

  for (const user of users) {
    const userResult: Record<string, unknown> = { userId: user.id };

    // Sync Google Calendar for all users (they authenticated with Google)
    try {
      const r = await syncGoogleCalendar(user.id);
      userResult.googleCalendar = r;
    } catch (e) {
      userResult.googleCalendar = { error: (e as Error).message };
    }

    // Sync Canvas if configured
    const canvasIntegration = user.integrations.find(
      (i) => i.type === "CANVAS" && i.status === "ACTIVE"
    );
    if (canvasIntegration) {
      try {
        const r = await syncCanvas(user.id);
        userResult.canvas = r;
      } catch (e) {
        userResult.canvas = { error: (e as Error).message };
      }
    }

    // Sync Gmail
    const gmailIntegration = user.integrations.find(
      (i) => i.type === "GMAIL" && i.status === "ACTIVE"
    );
    if (gmailIntegration) {
      try {
        const r = await syncGmail(user.id);
        userResult.gmail = r;
      } catch (e) {
        userResult.gmail = { error: (e as Error).message };
      }
    }

    results.push(userResult);
  }

  // Process notifications
  try {
    await processNotifications();
  } catch (e) {
    console.error("Notification processing error:", e);
  }

  return NextResponse.json({ ok: true, results });
}
