import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sessions = await prisma.studySession.findMany({
    where: { userId: session.user.id },
    orderBy: { startAt: "asc" },
  });

  return NextResponse.json(sessions);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  const studySession = await prisma.studySession.create({
    data: {
      userId: session.user.id,
      title: body.title,
      startAt: new Date(body.startAt),
      endAt: new Date(body.endAt),
      taskId: body.taskId || null,
      notes: body.notes || null,
    },
  });

  return NextResponse.json(studySession);
}
