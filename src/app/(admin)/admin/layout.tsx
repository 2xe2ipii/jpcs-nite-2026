"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/admin",                label: "Dashboard",       exact: true  },
  { href: "/admin/buzzer-control", label: "Buzzer Control",  exact: false },
  { href: "/admin/scoring",        label: "Scoring",         exact: false },
  { href: "/admin/tables",         label: "Tables",          exact: false },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-night text-white">
      {/* Sidebar */}
      <aside className="hidden w-56 shrink-0 flex-col border-r border-surface-3 bg-[#0d1117] md:flex">
        {/* Brand */}
        <div className="border-b border-surface-3 px-4 py-4">
          <p className="text-sm font-semibold text-white">Admin</p>
        </div>

        {/* Nav */}
        <nav className="flex flex-1 flex-col gap-0.5 p-2">
          {NAV_ITEMS.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded py-2 text-sm font-medium transition-colors",
                  active
                    ? "border-l-2 border-gold bg-surface-2 pl-[10px] text-white"
                    : "pl-3 text-white/50 hover:bg-surface-2 hover:text-white/80",
                )}
              >
                {item.label}
              </Link>
            );
          })}
          <div className="mt-0.5 cursor-not-allowed rounded py-2 pl-3 text-sm font-medium text-white/20">
            Vote (coming soon)
          </div>
        </nav>

        {/* Footer */}
        <div className="border-t border-surface-3 px-4 py-3">
          <p className="text-[10px] text-white/30">JPCS NITE 2026</p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
}
