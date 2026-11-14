import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api";
import { applyPayment, syncStatuses } from "@/lib/finance";
import { notify } from "@/lib/notifications";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

export async function POST(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;
  const { saleId, amount, method = "cash", note, installmentId } = await req.json();
  if (!saleId || amount == null)
    return NextResponse.json({ error: "saleId and amount required" }, { status: 400 });
  const amt = new Prisma.Decimal(amount);
  if (amt.lte(0)) return NextResponse.json({ error: "amount must be positive" }, { status: 400 });

  const sale = await prisma.sale.findUnique({
    where: { id: saleId },
    include: { installments: true, product: true },
  });
  if (!sale || sale.status === "CANCELLED")
    return NextResponse.json({ error: "Sale not found" }, { status: 404 });

  const payment = await prisma.$transaction(async (tx) => {
    const p = await tx.payment.create({
      data: { saleId, installmentId: installmentId || null, amount: amt, method, note: note || null, receiptNo: `RC-${Date.now()}` },
    });
    await applyPayment(tx, saleId, amt, installmentId);
    return p;
  });
  await syncStatuses(saleId);

  await notify(
    sale.clientId, "PAYMENT_RECEIVED", "Payment received",
    `We received your payment of ${amt} DZD for ${sale.product.name}. Receipt #${payment.receiptNo}.`
  );
  return NextResponse.json(payment, { status: 201 });
}
