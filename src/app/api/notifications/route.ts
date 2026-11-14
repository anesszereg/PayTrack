import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api";
import { NextResponse } from "next/server";

export async function GET() {
  const { session, error } = await requireUser();
  if (error) return error;
  const notifs = await prisma.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  return NextResponse.json(notifs);
}

export async function POST() {
  const { session, error } = await requireUser();
  if (error) return error;
  await prisma.notification.updateMany({
    where: { userId: session.user.id, read: false },
    data: { read: true },
  });
  return NextResponse.json({ ok: true });
}
