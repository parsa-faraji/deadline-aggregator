import { prisma } from "@/lib/db";
import { getGoogleAccessToken } from "@/lib/google";

interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  htmlLink?: string;
}

export async function syncGoogleCalendar(userId: string) {
  const accessToken = await getGoogleAccessToken(userId);
  if (!accessToken) {
    throw new Error("No Google access token available");
  }

  const now = new Date().toISOString();
  const threeMonthsLater = new Date(
    Date.now() + 90 * 24 * 60 * 60 * 1000
  ).toISOString();

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
      new URLSearchParams({
        timeMin: now,
        timeMax: threeMonthsLater,
        singleEvents: "true",
        orderBy: "startTime",
        maxResults: "250",
      }),
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Google Calendar API error: ${error}`);
  }

  const data = await response.json();
  const events: GoogleCalendarEvent[] = data.items || [];

  let synced = 0;

  for (const event of events) {
    if (!event.summary) continue;

    const dueAt = event.start.dateTime
      ? new Date(event.start.dateTime)
      : event.start.date
        ? new Date(event.start.date + "T23:59:59Z")
        : null;

    if (!dueAt) continue;

    await prisma.deadline.upsert({
      where: {
        userId_source_externalId: {
          userId,
          source: "GOOGLE_CALENDAR",
          externalId: event.id,
        },
      },
      update: {
        title: event.summary,
        description: event.description || null,
        dueAt,
        url: event.htmlLink || null,
      },
      create: {
        userId,
        title: event.summary,
        description: event.description || null,
        dueAt,
        source: "GOOGLE_CALENDAR",
        externalId: event.id,
        url: event.htmlLink || null,
      },
    });
    synced++;
  }

  // Update integration status
  await prisma.integration.upsert({
    where: { userId_type: { userId, type: "GOOGLE_CALENDAR" } },
    update: { lastSync: new Date(), status: "ACTIVE", error: null },
    create: { userId, type: "GOOGLE_CALENDAR", lastSync: new Date() },
  });

  return { synced };
}
