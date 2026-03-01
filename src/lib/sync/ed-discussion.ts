import { prisma } from "@/lib/db";

const ED_API_BASE = "https://edstem.org/api";

interface EdCourse {
  id: number;
  code: string;
  name: string;
}

interface EdThread {
  id: number;
  number: number;
  title: string;
  content: string;
  category: string;
  type: string; // "post", "question", "announcement"
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  course_id: number;
}

// Common date patterns: "due March 5", "deadline: 3/5", "by Friday 11:59pm", etc.
const DATE_PATTERNS = [
  /(?:due|deadline|submit|turn\s*in)[\s:]+(\w+\s+\d{1,2}(?:,?\s*\d{4})?(?:\s+(?:at\s+)?\d{1,2}(?::\d{2})?\s*(?:am|pm))?)/gi,
  /(?:due|deadline|submit)[\s:]+(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/gi,
  /(?:by|before)\s+((?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\w*,?\s+\w+\s+\d{1,2}(?:,?\s*\d{4})?)/gi,
  /(\w+\s+\d{1,2}(?:,?\s*\d{4})?)\s+(?:at\s+)?\d{1,2}(?::\d{2})?\s*(?:am|pm)\s*(?:—|–|-)\s*(?:deadline|due)/gi,
];

function extractDates(text: string): Date[] {
  const dates: Date[] = [];
  for (const pattern of DATE_PATTERNS) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const parsed = new Date(match[1]);
      if (!isNaN(parsed.getTime()) && parsed > new Date()) {
        dates.push(parsed);
      }
    }
  }
  return dates;
}

function stripXml(content: string): string {
  return content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export async function syncEdDiscussion(userId: string) {
  const integration = await prisma.integration.findUnique({
    where: { userId_type: { userId, type: "ED_DISCUSSION" } },
  });

  if (!integration?.token) {
    throw new Error("Ed Discussion integration not configured");
  }

  const { token } = integration;
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
  };

  // Fetch user info which includes enrolled courses
  const userRes = await fetch(`${ED_API_BASE}/user`, { headers });
  if (!userRes.ok) {
    throw new Error(`Ed API error: ${await userRes.text()}`);
  }

  const userData = await userRes.json();
  const courses: EdCourse[] = (userData.courses || []).map(
    (c: { course: EdCourse }) => c.course
  );

  let synced = 0;

  for (const course of courses) {
    // Fetch threads (announcements + pinned posts)
    const threadsRes = await fetch(
      `${ED_API_BASE}/courses/${course.id}/threads?limit=50&sort=new`,
      { headers }
    );

    if (!threadsRes.ok) continue;

    const threadsData = await threadsRes.json();
    const threads: EdThread[] = threadsData.threads || [];

    // Focus on announcements and pinned posts — most likely to contain deadlines
    const relevant = threads.filter(
      (t) => t.type === "announcement" || t.is_pinned || t.category === "announcements"
    );

    for (const thread of relevant) {
      const plainText = stripXml(thread.content || "");
      const title = thread.title || "";
      const combined = `${title} ${plainText}`;

      // Check for deadline-related keywords
      const hasDeadlineKeyword =
        /due|deadline|submit|assignment|homework|exam|quiz|midterm|final|project/i.test(
          combined
        );

      if (!hasDeadlineKeyword) continue;

      const dates = extractDates(combined);

      for (const dueAt of dates) {
        const externalId = `ed-${thread.id}-${dueAt.getTime()}`;

        await prisma.deadline.upsert({
          where: {
            userId_source_externalId: {
              userId,
              source: "ED_DISCUSSION",
              externalId,
            },
          },
          update: {
            title: `[Ed] ${title}`,
            description: plainText.slice(0, 500),
            dueAt,
            courseName: course.name,
            url: `https://edstem.org/us/courses/${course.id}/discussion/${thread.number}`,
          },
          create: {
            userId,
            title: `[Ed] ${title}`,
            description: plainText.slice(0, 500),
            dueAt,
            source: "ED_DISCUSSION",
            externalId,
            courseName: course.name,
            url: `https://edstem.org/us/courses/${course.id}/discussion/${thread.number}`,
            suggested: true,
          },
        });
        synced++;
      }
    }
  }

  await prisma.integration.update({
    where: { userId_type: { userId, type: "ED_DISCUSSION" } },
    data: { lastSync: new Date(), status: "ACTIVE", error: null },
  });

  return { synced };
}
