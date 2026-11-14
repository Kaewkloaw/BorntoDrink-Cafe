"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { CATEGORIES, PRODUCTS, type CategoryId } from "@/lib/products";
import { Header } from "./Header";
import { CartDrawer } from "./CartDrawer";
import { ProductCard } from "./ProductCard";
import { useCart } from "./CartProvider";

export function Storefront() {
  const [search, setSearch] = useState("");
  const [active, setActive] = useState<CategoryId>("coldbrew");
  const q = search.trim().toLowerCase();

  const sections = useMemo(
    () =>
      CATEGORIES.map((c) => ({
        ...c,
        items: PRODUCTS.filter(
          (p) => p.category === c.id && (!q || p.name.toLowerCase().includes(q) || p.desc.toLowerCase().includes(q)),
        ),
      })).filter((s) => s.items.length > 0),
    [q],
  );

  const jump = (id: CategoryId) => {
    setActive(id);
    document.getElementById(`cat-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <>
      <Header search={search} onSearch={setSearch} />
      <CartDrawer />
      <main className="mx-auto w-full max-w-[1920px] flex-1 px-4 pb-24 sm:px-6 lg:px-10">
        <PromotionBanner />

        {/* mobile search */}
        <label className="mt-6 flex items-center gap-2 rounded-full bg-white px-4 py-2.5 shadow-sm ring-1 ring-choco/10 md:hidden">
          <span className="text-muted">⌕</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search menu"
            className="w-full bg-transparent text-sm outline-none"
          />
        </label>

        <div id="menu" className="sticky top-[var(--header-h)] z-20 -mx-4 mt-6 border-y border-choco/10 bg-linen-50/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
          <div className="no-scrollbar flex gap-2 overflow-x-auto">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                onClick={() => jump(c.id)}
                className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition md:px-5 md:py-2.5 md:text-base ${
                  active === c.id ? "bg-choco-900 text-white" : "text-muted hover:bg-white hover:text-choco"
                }`}
              >
                <CategoryIcon id={c.id} />{c.label}
              </button>
            ))}
          </div>
        </div>

        {sections.length === 0 && (
          <div className="flex flex-col items-center py-16 text-center">
            <Image src="/mascots/burger.webp" alt="" width={160} height={160} />
            <p className="mt-2 font-display text-xl">Nothing matches “{search}”</p>
          </div>
        )}

        {sections.map((s) => (
          <ProductRow key={s.id} id={s.id} title={s.label} items={s.items} />
        ))}
      </main>
      <Footer />
      <FloatingCart />
    </>
  );
}

