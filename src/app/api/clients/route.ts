import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api";
import { NextResponse } from "next/server";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;
  const clients = await prisma.user.findMany({
    where: { role: "CLIENT" },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, phone: true, createdAt: true, _count: { select: { sales: true } } },
  });
  return NextResponse.json(clients);
}

export async function POST(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;
  const { name, phone } = await req.json();
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });
  const client = await prisma.user.create({
    data: { name, phone: phone || null, role: "CLIENT" },
    select: { id: true, name: true, phone: true },
  });
  return NextResponse.json(client, { status: 201 });
}
