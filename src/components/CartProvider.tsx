"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { PRODUCT_MAP, calculatePromotion } from "@/lib/products";

type Lines = Record<string, number>;

interface CartCtx {
  lines: Lines;
  count: number;
  total: number;
  subtotal: number;
  discount: number;
  open: boolean;
  setOpen: (v: boolean) => void;
  add: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  clear: () => void;
  favorites: Set<string>;
  toggleFav: (id: string) => void;
}

const Ctx = createContext<CartCtx | null>(null);
const KEY = "btd-cart-v1";
const FAV = "btd-fav-v1";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<Lines>({});
  const [favs, setFavs] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate from storage once
      if (raw) setLines(JSON.parse(raw));
      const f = localStorage.getItem(FAV);
      if (f) setFavs(JSON.parse(f));
    } catch {}
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(lines));
      localStorage.setItem(FAV, JSON.stringify(favs));
    } catch {}
  }, [lines, favs, loaded]);

  const add = useCallback((id: string) => setLines((l) => ({ ...l, [id]: Math.min((l[id] ?? 0) + 1, 50) })), []);
  const setQty = useCallback(
    (id: string, qty: number) =>
      setLines((l) => {
        const n = { ...l };
        if (qty <= 0) delete n[id];
        else n[id] = Math.min(qty, 50);
        return n;
      }),
    [],
  );
  const clear = useCallback(() => setLines({}), []);
  const toggleFav = useCallback(
    (id: string) => setFavs((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id])),
    [],
  );

  const value = useMemo<CartCtx>(() => {
    let count = 0;
    for (const [id, q] of Object.entries(lines)) {
      const p = PRODUCT_MAP.get(id);
      if (!p) continue;
      count += q;
    }
    const { subtotal, discount, total } = calculatePromotion(Object.entries(lines).map(([productId, qty]) => ({ productId, qty })));
    return { lines, count, subtotal, discount, total, open, setOpen, add, setQty, clear, favorites: new Set(favs), toggleFav };
  }, [lines, open, add, setQty, clear, favs, toggleFav]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart outside CartProvider");
  return c;
}
