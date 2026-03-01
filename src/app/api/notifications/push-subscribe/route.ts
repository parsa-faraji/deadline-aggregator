import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  // Check if subscription already exists
  const existing = await prisma.pushSubscription.findFirst({
    where: { userId: session.user.id, endpoint: body.endpoint },
  });

  if (existing) {
    return NextResponse.json(existing);
  }

  const sub = await prisma.pushSubscription.create({
    data: {
      userId: session.user.id,
      endpoint: body.endpoint,
      p256dh: body.keys.p256dh,
      auth: body.keys.auth,
    },
  });

  return NextResponse.json(sub);
}
