"use client";

import { motion } from "motion/react";
import Image from "next/image";
import { useState } from "react";
import { formatTHB, type Product } from "@/lib/products";
import { useCart } from "./CartProvider";

const BADGE: Record<string, string> = {
  New: "New",
  Popular: "Best seller",
  Season: "Seasonal",
};

export function ProductCard({ product, index }: { product: Product; index: number }) {
  const { add, favorites, toggleFav } = useCart();
  const [pop, setPop] = useState(0);
  const fav = favorites.has(product.id);

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ delay: (index % 5) * 0.05 }}
      className="group w-[calc(50%-0.5rem)] shrink-0 snap-start rounded-2xl border border-choco/10 bg-white p-2.5 shadow-[0_8px_24px_rgba(59,29,15,0.045)] sm:w-60"
    >
      <div className="relative grid aspect-square place-items-center overflow-hidden rounded-xl bg-[#f4ede4]">
        {product.badge && (
          <span className="absolute left-2.5 top-2.5 z-10 rounded-full border border-choco/10 bg-white/90 px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-muted">
            {BADGE[product.badge]}
          </span>
        )}
        <button
          onClick={() => toggleFav(product.id)}
          className="absolute right-2 top-2 z-10 grid h-10 w-10 place-items-center rounded-full transition hover:bg-white/70"
          aria-label={fav ? "Remove favorite" : "Add favorite"}
          aria-pressed={fav}
        >
          <svg viewBox="0 0 24 24" className={`h-6 w-6 ${fav ? "fill-tangelo text-tangelo-600" : "fill-none text-choco-900"}`} stroke="currentColor" strokeWidth="1.8">
            <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" />
          </svg>
        </button>
        <Image src={product.id === "cb-classic" ? "/products/house-cold-brew-concept.png" : `/products/${product.id}.jpg`} alt="" fill sizes="(max-width: 640px) 50vw, 224px" className="object-cover" />
      </div>
      <div className="px-2 pb-2 pt-3">
        <h3 className="line-clamp-2 min-h-12 text-base font-semibold leading-6">{product.name}</h3>
        <p className="truncate text-sm text-muted">{product.desc}</p>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-lg font-semibold">{formatTHB(product.price)}</span>
          <motion.button
            key={pop}
            onClick={() => {
              add(product.id);
              setPop((n) => n + 1);
            }}
            animate={pop ? { scale: [1, 0.8, 1.15, 1] } : undefined}
            className="grid h-10 w-10 place-items-center rounded-full bg-choco-900 text-xl text-white transition-colors hover:bg-tangelo-700"
            aria-label={`Add ${product.name} to cart`}
          >
            +
          </motion.button>
        </div>
      </div>
    </motion.article>
  );
}
