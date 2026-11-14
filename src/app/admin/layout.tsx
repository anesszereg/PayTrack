import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Shell, { NavItem } from "@/components/Shell";
import { scanAndNotify } from "@/lib/notifications";

const nav: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: "📊" },
  { href: "/admin/products", label: "Products", icon: "📦" },
  { href: "/admin/clients", label: "Clients", icon: "👥" },
  { href: "/admin/sales", label: "Sales", icon: "🧾" },
  { href: "/admin/payments", label: "Payments", icon: "💳" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/portal");

  // lightweight scan keeps notifications fresh on each page load
  try { await scanAndNotify(); } catch {}

  return <Shell nav={nav} userName={session.user.name ?? "Admin"} roleLabel="Administrator">{children}</Shell>;
}
