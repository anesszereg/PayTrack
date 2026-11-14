import { prisma } from "@/lib/prisma";
import { Card, fmt } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  const payments = await prisma.payment.findMany({
    include: { sale: { include: { client: true, product: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Payments</h1>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs uppercase text-slate-400">
                <th className="pb-3">Date</th><th className="pb-3">Receipt</th><th className="pb-3">Client</th>
                <th className="pb-3">Product</th><th className="pb-3">Method</th><th className="pb-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-b border-slate-50 last:border-0">
                  <td className="py-2.5">{p.createdAt.toLocaleDateString()}</td>
                  <td className="py-2.5 font-mono text-xs">{p.receiptNo}</td>
                  <td className="py-2.5 font-medium">{p.sale.client.name}</td>
                  <td className="py-2.5 text-slate-500">{p.sale.product.name}</td>
                  <td className="py-2.5 capitalize">{p.method}</td>
                  <td className="py-2.5 text-right font-medium">{fmt(p.amount.toString())}</td>
                </tr>
              ))}
              {payments.length === 0 && <tr><td colSpan={6} className="py-6 text-center text-slate-400">No payments recorded.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
