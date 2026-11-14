import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { syncStatuses } from "@/lib/finance";
import { Card, Badge, fmt } from "@/components/ui";
import Link from "next/link";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function PortalHome() {
  const session = await getServerSession(authOptions);
  const userId = session!.user.id;
  await syncStatuses();

  const sales = await prisma.sale.findMany({
    where: { clientId: userId },
    include: { product: true, installments: { orderBy: { number: "asc" } }, payments: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">My purchases</h1>
      {sales.length === 0 && <Card><p className="text-sm text-slate-400">You have no purchases yet.</p></Card>}
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {sales.map((s) => {
          const paid = s.payments.reduce((a, p) => a.plus(p.amount), new Prisma.Decimal(0));
          const remaining = new Prisma.Decimal(s.totalPrice).minus(paid);
          const progress = Math.min(100, Number(paid.div(s.totalPrice).times(100)));
          const next = s.installments.find((i) => i.status !== "PAID");
          return (
            <Card key={s.id}>
              <div className="mb-3 flex items-start justify-between">
                <div>
                  <div className="font-semibold">{s.product.name}</div>
                  <div className="text-xs text-slate-400">{s.createdAt.toLocaleDateString()}</div>
                </div>
                <Badge status={s.status} />
              </div>
              <dl className="mb-3 space-y-1.5 text-sm">
                <div className="flex justify-between"><dt className="text-slate-500">Total</dt><dd className="font-medium">{fmt(s.totalPrice.toString())}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Paid</dt><dd className="font-medium text-emerald-600">{fmt(paid.toString())}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Remaining</dt><dd className="font-medium text-red-600">{fmt(remaining.toString())}</dd></div>
              </dl>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${progress}%` }} />
              </div>
              <div className="mt-1 text-xs text-slate-400">{progress.toFixed(0)}% paid</div>
              {next && (
                <div className="mt-3 rounded-lg bg-indigo-50 px-3 py-2 text-xs text-indigo-700">
                  Next payment: <strong>{fmt(Number(next.amount) - Number(next.paidAmount))}</strong> due {next.dueDate.toLocaleDateString()}
                  {next.status === "OVERDUE" && <span className="ml-1 font-semibold text-red-600">(overdue)</span>}
                </div>
              )}
              <Link href={`/portal/sales/${s.id}`} className="mt-4 block rounded-lg bg-slate-900 py-2 text-center text-sm font-medium text-white hover:bg-slate-800">
                View details
              </Link>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
