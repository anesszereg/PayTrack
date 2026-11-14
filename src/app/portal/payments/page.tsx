import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, fmt } from "@/components/ui";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function PortalPayments() {
  const session = await getServerSession(authOptions);
  const payments = await prisma.payment.findMany({
    where: { sale: { clientId: session!.user.id } },
    include: { sale: { include: { product: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Payment history</h1>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs uppercase text-slate-400">
                <th className="pb-3">Date</th><th className="pb-3">Product</th><th className="pb-3">Method</th>
                <th className="pb-3 text-right">Amount</th><th className="pb-3 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-b border-slate-50 last:border-0">
                  <td className="py-2.5">{p.createdAt.toLocaleDateString()}</td>
                  <td className="py-2.5">{p.sale.product.name}</td>
                  <td className="py-2.5 capitalize">{p.method}</td>
                  <td className="py-2.5 text-right font-medium">{fmt(p.amount.toString())}</td>
                  <td className="py-2.5 text-right">
                    <Link href={`/portal/receipts/${p.id}`} target="_blank" className="text-indigo-600 hover:underline">Download</Link>
                  </td>
                </tr>
              ))}
              {payments.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-slate-400">No payments yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
