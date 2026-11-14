"use client";
import { useEffect, useRef, useState } from "react";

type Notif = { id: string; type: string; title: string; message: string; read: boolean; createdAt: string };

const COLORS: Record<string, string> = {
  UPCOMING: "bg-blue-100 text-blue-700",
  DUE: "bg-amber-100 text-amber-700",
  OVERDUE: "bg-red-100 text-red-700",
  PAYMENT_RECEIVED: "bg-emerald-100 text-emerald-700",
  INFO: "bg-slate-100 text-slate-600",
};

export default function NotificationBell() {
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const unread = notifs.filter((n) => !n.read).length;

  async function load() {
    const res = await fetch("/api/notifications");
    if (res.ok) setNotifs(await res.json());
  }
  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  async function markAll() {
    await fetch("/api/notifications", { method: "POST" });
    load();
  }

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} className="relative rounded-lg p-2 text-lg hover:bg-slate-100" aria-label="Notifications">
        🔔
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[90vw] rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <span className="text-sm font-semibold">Notifications</span>
            {unread > 0 && (
              <button onClick={markAll} className="text-xs text-indigo-600 hover:underline">
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifs.length === 0 && <p className="px-4 py-6 text-center text-sm text-slate-400">No notifications</p>}
            {notifs.map((n) => (
              <div key={n.id} className={`border-b border-slate-50 px-4 py-3 ${n.read ? "opacity-60" : ""}`}>
                <div className="mb-1 flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${COLORS[n.type] || COLORS.INFO}`}>
                    {n.type.replace("_", " ")}
                  </span>
                  <span className="text-xs text-slate-400">{new Date(n.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="text-sm font-medium text-slate-800">{n.title}</div>
                <div className="text-xs text-slate-500">{n.message}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
