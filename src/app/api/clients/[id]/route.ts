import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin();
  if (error) return error;
  const { name, email, phone, password } = await req.json();
  const client = await prisma.user.update({
    where: { id: params.id },
    data: {
      ...(name !== undefined && { name }),
      ...(email !== undefined && { email: email.toLowerCase().trim() }),
      ...(phone !== undefined && { phone }),
      ...(password && { password: await bcrypt.hash(password, 10) }),
    },
    select: { id: true, name: true, email: true, phone: true },
  });
  return NextResponse.json(client);
}
