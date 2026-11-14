import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api";
import { NextResponse } from "next/server";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin();
  if (error) return error;
  const { name, description, price, stock, active } = await req.json();
  const product = await prisma.product.update({
    where: { id: params.id },
    data: {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(price !== undefined && { price }),
      ...(stock !== undefined && { stock: Number(stock) }),
      ...(active !== undefined && { active }),
    },
  });
  return NextResponse.json(product);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin();
  if (error) return error;
  const count = await prisma.sale.count({ where: { productId: params.id } });
  if (count > 0) {
    await prisma.product.update({ where: { id: params.id }, data: { active: false } });
    return NextResponse.json({ deactivated: true });
  }
  await prisma.product.delete({ where: { id: params.id } });
  return NextResponse.json({ deleted: true });
}
