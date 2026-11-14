import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api";
import { NextResponse } from "next/server";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;
  const products = await prisma.product.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(products);
}

export async function POST(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;
  const { name, description, price, stock } = await req.json();
  if (!name || price == null) return NextResponse.json({ error: "name and price required" }, { status: 400 });
  const product = await prisma.product.create({
    data: { name, description: description || null, price, stock: Number(stock) || 0 },
  });
  return NextResponse.json(product, { status: 201 });
}
