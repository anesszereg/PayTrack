"use client";
import { useEffect, useState } from "react";
import { Card, Badge, fmt } from "@/components/ui";

type Product = { id: string; name: string; description: string | null; price: string; active: boolean };

const empty = { name: "", description: "", price: "" };

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");

  const load = () => fetch("/api/products").then((r) => r.json()).then(setProducts);
  useEffect(() => { load(); }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch(editing ? `/api/products/${editing}` : "/api/products", {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, price: Number(form.price) }),
    });
    if (!res.ok) return setError((await res.json()).error || "Error saving");
    setForm(empty); setEditing(null); setShowForm(false); load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this product?")) return;
    await fetch(`/api/products/${id}`, { method: "DELETE" });
    load();
  }

  const input = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Products</h1>
        <button
          onClick={() => { setShowForm(!showForm); setEditing(null); setForm(empty); }}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          + Add product
        </button>
      </div>

      {showForm && (
        <Card title={editing ? "Edit product" : "New product"}>
          <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
            <input className={input} placeholder="Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <input className={input} placeholder="Price *" type="number" step="0.01" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
            <input className={input} placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
            <div className="flex gap-2 sm:col-span-2">
              <button className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">Save</button>
              <button type="button" onClick={() => { setShowForm(false); setEditing(null); setForm(empty); }} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">Cancel</button>
            </div>
          </form>
        </Card>
      )}

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs uppercase text-slate-400">
                <th className="pb-3">Product</th><th className="pb-3">Price</th><th className="pb-3">Status</th><th className="pb-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-b border-slate-50 last:border-0">
                  <td className="py-3">
                    <div className="font-medium">{p.name}</div>
                    {p.description && <div className="text-xs text-slate-400">{p.description}</div>}
                  </td>
                  <td className="py-3">{fmt(p.price)}</td>
                  <td className="py-3"><Badge status={p.active ? "ACTIVE" : "CANCELLED"} /></td>
                  <td className="py-3 text-right">
                    <button onClick={() => { setEditing(p.id); setForm({ name: p.name, description: p.description ?? "", price: String(p.price) }); setShowForm(true); }} className="mr-3 text-indigo-600 hover:underline">Edit</button>
                    <button onClick={() => remove(p.id)} className="text-red-600 hover:underline">Delete</button>
                  </td>
                </tr>
              ))}
              {products.length === 0 && <tr><td colSpan={4} className="py-6 text-center text-slate-400">No products yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
