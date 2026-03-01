import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: { orderedIds: string[] } = await req.json();

  // Update sort order for each task
  await Promise.all(
    body.orderedIds.map((id, index) =>
      prisma.task.updateMany({
        where: { id, userId: session.user.id },
        data: { sortOrder: index },
      })
    )
  );

  return NextResponse.json({ ok: true });
}
