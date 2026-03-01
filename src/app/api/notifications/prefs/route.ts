import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const prefs = await prisma.notificationPrefs.findUnique({
    where: { userId: session.user.id },
  });

  return NextResponse.json(
    prefs || {
      emailEnabled: true,
      pushEnabled: false,
      smsEnabled: false,
      dailyDigest: true,
      reminderHours: 24,
      urgentHours: 2,
    }
  );
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  const prefs = await prisma.notificationPrefs.upsert({
    where: { userId: session.user.id },
    update: body,
    create: { userId: session.user.id, ...body },
  });

  return NextResponse.json(prefs);
}
