"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, fmt } from "./ui";

type Inst = { id: string; number: number; amount: number; paidAmount: number; dueDate: string; status: string };

export default function RecordPayment({ saleId, outstanding, installments }: { saleId: string; outstanding: number; installments: Inst[] }) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [installmentId, setInstallmentId] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    const res = await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ saleId, amount: Number(amount), method, note: note || undefined, installmentId: installmentId || undefined }),
    });
    setLoading(false);
    if (!res.ok) return setError((await res.json()).error || "Error recording payment");
    setAmount(""); setNote(""); setInstallmentId("");
    router.refresh();
  }

  const input = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none";

  return (
    <Card title="Record a payment" action={<span className="text-sm text-slate-400">Outstanding: {fmt(outstanding)}</span>}>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Amount *</label>
          <input className={input} type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Method</label>
          <select className={input} value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="cash">Cash</option>
            <option value="card">Card</option>
            <option value="transfer">Bank transfer</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Apply to installment (optional)</label>
          <select className={input} value={installmentId} onChange={(e) => setInstallmentId(e.target.value)}>
            <option value="">Auto (earliest due)</option>
            {installments.map((i) => (
              <option key={i.id} value={i.id}>
                #{i.number} — {fmt(i.amount - i.paidAmount)} due {new Date(i.dueDate).toLocaleDateString()}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Note</label>
          <input className={input} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" />
        </div>
        {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
        <div className="sm:col-span-2">
          <button disabled={loading} className="rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
            {loading ? "Recording…" : "Record payment"}
          </button>
        </div>
      </form>
    </Card>
  );
}
