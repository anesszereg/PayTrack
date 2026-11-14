import { prisma } from "@/lib/prisma";
import { syncStatuses } from "@/lib/finance";
import { Card, Badge, fmt } from "@/components/ui";
import Link from "next/link";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function SalesPage() {
  await syncStatuses();
  const sales = await prisma.sale.findMany({
    include: { client: true, product: true, installments: true, payments: true },
    orderBy: { createdAt: "desc" },
  });

  const paid = (s: (typeof sales)[0]) =>
    s.payments.reduce((a, p) => a.plus(p.amount), new Prisma.Decimal(0));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Sales</h1>
        <Link href="/admin/sales/new" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
          + New sale
        </Link>
      </div>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs uppercase text-slate-400">
                <th className="pb-3">Client</th><th className="pb-3">Product</th><th className="pb-3">Total</th>
                <th className="pb-3">Paid</th><th className="pb-3">Remaining</th><th className="pb-3">Plan</th>
                <th className="pb-3">Status</th><th className="pb-3" />
              </tr>
            </thead>
            <tbody>
              {sales.map((s) => {
                const p = paid(s);
                return (
                  <tr key={s.id} className="border-b border-slate-50 last:border-0">
                    <td className="py-3 font-medium">{s.client.name}</td>
                    <td className="py-3 text-slate-500">{s.product.name}{s.quantity > 1 ? ` ×${s.quantity}` : ""}</td>
                    <td className="py-3">{fmt(s.totalPrice.toString())}</td>
                    <td className="py-3 text-emerald-600">{fmt(p.toString())}</td>
                    <td className="py-3 text-red-600">{fmt(new Prisma.Decimal(s.totalPrice).minus(p).toString())}</td>
                    <td className="py-3 text-slate-500">{s.frequency === "FULL" ? "Full" : `${s.installments.length}× ${s.frequency.toLowerCase()}`}</td>
                    <td className="py-3"><Badge status={s.status} /></td>
                    <td className="py-3 text-right">
                      <Link href={`/admin/sales/${s.id}`} className="text-indigo-600 hover:underline">Manage</Link>
                    </td>
                  </tr>
                );
              })}
              {sales.length === 0 && <tr><td colSpan={8} className="py-6 text-center text-slate-400">No sales yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
