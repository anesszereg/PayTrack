import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api";
import { NextResponse } from "next/server";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin();
  if (error) return error;
  const { name, phone } = await req.json();
  const client = await prisma.user.update({
    where: { id: params.id },
    data: {
      ...(name !== undefined && { name }),
      ...(phone !== undefined && { phone }),
    },
    select: { id: true, name: true, phone: true },
  });
  return NextResponse.json(client);
}
