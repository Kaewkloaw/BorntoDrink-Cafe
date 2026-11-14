import Image from "next/image";
import Link from "next/link";
import { AutoRefresh } from "./AdminControls";

const NAV = [
  { key: "dashboard", href: "/admin", label: "Dashboard" },
  { key: "orders", href: "/admin/orders", label: "Orders" },
  { key: "slip2go", href: "/admin/slip2go", label: "Slips" },
] as const;

export type AdminTab = (typeof NAV)[number]["key"];

/** Sidebar (desktop) / tab bar (mobile) shared by every admin page. */
export function AdminShell({ active, badge, children }: { active: AdminTab; badge?: number; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#f8f1e8] text-choco-900">
      <AutoRefresh />

      <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col bg-choco-900 px-4 py-5 text-linen lg:flex">
        <Link href="/" className="flex items-center gap-2.5 px-1">
          <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-linen">
            <Image src="/mascots/cup.webp" alt="" fill sizes="36px" className="scale-125 object-cover" />
          </span>
          <span className="font-display text-lg font-semibold leading-none">
            Bornto<span className="text-tangelo-600">Drink</span>
            <span className="mt-1.5 block font-sans text-xs font-medium uppercase tracking-[0.14em] text-linen/75">Admin</span>
          </span>
        </Link>

        <nav className="mt-8 space-y-0.5 text-sm" aria-label="Admin">
          {NAV.map((n) => (
            <Link
              key={n.key}
              href={n.href}
              aria-current={active === n.key ? "page" : undefined}
              className={`flex items-center justify-between rounded-md px-2.5 py-2.5 transition ${
                active === n.key ? "bg-white/10 font-medium text-linen" : "text-linen/70 hover:bg-white/5 hover:text-linen"
              }`}
            >
              {n.label}
              {n.key === "orders" && badge ? (
                <span className="rounded-full bg-tangelo-600 px-1.5 text-xs font-medium tabular-nums text-white">{badge}</span>
              ) : null}
            </Link>
          ))}
        </nav>

        <div className="mt-auto space-y-0.5 border-t border-white/10 pt-3 text-sm">
          <Link href="/" className="block rounded-md px-2.5 py-1.5 text-linen/70 transition hover:bg-white/10 hover:text-linen">
            View store ↗
          </Link>
          <form action="/api/admin/logout" method="post">
            <button className="w-full rounded-md px-2.5 py-1.5 text-left text-linen/70 transition hover:bg-white/10 hover:text-linen">Sign out</button>
          </form>
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <div className="sticky top-0 z-20 border-b border-choco/10 bg-white/95 backdrop-blur lg:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <Link href="/" className="font-display text-base font-semibold">
              Bornto<span className="text-tangelo-600">Drink</span> <span className="font-sans text-xs font-normal text-muted">Admin</span>
            </Link>
            <form action="/api/admin/logout" method="post">
              <button className="text-sm text-muted">Sign out</button>
            </form>
          </div>
          <nav className="flex gap-5 px-4 text-sm" aria-label="Admin">
            {NAV.map((n) => (
              <Link
                key={n.key}
                href={n.href}
                aria-current={active === n.key ? "page" : undefined}
                className={`-mb-px border-b-2 pb-2.5 ${active === n.key ? "border-choco-900 font-medium" : "border-transparent text-muted"}`}
              >
                {n.label}
                {n.key === "orders" && badge ? <span className="ml-1.5 rounded-full bg-tangelo-600 px-1.5 text-xs text-white">{badge}</span> : null}
              </Link>
            ))}
          </nav>
        </div>

        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-6 sm:px-8 sm:py-9">{children}</div>
      </main>
    </div>
  );
}
