import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const integrations = await prisma.integration.findMany({
    where: { userId: session.user.id },
  });

  return NextResponse.json(integrations);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  const integration = await prisma.integration.upsert({
    where: {
      userId_type: { userId: session.user.id, type: body.type },
    },
    update: {
      token: body.token || null,
      baseUrl: body.baseUrl || null,
      status: "ACTIVE",
      error: null,
    },
    create: {
      userId: session.user.id,
      type: body.type,
      token: body.token || null,
      baseUrl: body.baseUrl || null,
    },
  });

  return NextResponse.json(integration);
}
