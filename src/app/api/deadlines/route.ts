import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const deadlines = await prisma.deadline.findMany({
    where: { userId: session.user.id },
    include: { tasks: { orderBy: { sortOrder: "asc" } } },
    orderBy: { dueAt: "asc" },
  });

  return NextResponse.json(deadlines);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  const deadline = await prisma.deadline.create({
    data: {
      userId: session.user.id,
      title: body.title,
      description: body.description || null,
      dueAt: new Date(body.dueAt),
      source: "MANUAL",
      courseName: body.courseName || null,
      priority: body.priority || "MEDIUM",
    },
  });

  return NextResponse.json(deadline);
}
