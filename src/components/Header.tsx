"use client";

import Image from "next/image";
import Link from "next/link";
import { useCart } from "./CartProvider";

export function Header({ search, onSearch }: { search?: string; onSearch?: (v: string) => void }) {
  const { count, setOpen } = useCart();
  return (
    <header className="sticky top-0 z-30 border-b border-choco/10 bg-[#fffdfa]/95 backdrop-blur">
      <div className="mx-auto flex h-[var(--header-h)] max-w-[1920px] items-center gap-3 px-4 sm:gap-6 sm:px-6 lg:px-10">
        <Link href="/" aria-label="BorntoDrink home" className="flex shrink-0 items-center" onClick={(event) => {
          if (window.location.pathname === "/" && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
            window.scrollTo({ top: 0, behavior: "smooth" });
          }
        }}>
          <Image src="/brand/borntodrink-logo-transparent.png" alt="" width={190} height={64} priority style={{ width: 190, height: "auto", maxWidth: "100%" }} />
        </Link>

        {onSearch && (
          <label className="ml-auto hidden flex-1 items-center gap-2 rounded-full border border-choco/10 bg-white px-5 py-2.5 md:flex md:max-w-md">
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-muted" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Search menu"
              className="w-full bg-transparent text-base outline-none placeholder:text-muted"
            />
          </label>
        )}

        <nav className={`ml-auto flex items-center gap-1 text-xs font-medium md:gap-2 md:text-sm ${onSearch ? "md:ml-0" : ""}`}>
          <button
            onClick={() => setOpen(true)}
            className="relative flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 hover:bg-linen"
            aria-label={`Bag, ${count} items`}
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6 md:h-7 md:w-7" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M6 8h12l-1 12H7L6 8Zm3 0V6a3 3 0 0 1 6 0v2" />
            </svg>
            Bag
            {count > 0 && (
              <span className="absolute -right-0.5 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-tangelo-600 px-1 text-xs font-bold text-white md:h-6 md:min-w-6">
                {count}
              </span>
            )}
          </button>
        </nav>
      </div>
    </header>
  );
}
