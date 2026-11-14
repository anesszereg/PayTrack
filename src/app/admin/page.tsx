import { prisma } from "@/lib/prisma";
import { syncStatuses } from "@/lib/finance";
import { StatCard, Badge, Card, fmt } from "@/components/ui";
import RevenueChart from "@/components/RevenueChart";
import Link from "next/link";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  await syncStatuses();

  const [sales, paymentsAgg, overdue, upcoming, payments] = await Promise.all([
    prisma.sale.findMany({ include: { installments: true, payments: true, client: true, product: true } }),
    prisma.payment.aggregate({ _sum: { amount: true }, _count: true }),
    prisma.installment.findMany({
      where: { status: "OVERDUE" },
      include: { sale: { include: { client: true, product: true } } },
      orderBy: { dueDate: "asc" },
    }),
    prisma.installment.findMany({
      where: { status: { in: ["PENDING", "PARTIAL"] }, dueDate: { gte: new Date() } },
      include: { sale: { include: { client: true, product: true } } },
      orderBy: { dueDate: "asc" },
      take: 8,
    }),
    prisma.payment.findMany({ orderBy: { createdAt: "asc" }, select: { amount: true, createdAt: true } }),
  ]);

  const totalSales = sales.length;
  const totalRevenue = sales.reduce((s, x) => s.plus(x.totalPrice), new Prisma.Decimal(0));
  const collected = paymentsAgg._sum.amount ?? new Prisma.Decimal(0);
  const outstanding = totalRevenue.minus(collected);
  const activeSales = sales.filter((s) => s.status === "ACTIVE").length;

  // monthly revenue for the last 6 months
  const months: { label: string; total: number }[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const next = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const sum = payments
      .filter((p) => p.createdAt >= d && p.createdAt < next)
      .reduce((a, p) => a + Number(p.amount), 0);
    months.push({ label: d.toLocaleString("en-US", { month: "short" }), total: sum });
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Total sales" value={String(totalSales)} sub={`${activeSales} active`} />
        <StatCard label="Total revenue" value={fmt(totalRevenue.toString())} />
        <StatCard label="Collected" value={fmt(collected.toString())} color="text-emerald-600" />
        <StatCard label="Outstanding" value={fmt(outstanding.toString())} color="text-red-600" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Revenue collected (last 6 months)">
          <RevenueChart data={months} />
        </Card>
        <Card title="Upcoming payments">
          {upcoming.length === 0 && <p className="text-sm text-slate-400">No upcoming payments.</p>}
          <ul className="divide-y divide-slate-100">
            {upcoming.map((i) => (
              <li key={i.id} className="flex items-center justify-between py-2.5 text-sm">
                <div>
                  <span className="font-medium">{i.sale.client.name}</span>
                  <span className="text-slate-400"> · {i.sale.product.name} · #{i.number}</span>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{fmt(i.amount.toString())}</div>
                  <div className="text-xs text-slate-400">{i.dueDate.toLocaleDateString()}</div>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card title="Overdue installments">
        {overdue.length === 0 && <p className="text-sm text-slate-400">Nothing overdue. 🎉</p>}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <tbody>
              {overdue.map((i) => (
                <tr key={i.id} className="border-b border-slate-50 last:border-0">
                  <td className="py-2.5 font-medium">{i.sale.client.name}</td>
                  <td className="py-2.5 text-slate-500">{i.sale.product.name} · #{i.number}</td>
                  <td className="py-2.5">{fmt(Number(i.amount) - Number(i.paidAmount))}</td>
                  <td className="py-2.5 text-slate-400">{i.dueDate.toLocaleDateString()}</td>
                  <td className="py-2.5"><Badge status="OVERDUE" /></td>
                  <td className="py-2.5 text-right">
                    <Link href={`/admin/sales/${i.saleId}`} className="text-indigo-600 hover:underline">View</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
