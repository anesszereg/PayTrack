import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { syncStatuses } from "@/lib/finance";
import { Card, Badge, fmt } from "@/components/ui";
import { notFound, redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function PortalSaleDetail({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  await syncStatuses(params.id);
  const sale = await prisma.sale.findUnique({
    where: { id: params.id },
    include: { product: true, installments: { orderBy: { number: "asc" } }, payments: { orderBy: { createdAt: "desc" } } },
  });
  if (!sale) notFound();
  if (sale.clientId !== session!.user.id && session!.user.role !== "ADMIN") redirect("/portal");

  const paid = sale.payments.reduce((a, p) => a.plus(p.amount), new Prisma.Decimal(0));
  const remaining = new Prisma.Decimal(sale.totalPrice).minus(paid);
  const progress = Math.min(100, Number(paid.div(sale.totalPrice).times(100)));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/portal" className="text-sm text-slate-500 hover:underline">← My purchases</Link>
        <h1 className="text-2xl font-bold">{sale.product.name}</h1>
        <Badge status={sale.status} />
      </div>

      <Card title="Progress">
        <dl className="mb-3 grid grid-cols-3 gap-4 text-center">
          <div><dt className="text-xs text-slate-400">Total</dt><dd className="text-lg font-bold">{fmt(sale.totalPrice.toString())}</dd></div>
          <div><dt className="text-xs text-slate-400">Paid</dt><dd className="text-lg font-bold text-emerald-600">{fmt(paid.toString())}</dd></div>
          <div><dt className="text-xs text-slate-400">Remaining</dt><dd className="text-lg font-bold text-red-600">{fmt(remaining.toString())}</dd></div>
        </dl>
        <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${progress}%` }} />
        </div>
        <div className="mt-1 text-xs text-slate-400">{progress.toFixed(0)}% paid</div>
      </Card>

      <Card title="Payment schedule">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs uppercase text-slate-400">
                <th className="pb-3">#</th><th className="pb-3">Due date</th><th className="pb-3">Amount</th>
                <th className="pb-3">Paid</th><th className="pb-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {sale.installments.map((i) => (
                <tr key={i.id} className="border-b border-slate-50 last:border-0">
                  <td className="py-2.5">{i.number}</td>
                  <td className="py-2.5">{i.dueDate.toLocaleDateString()}</td>
                  <td className="py-2.5">{fmt(i.amount.toString())}</td>
                  <td className="py-2.5">{fmt(i.paidAmount.toString())}</td>
                  <td className="py-2.5"><Badge status={i.status} /></td>
                </tr>
              ))}
              {sale.installments.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-slate-400">Paid in full.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Payment history & receipts">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs uppercase text-slate-400">
                <th className="pb-3">Date</th><th className="pb-3">Method</th><th className="pb-3 text-right">Amount</th><th className="pb-3 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody>
              {sale.payments.map((p) => (
                <tr key={p.id} className="border-b border-slate-50 last:border-0">
                  <td className="py-2.5">{p.createdAt.toLocaleDateString()}</td>
                  <td className="py-2.5 capitalize">{p.method}</td>
                  <td className="py-2.5 text-right font-medium">{fmt(p.amount.toString())}</td>
                  <td className="py-2.5 text-right">
                    <Link href={`/portal/receipts/${p.id}`} target="_blank" className="text-indigo-600 hover:underline">
                      Download
                    </Link>
                  </td>
                </tr>
              ))}
              {sale.payments.length === 0 && <tr><td colSpan={4} className="py-6 text-center text-slate-400">No payments yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
