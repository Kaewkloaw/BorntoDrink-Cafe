"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { PRODUCT_MAP, formatTHB } from "@/lib/products";
import { useCart } from "./CartProvider";
import { CupArt } from "./CupArt";

export function CartDrawer() {
  const { open, setOpen, lines, setQty, subtotal, discount, total, count } = useCart();
  const entries = Object.entries(lines).filter(([id]) => PRODUCT_MAP.has(id));

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-choco-900/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          />
          <motion.aside
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-linen-50 shadow-2xl"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 260 }}
            role="dialog"
            aria-label="Bag"
          >
            <div className="flex items-center justify-between border-b border-choco/10 px-5 py-4">
              <h2 className="font-display text-2xl font-semibold">Your bag</h2>
              <button onClick={() => setOpen(false)} className="grid h-9 w-9 place-items-center rounded-full hover:bg-linen" aria-label="Close">
                ✕
              </button>
            </div>

            {entries.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
                <Image src="/mascots/cheer.webp" alt="" width={180} height={180} className="animate-bob" />
                <p className="font-display text-xl">Your bag is empty</p>
                <p className="text-sm text-muted">Add something from the menu to get started.</p>
              </div>
            ) : (
              <ul className="flex-1 space-y-3 overflow-y-auto p-5">
                {entries.map(([id, qty]) => {
                  const p = PRODUCT_MAP.get(id)!;
                  return (
                    <li key={id} className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm">
                      <div className="grid h-16 w-16 shrink-0 place-items-center rounded-xl bg-linen">
                        <CupArt product={p} className="h-14 w-14" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{p.name}</p>
                        <p className="truncate text-xs text-muted">{p.desc}</p>
                        <p className="text-sm font-semibold text-tangelo-600">{formatTHB(p.price * qty)}</p>
                      </div>
                      <div className="flex items-center gap-1 rounded-full bg-linen p-1">
                        <button onClick={() => setQty(id, qty - 1)} className="grid h-10 w-10 place-items-center rounded-full bg-white font-bold" aria-label="Decrease">
                          −
                        </button>
                        <span className="w-6 text-center text-sm font-semibold">{qty}</span>
                        <button onClick={() => setQty(id, qty + 1)} className="grid h-10 w-10 place-items-center rounded-full bg-choco-900 font-bold text-white" aria-label="Increase">
                          +
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="border-t border-choco/10 p-5">
              {discount > 0 ? <div className="mb-3 space-y-1 text-sm"><div className="flex justify-between text-muted"><span>Subtotal</span><span>{formatTHB(subtotal)}</span></div><div className="flex justify-between font-medium text-sage"><span>Grand opening · 10% off</span><span>−{formatTHB(discount)}</span></div></div> : count > 0 ? <p className="mb-3 text-sm text-muted">Add a drink and a bakery item to get 10% off your order.</p> : null}
              <div className="mb-4 flex items-baseline justify-between">
                <span className="text-muted">{count} {count === 1 ? "item" : "items"}</span>
                <span className="font-display text-3xl font-semibold">{formatTHB(total)}</span>
              </div>
              <Link
                href="/checkout"
                onClick={() => setOpen(false)}
                aria-disabled={count === 0}
                className={`block rounded-full py-3.5 text-center font-semibold text-white transition ${
                  count === 0 ? "pointer-events-none bg-choco/30" : "bg-tangelo-600 hover:bg-tangelo-700"
                }`}
              >
                Checkout
              </Link>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
