import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Shell, { NavItem } from "@/components/Shell";
import { scanAndNotify } from "@/lib/notifications";

const nav: NavItem[] = [
  { href: "/portal", label: "My purchases", icon: "🛍️" },
  { href: "/portal/payments", label: "Payment history", icon: "💳" },
];

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (session.user.role === "ADMIN") redirect("/admin");

  try { await scanAndNotify(); } catch {}

  return <Shell nav={nav} userName={session.user.name ?? "Client"} roleLabel="Client portal">{children}</Shell>;
}
