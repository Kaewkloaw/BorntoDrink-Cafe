"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useCart } from "@/components/CartProvider";
import { CupArt } from "@/components/CupArt";
import { Header } from "@/components/Header";
import { CartDrawer } from "@/components/CartDrawer";
import { PRODUCT_MAP, calculatePromotion, formatTHB } from "@/lib/products";
import { groupsFor, resolveOptions, selectedIn, summarize, toggleChoice, type OptionGroup } from "@/lib/options";

type Variant = { uid: string; options: string[]; qty: number };

export default function CheckoutPage() {
  const { lines, count, setQty } = useCart();
  const [name, setName] = useState("");
  // Options apply to the whole line by default. "Make some cups different" splits off a variant with its own count.
  // base = options of the main group; more = extra variants (each has its own options and cup count).
  const [base, setBase] = useState<Record<string, string[]>>({});
  const [more, setMore] = useState<Record<string, Variant[]>>({});
  const [openKey, setOpenKey] = useState<Record<string, boolean>>({});
  const [extra, setExtra] = useState("");
  const note = extra.trim();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const entries = Object.entries(lines).filter(([id]) => PRODUCT_MAP.has(id));

  // remember the name so repeat customers don't type it again
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate from storage once
      setName(localStorage.getItem("btd-name") ?? "");
    } catch {}
  }, []);

  const unitExtra = (productId: string, ids: string[]) => {
    const r = resolveOptions(productId, ids);
    return r.ok ? r.extra : 0;
  };

  /** The variants of a line: the main group first, then any split-off groups. Counts always add up to qty. */
  function variantsOf(id: string, qty: number): Variant[] {
    let left = qty;
    const extras: Variant[] = [];
    for (const v of more[id] ?? []) {
      const q = Math.min(v.qty, left - 1); // the main group always keeps at least one
      if (q > 0) {
        extras.push({ ...v, qty: q });
        left -= q;
      }
    }
    return [{ uid: "base", options: base[id] ?? [], qty: left }, ...extras];
  }

  function setOptions(id: string, uid: string, fn: (ids: string[]) => string[]) {
    if (uid === "base") setBase((b) => ({ ...b, [id]: fn(b[id] ?? []) }));
    else setMore((m) => ({ ...m, [id]: (m[id] ?? []).map((v) => (v.uid === uid ? { ...v, options: fn(v.options) } : v)) }));
  }

  function splitOff(id: string, qty: number) {
    const uid = crypto.randomUUID();
    setMore((m) => ({ ...m, [id]: [...variantsOf(id, qty).slice(1), { uid, options: [], qty: 1 }] }));
    setOpenKey((o) => ({ ...o, [`${id}#${uid}`]: true }));
  }

  function moveCup(id: string, qty: number, uid: string, delta: number) {
    const all = variantsOf(id, qty);
    const target = all.find((v) => v.uid === uid)!;
    if (target.qty + delta < 1 || all[0].qty - delta < 1) return;
    setMore((m) => ({ ...m, [id]: all.slice(1).map((v) => (v.uid === uid ? { ...v, qty: v.qty + delta } : v)) }));
  }

  function mergeBack(id: string, qty: number, uid: string) {
    setMore((m) => ({ ...m, [id]: variantsOf(id, qty).slice(1).filter((v) => v.uid !== uid) }));
  }

  /** one entry per variant, merging variants that ended up with the same options */
  function buildItems() {
    const out: { productId: string; qty: number; options: string[]; price: number }[] = [];
    for (const [productId, qty] of entries) {
      const price0 = PRODUCT_MAP.get(productId)!.price;
      const bySet = new Map<string, { options: string[]; qty: number }>();
      for (const v of variantsOf(productId, qty)) {
        const options = [...v.options].sort();
        const k = options.join("|");
        bySet.set(k, { options, qty: (bySet.get(k)?.qty ?? 0) + v.qty });
      }
      for (const { options, qty: q } of bySet.values()) out.push({ productId, qty: q, options, price: price0 + unitExtra(productId, options) });
    }
    return out;
  }

  const { subtotal, discount, total } = calculatePromotion(buildItems());

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      // the server works out prices itself; we only send what was chosen
      const items = buildItems().map(({ productId, qty, options }) => ({ productId, qty, ...(options.length ? { options } : {}) }));
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerName: name, note, items }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Couldn't place your order.");
      try {
        localStorage.setItem("btd-name", name.trim());
      } catch {}
      // don't empty the bag yet (the screen would flash "Your bag is empty" while the payment page loads):
      // the payment page clears it once it is open
      try {
        sessionStorage.setItem("btd-placed", json.id);
      } catch {}
      // a full page load (not a client-side transition): the payment page is rendered fresh per request,
      // and this way it can never hang on "One moment…" waiting for a reload
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign(`/pay/${json.id}`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <>
      <Header />
      <CartDrawer />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
        <Link href="/" className="inline-flex min-h-10 items-center text-sm text-muted hover:text-tangelo-700">← Back to menu</Link>
        <h1 className="mt-2 font-display text-4xl font-semibold">Review your order</h1>

        {count === 0 ? (
          <div className="mt-10 flex flex-col items-center text-center">
            <Image src="/mascots/cheer.webp" alt="" width={200} height={200} className="animate-bob" />
            <p className="font-display text-xl">Your bag is empty</p>
            <Link href="/" className="mt-4 rounded-full bg-tangelo-600 px-6 py-3 font-semibold text-white">Browse the menu</Link>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 grid gap-6 md:grid-cols-[1fr_320px]">
            <section className="space-y-3">
              {entries.map(([id, qty]) => {
                const p = PRODUCT_MAP.get(id)!;
                const groups = groupsFor(p);
                const variants = variantsOf(id, qty);
                const lineTotal = variants.reduce((sum, v) => sum + v.qty * (p.price + unitExtra(id, v.options)), 0);
                const unit = p.category === "bakery" ? "item" : "cup";
                return (
                  <div key={id} className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-choco/5">
                    <div className="flex items-center gap-4">
                      <div className="grid h-20 w-20 shrink-0 place-items-center rounded-xl bg-linen">
                        <CupArt product={p} className="h-16 w-16" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold">{p.name}</p>
                        <p className="text-sm text-muted">{p.desc} · {formatTHB(p.price)}</p>
                      </div>
                      <div className="flex items-center gap-1 rounded-full bg-linen p-1">
                        <button type="button" aria-label={`Remove one ${p.name}`} onClick={() => setQty(id, qty - 1)} className="h-10 w-10 rounded-full bg-white font-bold">−</button>
                        <span className="w-6 text-center text-sm font-semibold" aria-live="polite">{qty}</span>
                        <button type="button" aria-label={`Add one ${p.name}`} onClick={() => setQty(id, qty + 1)} className="h-10 w-10 rounded-full bg-choco-900 font-bold text-white">+</button>
                      </div>
                      <p className="hidden w-20 text-right font-semibold tabular-nums sm:block">{formatTHB(lineTotal)}</p>
                    </div>

                    {groups.length > 0 && (
                      <div className="mt-3 border-t border-choco/10">
                        <ul className="divide-y divide-choco/10">
                          {variants.map((v, i) => {
                            const key = `${id}#${v.uid}`;
                            const open = !!openKey[key];
                            const summary = summarize(id, v.options);
                            const split = variants.length > 1;
                            return (
                              <li key={v.uid} className="py-2">
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                  {i > 0 && (
                                    <div className="flex items-center gap-1 rounded-full bg-linen p-1">
                                      <button type="button" aria-label={`Fewer ${unit}s in this group`} onClick={() => moveCup(id, qty, v.uid, -1)} className="h-10 w-10 rounded-full bg-white font-bold">−</button>
                                      <span className="w-6 text-center text-sm font-semibold" aria-live="polite">{v.qty}</span>
                                      <button type="button" aria-label={`More ${unit}s in this group`} onClick={() => moveCup(id, qty, v.uid, 1)} className="h-10 w-10 rounded-full bg-choco-900 font-bold text-white">+</button>
                                    </div>
                                  )}
                                  <p className="min-w-0 flex-1 text-sm">
                                    {i === 0 && split && <span className="mr-2 font-medium">{v.qty} {unit}{v.qty > 1 ? "s" : ""}</span>}
                                    {!split && <span className="mr-2 font-medium">{qty > 1 ? `All ${qty} ${unit}s` : "Options"}</span>}
                                    <span className={summary ? "font-medium text-tangelo-700" : "text-muted"}>{summary || "Standard"}</span>
                                  </p>
                                  <button
                                    type="button"
                                    aria-expanded={open}
                                    aria-controls={`opts-${key}`}
                                    onClick={() => setOpenKey((o) => ({ ...o, [key]: !o[key] }))}
                                    className="min-h-10 rounded-full px-4 text-sm font-medium text-choco-900 ring-1 ring-choco/25 transition hover:bg-linen"
                                  >
                                    {open ? "Done" : "Customize"}
                                  </button>
                                  {i > 0 && (
                                    <button type="button" onClick={() => mergeBack(id, qty, v.uid)} className="min-h-10 px-1 text-sm text-muted underline-offset-2 hover:text-tangelo-700 hover:underline">
                                      Remove
                                    </button>
                                  )}
                                </div>
                                {open && (
                                  <div id={`opts-${key}`} className="mt-2 space-y-3 pb-2">
                                    {groups.map((g) => (
                                      <OptionRow key={g.id} group={g} ids={v.options} onPick={(choice) => setOptions(id, v.uid, (ids) => toggleChoice(g, ids, choice))} />
                                    ))}
                                  </div>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                        {variants[0].qty >= 2 && (
                          <button type="button" onClick={() => splitOff(id, qty)} className="mb-1 min-h-10 text-sm font-medium text-tangelo-700 underline-offset-2 hover:underline">
                            + Make some {unit}s different
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </section>

            <aside className="h-fit space-y-4 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-choco/5">
              <label className="block">
                <span className="text-sm font-medium">Your name <span className="font-normal text-muted">(optional)</span></span>
                <input
                  maxLength={60}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-choco/15 bg-linen-50 px-3 py-2 outline-none focus:border-tangelo"
                  placeholder="So we can call you"
                  autoComplete="given-name"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium">Note for the whole order <span className="font-normal text-muted">(optional)</span></span>
                <input
                  maxLength={120}
                  value={extra}
                  onChange={(e) => setExtra(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-choco/15 bg-linen-50 px-3 py-2 text-sm outline-none focus:border-tangelo"
                  placeholder="Anything else?"
                />
              </label>
              <div className="dash-line text-choco/25" />
              {discount > 0 ? <div className="space-y-1 text-sm"><div className="flex justify-between text-muted"><span>Subtotal</span><span>{formatTHB(subtotal)}</span></div><div className="flex justify-between font-medium text-sage"><span>Grand opening · 10% off</span><span>−{formatTHB(discount)}</span></div></div> : <p className="text-sm text-muted">Add a drink and a bakery item for 10% off your order.</p>}
              <div className="flex items-baseline justify-between">
                <span>Total</span>
                <span className="font-display text-3xl font-semibold text-tangelo-600">{formatTHB(total)}</span>
              </div>
              {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
              <button disabled={busy} className="w-full rounded-full bg-tangelo-600 py-3.5 font-semibold text-white transition hover:bg-tangelo-700 disabled:opacity-60">
                {busy ? "One moment…" : "Pay now"}
              </button>
            </aside>
          </form>
        )}
      </main>
    </>
  );
}

/** One option group as a row of chips: radio behaviour for "choose one", toggles for "choose any". */
function OptionRow({ group, ids, onPick }: { group: OptionGroup; ids: string[]; onPick: (choiceId: string) => void }) {
  const chosen = selectedIn(group, ids);
  const single = group.select === "one";
  return (
    <div role={single ? "radiogroup" : "group"} aria-label={group.label}>
      <p className="text-sm font-medium">
        {group.label}
        {!single && group.max ? <span className="ml-1 font-normal text-muted">(up to {group.max})</span> : null}
      </p>
      <div className="mt-1.5 flex flex-wrap gap-2">
        {group.choices.map((c) => {
          const on = chosen.includes(c.id);
          return (
            <button
              type="button"
              key={c.id}
              role={single ? "radio" : undefined}
              aria-checked={single ? on : undefined}
              aria-pressed={single ? undefined : on}
              onClick={() => onPick(c.id)}
              className={`min-h-10 rounded-full px-4 py-1.5 text-sm transition ${on ? "bg-choco-900 text-white" : "bg-linen text-choco-900 hover:bg-linen/70"}`}
            >
              {c.label}
              {c.price ? <span className="ml-1 opacity-80">+{formatTHB(c.price)}</span> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