function CategoryIcon({ id }: { id: CategoryId }) {
  const paths: Record<CategoryId, React.ReactNode> = {
    coldbrew: <><path d="M6 7h12l-1 13H7L6 7Z M5 5h14 M14 5l2-3" /><path d="m9 11 2 1-1 2-2-1z m4 4 2 1-1 2-2-1z" /></>,
    latte: <><path d="M4 8h13v5a6 6 0 0 1-6 6h-1a6 6 0 0 1-6-6V8Zm13 1h1a2.5 2.5 0 0 1 0 5h-1M7 4c0 1 1 1 1 2m4-2c0 1 1 1 1 2" /></>,
    espresso: <path d="M5 10h11v3a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5v-3Zm11 1h1a2 2 0 0 1 0 4h-1M4 20h14" />,
    tea: <><path d="M5 8h13v5a6 6 0 0 1-6 6h-1a6 6 0 0 1-6-6V8Zm13 1h1a2 2 0 0 1 0 4h-1M11 8v5l2 1" /><path d="M10 3c2 0 3 1 3 3-2 0-3-1-3-3Z" /></>,
    noncoffee: <><path d="M6 7h12l-1 13H7L6 7ZM5 5h14M14 5l2-3" /><path d="M9 14c2-2 4 2 6 0" /></>,
    bakery: <><path d="M3 16c2-6 5-9 9-9s7 3 9 9c-3-1-4-1-5 1-1-2-3-2-4 0-1-2-3-2-4 0-1-2-2-2-5-1Z" /><path d="M8 9c1 2 1 4 1 6m7-6c-1 2-1 4-1 6" /></>,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{paths[id]}</svg>;
}

function PromotionBanner() {
  return (
    <section className="relative mt-6 overflow-hidden rounded-[1.5rem] bg-[#f8e7d6]">
      <div className="relative flex min-h-[320px] items-center sm:min-h-[360px] lg:min-h-[clamp(420px,30vw,560px)]">
        <Image src="/products/grand-opening-banner-mobile.jpg" alt="" fill priority sizes="100vw" className="object-cover object-center sm:hidden" />
        <Image src="/products/grand-opening-banner-fresh.jpg" alt="" fill priority sizes="100vw" className="hidden object-cover object-left sm:block lg:object-center" />
        <div className="relative z-10 flex w-[43%] flex-col items-start px-3 py-6 text-choco-900 sm:w-[43%] sm:px-8 sm:py-10 lg:max-w-[650px] lg:p-12 xl:p-16">
          <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-tangelo-700 sm:text-sm sm:tracking-[0.18em] lg:text-base">Grand opening</p>
          <h1 className="mt-3 font-sans text-[clamp(2rem,5vw,5.5rem)] font-black leading-[0.95] tracking-[-0.05em] sm:mt-4"><span className="text-tangelo-600">10% OFF</span></h1>
          <p className="mt-3 text-sm font-semibold leading-snug sm:mt-4 sm:text-xl lg:text-2xl">Any drink + bakery</p>
          <p className="mt-2 text-xs leading-5 text-choco-900 sm:text-sm lg:text-base lg:leading-6">Off your entire order · applied automatically</p>
          <a href="#menu" className="mt-4 w-fit whitespace-nowrap rounded-full bg-choco-900 px-3 py-2.5 text-xs font-semibold text-white transition hover:bg-tangelo-700 sm:mt-6 sm:px-6 sm:py-3 sm:text-base lg:px-8 lg:py-4 lg:text-lg">Shop the menu <span aria-hidden="true">↗</span></a>
        </div>
      </div>
    </section>
  );
}

function ProductRow({ id, title, items }: { id: string; title: string; items: typeof PRODUCTS }) {
  const ref = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ start: true, end: false });

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setEdge({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
  }, []);

  useEffect(() => {
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [update, items.length]);

  const scroll = (dir: 1 | -1) => {
    const el = ref.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };

  return (
    <section id={`cat-${id}`} className="scroll-mt-36 border-b border-choco/10 py-10 last:border-0">
      <div className="mb-5 flex items-end justify-between">
        <h2 className="flex items-baseline gap-3 font-display text-3xl font-semibold tracking-[-0.02em]">
          {title}
          <span className="font-sans text-xs font-semibold uppercase tracking-[0.16em] text-muted">{items.length} items</span>
        </h2>
        {!(edge.start && edge.end) && (
          <div className="hidden items-center gap-1 rounded-full bg-white p-1 shadow-[0_2px_10px_rgba(59,29,15,0.08)] ring-1 ring-choco/5 sm:flex">
            <ArrowButton dir="left" disabled={edge.start} onClick={() => scroll(-1)} />
            <ArrowButton dir="right" disabled={edge.end} onClick={() => scroll(1)} />
          </div>
        )}
      </div>
      <div ref={ref} onScroll={update} className="no-scrollbar -mx-4 flex snap-x scroll-px-4 gap-4 overflow-x-auto px-4 pb-3 sm:-mx-1 sm:px-1">
        {items.map((p, i) => (
          <ProductCard key={p.id} product={p} index={i} />
        ))}
      </div>
    </section>
  );
}

function ArrowButton({ dir, disabled, onClick }: { dir: "left" | "right"; disabled: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={dir === "left" ? "Scroll left" : "Scroll right"}
      className="group grid h-10 w-10 place-items-center rounded-full text-choco transition enabled:hover:bg-choco-900 enabled:hover:text-white disabled:cursor-default disabled:text-choco/20"
    >
      <svg
        viewBox="0 0 24 24"
        className={`h-4 w-4 transition-transform ${dir === "left" ? "group-enabled:group-hover:-translate-x-0.5" : "group-enabled:group-hover:translate-x-0.5"}`}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={dir === "left" ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"} />
      </svg>
    </button>
  );
}

function Footer() {
  return (
    <footer className="relative overflow-hidden bg-choco-900 text-white">
      <div className="mx-auto flex max-w-[1920px] flex-col items-center gap-4 px-4 py-10 sm:flex-row sm:justify-between sm:px-6 lg:px-10">
        <div className="flex items-center gap-3">
          <Image src="/mascots/chef.webp" alt="" width={72} height={72} className="rounded-full bg-linen" />
          <div>
            <p className="font-display text-2xl font-semibold">BorntoDrink</p>
            <p className="text-sm text-white/80">Open daily · 08:00 – 20:00</p>
          </div>
        </div>
        <p className="text-sm text-white/80">Coffee · Tea · Bakery</p>
      </div>
    </footer>
  );
}

function FloatingCart() {
  const { count, setOpen } = useCart();
  if (count === 0) return null;
  return (
    <motion.button
      initial={{ y: 80 }}
      animate={{ y: 0 }}
      onClick={() => setOpen(true)}
      className="fixed bottom-4 left-1/2 z-30 -translate-x-1/2 rounded-full bg-choco-900 px-6 py-3 font-semibold text-white shadow-xl sm:hidden"
    >
      View bag · {count}
    </motion.button>
  );
}
