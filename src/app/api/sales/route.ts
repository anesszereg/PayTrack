import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api";
import { generateInstallments, syncStatuses } from "@/lib/finance";
import { notify } from "@/lib/notifications";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;
  await syncStatuses();
  const sales = await prisma.sale.findMany({
    include: {
      client: { select: { id: true, name: true, email: true } },
      product: { select: { id: true, name: true } },
      installments: { orderBy: { number: "asc" } },
      payments: { orderBy: { createdAt: "desc" } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(sales);
}

export async function POST(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;
  const {
    clientId, productId, quantity = 1, totalPrice, initialPayment = 0,
    frequency = "MONTHLY", installmentCount = 1, firstDueDate, notes,
  } = await req.json();

  if (!clientId || !productId || totalPrice == null)
    return NextResponse.json({ error: "clientId, productId and totalPrice are required" }, { status: 400 });

  const price = new Prisma.Decimal(totalPrice);
  const initial = new Prisma.Decimal(initialPayment);
  if (price.lte(0)) return NextResponse.json({ error: "totalPrice must be positive" }, { status: 400 });
  if (initial.lt(0) || initial.gt(price))
    return NextResponse.json({ error: "invalid initial payment" }, { status: 400 });

  const sale = await prisma.$transaction(async (tx) => {
    const s = await tx.sale.create({
      data: {
        clientId, productId, quantity: Number(quantity),
        totalPrice: price, initialPayment: initial,
        frequency, notes: notes || null,
        status: initial.gte(price) ? "COMPLETED" : "ACTIVE",
      },
    });
    if (initial.gt(0)) {
      await tx.payment.create({
        data: {
          saleId: s.id,
          amount: initial,
          method: "deposit",
          note: "Initial payment",
          receiptNo: `RC-${Date.now()}`,
        },
      });
    }
    return s;
  });

  await generateInstallments(sale.id, {
    totalPrice: Number(price),
    initialPayment: Number(initial),
    frequency,
    count: Number(installmentCount),
    startDate: firstDueDate ? new Date(firstDueDate) : new Date(),
  });
  await syncStatuses(sale.id);

  const product = await prisma.product.findUnique({ where: { id: productId } });
  await notify(
    clientId, "INFO", "New purchase registered",
    `A purchase of ${product?.name ?? "a product"} for ${price} DZD was registered on your account. Initial payment: ${initial} DZD.`
  );

  const full = await prisma.sale.findUnique({
    where: { id: sale.id },
    include: { installments: { orderBy: { number: "asc" } } },
  });
  return NextResponse.json(full, { status: 201 });
}
