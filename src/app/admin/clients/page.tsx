"use client";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui";

type Client = { id: string; name: string; email: string; phone: string | null; createdAt: string; _count: { sales: number } };

const empty = { name: "", email: "", phone: "", password: "" };

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");

  const load = () => fetch("/api/clients").then((r) => r.json()).then(setClients);
  useEffect(() => { load(); }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const body: Record<string, string> = { name: form.name, email: form.email, phone: form.phone };
    if (form.password) body.password = form.password;
    const res = await fetch(editing ? `/api/clients/${editing}` : "/api/clients", {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return setError((await res.json()).error || "Error saving");
    setForm(empty); setEditing(null); setShowForm(false); load();
  }

  const input = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Clients</h1>
        <button
          onClick={() => { setShowForm(!showForm); setEditing(null); setForm(empty); }}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          + Add client
        </button>
      </div>

      {showForm && (
        <Card title={editing ? "Edit client" : "New client"}>
          <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
            <input className={input} placeholder="Full name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <input className={input} placeholder="Email *" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            <input className={input} placeholder="Phone (WhatsApp)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <input className={input} placeholder={editing ? "New password (leave blank to keep)" : "Password *"} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required={!editing} />
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
                <th className="pb-3">Name</th><th className="pb-3">Email</th><th className="pb-3">Phone</th><th className="pb-3">Sales</th><th className="pb-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.id} className="border-b border-slate-50 last:border-0">
                  <td className="py-3 font-medium">{c.name}</td>
                  <td className="py-3 text-slate-500">{c.email}</td>
                  <td className="py-3 text-slate-500">{c.phone || "—"}</td>
                  <td className="py-3">{c._count.sales}</td>
                  <td className="py-3 text-right">
                    <button onClick={() => { setEditing(c.id); setForm({ name: c.name, email: c.email, phone: c.phone ?? "", password: "" }); setShowForm(true); }} className="text-indigo-600 hover:underline">Edit</button>
                  </td>
                </tr>
              ))}
              {clients.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-slate-400">No clients yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
