import { prisma } from "./prisma";
import { addDays, addMonths } from "date-fns";
import { Prisma } from "@prisma/client";

const D = (n: number | string | Prisma.Decimal) => new Prisma.Decimal(n);

/**
 * Generate an installment schedule for a sale.
 * For FULL frequency, a single installment covering the remaining balance is created.
 */
export async function generateInstallments(
  saleId: string,
  opts: {
    totalPrice: number;
    initialPayment: number;
    frequency: "FULL" | "WEEKLY" | "MONTHLY";
    count: number;
    startDate: Date;
  }
) {
  const remaining = D(opts.totalPrice).minus(opts.initialPayment);
  if (remaining.lte(0)) return;

  const count = opts.frequency === "FULL" ? 1 : Math.max(1, opts.count);
  const base = remaining.div(count).toDecimalPlaces(2);
  const rows = [];
  let allocated = D(0);

  for (let i = 0; i < count; i++) {
    const isLast = i === count - 1;
    const amount = isLast ? remaining.minus(allocated) : base;
    allocated = allocated.plus(amount);
    rows.push({
      saleId,
      number: i + 1,
      amount,
      dueDate:
        opts.frequency === "WEEKLY"
          ? addDays(opts.startDate, 7 * (i + 1))
          : opts.frequency === "MONTHLY"
          ? addMonths(opts.startDate, i + 1)
          : opts.startDate,
    });
  }
  await prisma.installment.createMany({ data: rows });
}

/**
 * Apply a payment amount to a sale: allocate to earliest unpaid installments,
 * update statuses, and mark the sale COMPLETED when fully paid.
 */
export async function applyPayment(
  tx: Prisma.TransactionClient,
  saleId: string,
  amount: Prisma.Decimal,
  preferredInstallmentId?: string | null
) {
  let remaining = amount;
  const installments = await tx.installment.findMany({
    where: { saleId, status: { in: ["PENDING", "PARTIAL", "OVERDUE"] } },
    orderBy: { number: "asc" },
  });

  // Honor explicit installment targeting first
  if (preferredInstallmentId) {
    const inst = installments.find((i) => i.id === preferredInstallmentId);
    if (inst) {
      const due = D(inst.amount).minus(inst.paidAmount);
      const pay = remaining.gte(due) ? due : remaining;
      await tx.installment.update({
        where: { id: inst.id },
        data: {
          paidAmount: { increment: pay },
          status: pay.gte(due) ? "PAID" : "PARTIAL",
          paidAt: pay.gte(due) ? new Date() : undefined,
        },
      });
      remaining = remaining.minus(pay);
    }
  }

  for (const inst of installments) {
    if (remaining.lte(0)) break;
    if (inst.id === preferredInstallmentId) continue;
    const due = D(inst.amount).minus(inst.paidAmount);
    const pay = remaining.gte(due) ? due : remaining;
    await tx.installment.update({
      where: { id: inst.id },
      data: {
        paidAmount: { increment: pay },
        status: pay.gte(due) ? "PAID" : "PARTIAL",
        paidAt: pay.gte(due) ? new Date() : undefined,
      },
    });
    remaining = remaining.minus(pay);
  }
  return remaining; // any overpayment left unallocated
}

/** Recompute OVERDUE flags and sale completion status. Call on reads. */
export async function syncStatuses(saleId?: string) {
  const now = new Date();
  await prisma.installment.updateMany({
    where: {
      ...(saleId ? { saleId } : {}),
      dueDate: { lt: now },
      status: { in: ["PENDING", "PARTIAL"] },
    },
    data: { status: "OVERDUE" },
  });
  // A fully-covered sale (paid installments + initial payment >= total) completes
  const sales = await prisma.sale.findMany({
    where: { ...(saleId ? { id: saleId } : {}), status: "ACTIVE" },
    include: { installments: true },
  });
  for (const sale of sales) {
    if (sale.installments.length === 0) {
      if (D(sale.initialPayment).gte(sale.totalPrice))
        await prisma.sale.update({ where: { id: sale.id }, data: { status: "COMPLETED" } });
      continue;
    }
    if (sale.installments.every((i) => i.status === "PAID"))
      await prisma.sale.update({ where: { id: sale.id }, data: { status: "COMPLETED" } });
  }
}
