import { prisma } from "@/lib/db";

interface CanvasCourse {
  id: number;
  name: string;
}

interface CanvasAssignment {
  id: number;
  name: string;
  description?: string;
  due_at?: string;
  html_url?: string;
  course_id: number;
}

export async function syncCanvas(userId: string) {
  const integration = await prisma.integration.findUnique({
    where: { userId_type: { userId, type: "CANVAS" } },
  });

  if (!integration?.token || !integration.baseUrl) {
    throw new Error("Canvas integration not configured");
  }

  const { token, baseUrl } = integration;
  const headers = { Authorization: `Bearer ${token}` };

  // Fetch active courses
  const coursesRes = await fetch(
    `${baseUrl}/api/v1/courses?enrollment_state=active&per_page=50`,
    { headers }
  );

  if (!coursesRes.ok) {
    throw new Error(`Canvas API error: ${await coursesRes.text()}`);
  }

  const courses: CanvasCourse[] = await coursesRes.json();
  let synced = 0;

  for (const course of courses) {
    const assignmentsRes = await fetch(
      `${baseUrl}/api/v1/courses/${course.id}/assignments?per_page=100&order_by=due_at`,
      { headers }
    );

    if (!assignmentsRes.ok) continue;

    const assignments: CanvasAssignment[] = await assignmentsRes.json();

    for (const assignment of assignments) {
      if (!assignment.due_at) continue;

      const dueAt = new Date(assignment.due_at);
      if (dueAt < new Date()) continue; // skip past deadlines

      await prisma.deadline.upsert({
        where: {
          userId_source_externalId: {
            userId,
            source: "CANVAS",
            externalId: String(assignment.id),
          },
        },
        update: {
          title: assignment.name,
          description: assignment.description || null,
          dueAt,
          courseName: course.name,
          url: assignment.html_url || null,
        },
        create: {
          userId,
          title: assignment.name,
          description: assignment.description || null,
          dueAt,
          source: "CANVAS",
          externalId: String(assignment.id),
          courseName: course.name,
          url: assignment.html_url || null,
        },
      });
      synced++;
    }
  }

  await prisma.integration.update({
    where: { userId_type: { userId, type: "CANVAS" } },
    data: { lastSync: new Date(), status: "ACTIVE", error: null },
  });

  return { synced };
}
