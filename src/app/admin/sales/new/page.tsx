"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui";

type Opt = { id: string; name: string; price?: string };

export default function NewSalePage() {
  const [clients, setClients] = useState<Opt[]>([]);
  const [products, setProducts] = useState<Opt[]>([]);
  const [form, setForm] = useState({
    clientId: "", productId: "", quantity: "1", totalPrice: "", initialPayment: "0",
    firstDueDate: "", notes: "",
  });
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    fetch("/api/clients").then((r) => r.json()).then(setClients);
    fetch("/api/products").then((r) => r.json()).then((ps: (Opt & { active: boolean })[]) => setProducts(ps.filter((p) => p.active)));
  }, []);

  function pickProduct(id: string) {
    const p = products.find((x) => x.id === id);
    setForm((f) => ({ ...f, productId: id, totalPrice: p?.price ? String(Number(p.price) * Number(f.quantity || 1)) : f.totalPrice }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: form.clientId, productId: form.productId,
        quantity: Number(form.quantity), totalPrice: Number(form.totalPrice),
        initialPayment: Number(form.initialPayment), frequency: "FULL",
        firstDueDate: form.firstDueDate || undefined, notes: form.notes || undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) return setError(data.error || "Error creating sale");
    router.push(`/admin/sales/${data.id}`);
  }

  const input = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none";
  const remaining = (Number(form.totalPrice) || 0) - (Number(form.initialPayment) || 0);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">New sale</h1>
      <Card>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-1">
            <label className="mb-1 block text-sm font-medium text-slate-700">Client *</label>
            <select className={input} value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })} required>
              <option value="">Select client…</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="sm:col-span-1">
            <label className="mb-1 block text-sm font-medium text-slate-700">Product *</label>
            <select className={input} value={form.productId} onChange={(e) => pickProduct(e.target.value)} required>
              <option value="">Select product…</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Quantity</label>
            <input className={input} type="number" min="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Total price *</label>
            <input className={input} type="number" min="0" step="0.01" value={form.totalPrice} onChange={(e) => setForm({ ...form, totalPrice: e.target.value })} required />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Initial payment / deposit</label>
            <input className={input} type="number" min="0" step="0.01" value={form.initialPayment} onChange={(e) => setForm({ ...form, initialPayment: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Due date</label>
            <input className={input} type="date" value={form.firstDueDate} onChange={(e) => setForm({ ...form, firstDueDate: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">Notes</label>
            <input className={input} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional" />
          </div>

          <div className="rounded-lg bg-slate-50 p-4 text-sm sm:col-span-2">
            Remaining balance: <strong>{remaining.toLocaleString("fr-DZ")} DZD</strong>
          </div>

          {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
          <div className="sm:col-span-2">
            <button className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-indigo-700">
              Create sale
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}
