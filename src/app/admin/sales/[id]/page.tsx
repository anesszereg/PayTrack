import { prisma } from "@/lib/prisma";
import { syncStatuses } from "@/lib/finance";
import { Card, Badge, fmt } from "@/components/ui";
import { notFound } from "next/navigation";
import { Prisma } from "@prisma/client";
import RecordPayment from "@/components/RecordPayment";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function SaleDetail({ params }: { params: { id: string } }) {
  await syncStatuses(params.id);
  const sale = await prisma.sale.findUnique({
    where: { id: params.id },
    include: {
      client: true, product: true,
      installments: { orderBy: { number: "asc" } },
      payments: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!sale) notFound();

  const paid = sale.payments.reduce((a, p) => a.plus(p.amount), new Prisma.Decimal(0));
  const remaining = new Prisma.Decimal(sale.totalPrice).minus(paid);
  const progress = Math.min(100, Number(paid.div(sale.totalPrice).times(100)));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/sales" className="text-sm text-slate-500 hover:underline">← Sales</Link>
        <h1 className="text-2xl font-bold">{sale.product.name} — {sale.client.name}</h1>
        <Badge status={sale.status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Summary">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-slate-500">Client</dt><dd className="font-medium">{sale.client.name}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Total</dt><dd className="font-semibold">{fmt(sale.totalPrice.toString())}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Paid</dt><dd className="font-semibold text-emerald-600">{fmt(paid.toString())}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Remaining</dt><dd className="font-semibold text-red-600">{fmt(remaining.toString())}</dd></div>
            <div className="pt-2">
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${progress}%` }} />
              </div>
              <div className="mt-1 text-xs text-slate-400">{progress.toFixed(0)}% paid</div>
            </div>
          </dl>
        </Card>

        <div className="lg:col-span-2">
          <RecordPayment saleId={sale.id} outstanding={Number(remaining)} installments={sale.installments.filter(i => i.status !== "PAID").map(i => ({ id: i.id, number: i.number, amount: Number(i.amount), paidAmount: Number(i.paidAmount), dueDate: i.dueDate.toISOString(), status: i.status }))} />
        </div>
      </div>

      <Card title="Installment schedule">
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
              {sale.installments.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-slate-400">Paid in full — no installments.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Payment history">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs uppercase text-slate-400">
                <th className="pb-3">Date</th><th className="pb-3">Receipt</th><th className="pb-3">Method</th>
                <th className="pb-3">Note</th><th className="pb-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {sale.payments.map((p) => (
                <tr key={p.id} className="border-b border-slate-50 last:border-0">
                  <td className="py-2.5">{p.createdAt.toLocaleDateString()}</td>
                  <td className="py-2.5 font-mono text-xs">{p.receiptNo}</td>
                  <td className="py-2.5 capitalize">{p.method}</td>
                  <td className="py-2.5 text-slate-500">{p.note || "—"}</td>
                  <td className="py-2.5 text-right font-medium">{fmt(p.amount.toString())}</td>
                </tr>
              ))}
              {sale.payments.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-slate-400">No payments yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
