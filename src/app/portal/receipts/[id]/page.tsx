import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { fmt } from "@/components/ui";
import PrintButton from "@/components/PrintButton";

export const dynamic = "force-dynamic";

export default async function ReceiptPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const payment = await prisma.payment.findUnique({
    where: { id: params.id },
    include: { sale: { include: { client: true, product: true } } },
  });
  if (!payment) notFound();
  if (payment.sale.clientId !== session!.user.id && session!.user.role !== "ADMIN") redirect("/portal");

  const agg = await prisma.payment.aggregate({
    where: { saleId: payment.saleId },
    _sum: { amount: true },
  });
  const paid = Number(agg._sum.amount ?? 0);
  const remaining = Number(payment.sale.totalPrice) - paid;

  return (
    <div className="mx-auto max-w-lg py-8">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm" id="receipt">
        <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 font-bold text-white">P</div>
            <span className="font-semibold">PayTrack</span>
          </div>
          <div className="text-right text-xs text-slate-400">
            Receipt<br /><span className="font-mono">{payment.receiptNo}</span>
          </div>
        </div>
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between"><dt className="text-slate-500">Date</dt><dd>{payment.createdAt.toLocaleString()}</dd></div>
          <div className="flex justify-between"><dt className="text-slate-500">Client</dt><dd className="font-medium">{payment.sale.client.name}</dd></div>
          <div className="flex justify-between"><dt className="text-slate-500">Product</dt><dd>{payment.sale.product.name}</dd></div>
          <div className="flex justify-between"><dt className="text-slate-500">Method</dt><dd className="capitalize">{payment.method}</dd></div>
          {payment.note && <div className="flex justify-between"><dt className="text-slate-500">Note</dt><dd>{payment.note}</dd></div>}
          <div className="flex justify-between border-t border-slate-100 pt-3 text-base">
            <dt className="font-semibold">Amount paid</dt>
            <dd className="font-bold text-emerald-600">{fmt(payment.amount.toString())}</dd>
          </div>
          <div className="flex justify-between text-sm"><dt className="text-slate-500">Total paid to date</dt><dd>{fmt(paid)}</dd></div>
          <div className="flex justify-between text-sm"><dt className="text-slate-500">Remaining balance</dt><dd className="font-medium text-red-600">{fmt(remaining)}</dd></div>
        </dl>
        <p className="mt-8 text-center text-xs text-slate-400">Thank you for your payment.</p>
      </div>
      <PrintButton />
    </div>
  );
}
