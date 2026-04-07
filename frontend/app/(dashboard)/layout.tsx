"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Phone, LayoutDashboard, Megaphone, Settings, Users, BarChart2, Mail, UserCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-card flex flex-col">
        <div className="p-6 border-b">
          <div className="flex items-center gap-2">
            <Phone className="h-6 w-6 text-primary" />
            <span className="font-semibold text-lg">Pulse AI</span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <NavItem href="/" icon={<LayoutDashboard className="h-4 w-4" />}>
            Overview
          </NavItem>
          <NavItem href="/campaigns" icon={<Megaphone className="h-4 w-4" />}>
            Campaigns
          </NavItem>

          <div className="pt-3 pb-1">
            <p className="px-3 text-xs font-medium text-muted-foreground/60 uppercase tracking-wider">
              User Operations
            </p>
          </div>
          <NavItem href="/audience" icon={<UserCircle2 className="h-4 w-4" />}>
            RFM Audience
          </NavItem>

          <div className="pt-3 pb-1">
            <p className="px-3 text-xs font-medium text-muted-foreground/60 uppercase tracking-wider">
              Follow-up
            </p>
          </div>
          <NavItem href="/leads" icon={<Users className="h-4 w-4" />}>
            Leads
          </NavItem>
          <NavItem href="/followups" icon={<Mail className="h-4 w-4" />}>
            Follow-ups
          </NavItem>
          <NavItem href="/team" icon={<Users className="h-4 w-4" />}>
            Sales Team
          </NavItem>

          <div className="pt-3 pb-1">
            <p className="px-3 text-xs font-medium text-muted-foreground/60 uppercase tracking-wider">
              Analytics
            </p>
          </div>
          <NavItem href="/reports" icon={<BarChart2 className="h-4 w-4" />}>
            Daily Reports
          </NavItem>

          <div className="pt-3 pb-1">
            <p className="px-3 text-xs font-medium text-muted-foreground/60 uppercase tracking-wider">
              Settings
            </p>
          </div>
          <NavItem href="/settings" icon={<Settings className="h-4 w-4" />}>
            Settings
          </NavItem>
        </nav>

        <div className="p-4 border-t text-sm text-muted-foreground">
          demo@pulseai.com
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}

function NavItem({
  href,
  icon,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
        isActive
          ? "bg-accent text-foreground font-medium"
          : "text-muted-foreground hover:bg-accent hover:text-foreground"
      )}
    >
      {icon}
      {children}
    </Link>
  );
}
