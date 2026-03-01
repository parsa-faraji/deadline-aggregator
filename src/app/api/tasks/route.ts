import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tasks = await prisma.task.findMany({
    where: { userId: session.user.id },
    include: { deadline: true },
    orderBy: [{ completed: "asc" }, { sortOrder: "asc" }],
  });

  return NextResponse.json(tasks);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  // Get the max sortOrder for this deadline
  const maxSort = await prisma.task.aggregate({
    where: { deadlineId: body.deadlineId, userId: session.user.id },
    _max: { sortOrder: true },
  });

  const task = await prisma.task.create({
    data: {
      userId: session.user.id,
      deadlineId: body.deadlineId || null,
      title: body.title,
      estimateMinutes: body.estimateMinutes || null,
      sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
    },
  });

  return NextResponse.json(task);
}
