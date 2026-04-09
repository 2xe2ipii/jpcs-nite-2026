import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "JPCS NITE 2026 — Admin",
};

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", exact: true },
  { href: "/admin/buzzer-control", label: "Buzzer Control", exact: false },
  { href: "/admin/scoring", label: "Scoring", exact: false },
  { href: "/admin/tables", label: "Tables", exact: false },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-night text-white">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-night-line bg-night-soft md:flex">
        <div className="border-b border-night-line px-5 py-5">
          <p className="text-xs uppercase tracking-widest text-gold">
            JPCS NITE 2026
          </p>
          <p className="mt-1 text-lg font-semibold">Admin Console</p>
          <p className="mt-1 text-xs text-white/60">April 21, 2026 · Sentrum</p>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-night-line hover:text-white"
            >
              {item.label}
            </Link>
          ))}
          <div className="mt-1 cursor-not-allowed rounded-md px-3 py-2 text-sm font-medium text-white/30">
            Vote (coming soon)
          </div>
        </nav>
        <div className="border-t border-night-line px-3 py-3 text-[10px] uppercase tracking-wider text-white/40">
          Tech Team Only
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-night-line bg-night-soft/60 px-6 py-3 backdrop-blur">
          <div>
            <p className="text-xs uppercase tracking-widest text-gold">
              Nightsky of Golden Dreams
            </p>
            <h1 className="text-base font-semibold text-white">
              Admin Console
            </h1>
          </div>
          <span className="rounded-full border border-red-400/40 bg-red-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-red-300">
            Never project this screen
          </span>
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
