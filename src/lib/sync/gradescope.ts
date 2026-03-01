import { prisma } from "@/lib/db";

// Gradescope has no official API — this is a best-effort scraper.
// It requires the user's session cookie which is fragile.
// Canvas usually has the same assignment data, so this is a fallback.

export async function syncGradescope(userId: string) {
  const integration = await prisma.integration.findUnique({
    where: { userId_type: { userId, type: "GRADESCOPE" } },
  });

  if (!integration?.token) {
    throw new Error("Gradescope integration not configured");
  }

  // The "token" here is the Gradescope session cookie
  const cookie = integration.token;

  const dashRes = await fetch("https://www.gradescope.com/api/v1/courses", {
    headers: {
      Cookie: cookie,
      Accept: "application/json",
    },
  });

  if (!dashRes.ok) {
    await prisma.integration.update({
      where: { userId_type: { userId, type: "GRADESCOPE" } },
      data: {
        status: "ERROR",
        error: "Session expired. Please re-enter your Gradescope cookie.",
      },
    });
    throw new Error("Gradescope session expired");
  }

  // Attempt to parse assignment data
  // Note: The actual Gradescope internal API structure may vary
  let synced = 0;

  try {
    const data = await dashRes.json();
    const courses = data.courses || [];

    for (const course of courses) {
      const assignmentsRes = await fetch(
        `https://www.gradescope.com/api/v1/courses/${course.id}/assignments`,
        {
          headers: { Cookie: cookie, Accept: "application/json" },
        }
      );

      if (!assignmentsRes.ok) continue;

      const assignmentsData = await assignmentsRes.json();
      const assignments = assignmentsData.assignments || [];

      for (const assignment of assignments) {
        if (!assignment.due_date) continue;

        const dueAt = new Date(assignment.due_date);
        if (dueAt < new Date()) continue;

        await prisma.deadline.upsert({
          where: {
            userId_source_externalId: {
              userId,
              source: "GRADESCOPE",
              externalId: String(assignment.id),
            },
          },
          update: {
            title: assignment.title || assignment.name,
            dueAt,
            courseName: course.name,
          },
          create: {
            userId,
            title: assignment.title || assignment.name,
            dueAt,
            source: "GRADESCOPE",
            externalId: String(assignment.id),
            courseName: course.name,
          },
        });
        synced++;
      }
    }
  } catch (e) {
    console.error("Gradescope parse error:", e);
  }

  await prisma.integration.update({
    where: { userId_type: { userId, type: "GRADESCOPE" } },
    data: { lastSync: new Date(), status: "ACTIVE", error: null },
  });

  return { synced };
}
