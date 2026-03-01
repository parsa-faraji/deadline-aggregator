import { prisma } from "@/lib/db";
import { getGoogleAccessToken } from "@/lib/google";

const DEADLINE_KEYWORDS = [
  "due",
  "deadline",
  "submit",
  "assignment",
  "exam",
  "quiz",
  "midterm",
  "final",
  "project due",
  "homework",
  "paper due",
];

const DATE_PATTERNS = [
  // "due March 15" or "due March 15, 2026"
  /(?:due|by|before|deadline[:\s])\s*(\w+ \d{1,2}(?:,?\s*\d{4})?)/gi,
  // "due 3/15" or "due 03/15/2026"
  /(?:due|by|before|deadline[:\s])\s*(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/gi,
  // "due on Friday" patterns
  /(?:due|by|before)\s+(?:on\s+)?(\w+day)/gi,
];

function extractDates(text: string): Date[] {
  const dates: Date[] = [];

  for (const pattern of DATE_PATTERNS) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      try {
        const parsed = new Date(match[1]);
        if (!isNaN(parsed.getTime()) && parsed > new Date()) {
          dates.push(parsed);
        }
      } catch {
        // skip unparseable dates
      }
    }
  }

  return dates;
}

export async function syncGmail(userId: string) {
  const accessToken = await getGoogleAccessToken(userId);
  if (!accessToken) {
    throw new Error("No Google access token available");
  }

  const query = DEADLINE_KEYWORDS.map((k) => `"${k}"`).join(" OR ");
  const after = Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60; // last 7 days

  const searchRes = await fetch(
    `https://www.googleapis.com/gmail/v1/users/me/messages?` +
      new URLSearchParams({
        q: `(${query}) after:${after}`,
        maxResults: "20",
      }),
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!searchRes.ok) {
    throw new Error(`Gmail API error: ${await searchRes.text()}`);
  }

  const searchData = await searchRes.json();
  const messageIds: string[] = (searchData.messages || []).map(
    (m: { id: string }) => m.id
  );

  let synced = 0;

  for (const msgId of messageIds) {
    const msgRes = await fetch(
      `https://www.googleapis.com/gmail/v1/users/me/messages/${msgId}?format=full`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!msgRes.ok) continue;

    const msg = await msgRes.json();
    const subject =
      msg.payload?.headers?.find(
        (h: { name: string }) => h.name === "Subject"
      )?.value || "Email Deadline";
    const snippet = msg.snippet || "";
    const body = snippet;

    const dates = extractDates(`${subject} ${body}`);
    if (dates.length === 0) continue;

    const dueAt = dates[0]; // use earliest found date

    await prisma.deadline.upsert({
      where: {
        userId_source_externalId: {
          userId,
          source: "GMAIL",
          externalId: msgId,
        },
      },
      update: {
        title: subject,
        dueAt,
      },
      create: {
        userId,
        title: subject,
        description: snippet,
        dueAt,
        source: "GMAIL",
        externalId: msgId,
        suggested: true, // Gmail deadlines start as suggestions
      },
    });
    synced++;
  }

  await prisma.integration.upsert({
    where: { userId_type: { userId, type: "GMAIL" } },
    update: { lastSync: new Date(), status: "ACTIVE", error: null },
    create: { userId, type: "GMAIL", lastSync: new Date() },
  });

  return { synced };
}
