"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { PublicOrder, VerifyMode } from "@/lib/store";
import { formatTHB } from "@/lib/products";
import { useCart } from "./CartProvider";
import { ReceiptSuccess } from "./ReceiptSuccess";
import { Sparkle } from "./Shapes";

type Phase = "idle" | "verifying" | "queued" | "error" | "success";

/** Read the payment QR printed on a bank slip, entirely in the browser. */
async function decodeSlipQr(file: File): Promise<string | null> {
  try {
    const { default: jsQR } = await import("jsqr");
    const bmp = await createImageBitmap(file);
    // Try full size, then downscaled — jsQR is more reliable on ~1000px images.
    for (const scale of [1, Math.min(1, 1000 / Math.max(bmp.width, bmp.height)), 0.5]) {
      const w = Math.round(bmp.width * scale);
      const h = Math.round(bmp.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
      ctx.drawImage(bmp, 0, 0, w, h);
      const img = ctx.getImageData(0, 0, w, h);
      const r = jsQR(img.data, w, h, { inversionAttempts: "attemptBoth" });
      if (r?.data) return r.data;
    }
  } catch {}
  return null;
}

/**
 * Read a JSON reply. If the server sends something else (an HTML error page from a crashed or
 * restarting server, a tunnel/proxy error...), say so plainly instead of the browser's own
 * parse error (Safari: "The string did not match the expected pattern").
 */
async function readJson(res: Response) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    console.error(`Expected JSON from ${res.url} (HTTP ${res.status}), got:`, text.slice(0, 300));
    throw new Error(`We couldn't reach the shop's server (error ${res.status}). Please try again in a moment.`);
  }
}

export interface PayAccount {
  bank: string;
  number: string;
  name: string;
}

export function SlipPayment({
  initial,
  mode,
  qrImage: initialQr,
  qrAvailable,
  account: initialAccount,
  windowSeconds,
  initialWindow,
  totalLabel,
}: {
  initial: PublicOrder;
  mode: VerifyMode;
  /** PromptPay QR (only passed when it may already be shown) */
  qrImage: string | null;
  /** whether a PromptPay QR can be generated at all */
  qrAvailable: boolean;
  /** shown instead of a QR when no PromptPay ID is configured */
  account: PayAccount | null;
  /** 0 = no time limit */
  windowSeconds: number;
  /** a payment window that is already running (e.g. after a page reload) */
  initialWindow: { expiresAt: string; serverNow: number } | null;
  totalLabel: string;
}) {
  const [order, setOrder] = useState(initial);

  // the order was just placed from the checkout page: now that this page is open, empty the bag
  const { clear } = useCart();
  useEffect(() => {
    try {
      if (sessionStorage.getItem("btd-placed") === initial.id) {
        sessionStorage.removeItem("btd-placed");
        clear();
      }
    } catch {}
  }, [initial.id, clear]);

  const [phase, setPhase] = useState<Phase>(
    initial.status === "paid" ? "success" : initial.status === "verifying" ? "queued" : "idle",
  );
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [error, setError] = useState(initial.lastError ?? "");
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // ---- payment window: starts when the customer taps "Show QR" ----
  const timed = windowSeconds > 0;
  const [qrImage, setQrImage] = useState<string | null>(initialQr);
  const [account, setAccount] = useState<PayAccount | null>(initialAccount);
  const [starting, setStarting] = useState(false);
  const [endAt, setEndAt] = useState<number | null>(() =>
    initialWindow ? Date.now() + (Date.parse(initialWindow.expiresAt) - initialWindow.serverNow) : null,
  );
  // null = never started, 0 = ran out
  const [remaining, setRemaining] = useState<number | null>(
    initialWindow ? Math.max(0, Math.ceil((Date.parse(initialWindow.expiresAt) - initialWindow.serverNow) / 1000)) : null,
  );

  useEffect(() => {
    if (endAt === null) return;
    const t = setInterval(() => setRemaining(Math.max(0, Math.ceil((endAt - Date.now()) / 1000))), 250);
    return () => clearInterval(t);
  }, [endAt]);

  async function startWindow() {
    setStarting(true);
    setError("");
    try {
      const res = await fetch(`/api/orders/${order.id}/pay-window`, { method: "POST" });
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error ?? "Couldn't start the payment.");
      setQrImage(json.qr);
      setAccount(json.account);
      if (json.expiresAt) {
        const end = Date.now() + (Date.parse(json.expiresAt) - json.serverNow);
        setEndAt(end);
        setRemaining(Math.max(0, Math.ceil((end - Date.now()) / 1000)));
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setStarting(false);
    }
  }

  const pick = useCallback(async (f: File | undefined) => {
    if (!f) return;
    if (!/^image\/(png|jpe?g)$/.test(f.type)) return setError("Please upload a PNG or JPG.");
    if (f.size > 5 * 1024 * 1024) return setError("File is larger than 5 MB.");
    setError("");
    setFile(f);
    setPreview((old) => {
      if (old) URL.revokeObjectURL(old);
      return URL.createObjectURL(f);
    });
    setQr(await decodeSlipQr(f));
  }, []);

  async function submit() {
    if (!file) return;
    setPhase("verifying");
    setError("");
    const fd = new FormData();
    fd.append("slip", file);
    if (qr) fd.append("qrCode", qr);
    try {
      const res = await fetch(`/api/orders/${order.id}/slip`, { method: "POST", body: fd });
      const json = await readJson(res);
      if (!res.ok || !json.ok) throw new Error(json.error ?? "We couldn't check your slip.");
      setOrder(json.order);
      setPhase(json.queued ? "queued" : "success");
    } catch (e) {
      setError((e as Error).message);
      setPhase("error");
    }
  }

  // Queue API: poll until the result arrives.
  useEffect(() => {
    if (phase !== "queued") return;
    const started = Date.now();
    const t = setInterval(async () => {
      if (Date.now() - started > 90_000) {
        clearInterval(t);
        setError("This is taking longer than usual. Try again, or show your slip to our staff.");
        setPhase("error");
        return;
      }
      let o: PublicOrder;
      try {
        const res = await fetch(`/api/orders/${order.id}/status`, { cache: "no-store" });
        if (!res.ok) return;
        o = await readJson(res);
      } catch {
        return; // a hiccup while polling: just try again on the next tick
      }
      setOrder(o);
      if (o.status === "paid") setPhase("success");
      else if (o.status === "pending") {
        setError(o.lastError ?? "We couldn't check your slip.");
        setPhase("error");
      }
    }, 2500);
    return () => clearInterval(t);
  }, [phase, order.id]);

  if (phase === "success") return <ReceiptSuccess order={order} />;

  const active = !timed || (remaining !== null && remaining > 0);
  const ranOut = timed && remaining === 0;
  const hasQr = !!qrImage;
  const clock = remaining === null ? "" : `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`;

  return (
    <div className="mt-6 grid gap-6 md:grid-cols-2">
      {/* 1 — pay */}
      <section className="relative overflow-hidden rounded-3xl bg-choco p-6 text-linen">
        <Sparkle className="absolute -right-6 -top-6 h-28 w-28 opacity-20" color="#fde68a" />
        <p className="text-sm font-medium text-linen/70">1 · Pay</p>
        <p className="mt-1 font-display text-5xl font-semibold">{totalLabel}</p>

        {active ? (
          <>
            {timed && (
              <div className="mt-4" role="timer" aria-live="off">
                <div className="flex items-baseline justify-between text-sm">
                  <span className="text-linen/75">Time left to pay</span>
                  <span className={`font-semibold tabular-nums ${remaining! <= 10 ? "text-[#ffb089]" : ""}`}>{clock}</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/15">
                  <div
                    className={`h-full rounded-full transition-[width] duration-300 ease-linear ${remaining! <= 10 ? "bg-[#ff8a57]" : "bg-linen"}`}
                    style={{ width: `${Math.min(100, (remaining! / windowSeconds) * 100)}%` }}
                  />
                </div>
              </div>
            )}
            {hasQr ? (
              <div className="mx-auto mt-5 w-fit rounded-2xl bg-white p-3">
                <div className="mb-2 rounded-lg bg-[#1a3d6d] py-1 text-center text-xs font-bold tracking-wider text-white">PromptPay</div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrImage!} alt={`PromptPay QR for ${totalLabel}`} className="h-56 w-56" />
              </div>
            ) : account ? (
              <div className="mt-5 rounded-2xl bg-white/10 p-4 text-sm">
                <p className="text-linen/70">Transfer exactly {totalLabel} to</p>
                <p className="mt-1 font-semibold">{account.name}</p>
                <p className="font-mono text-lg tabular-nums">{account.number}</p>
                <p className="text-linen/70">{account.bank}</p>
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border-2 border-dashed border-linen/30 p-6 text-center text-sm text-linen/70">
                Transfer exactly {totalLabel} to our account, then send your slip.
              </div>
            )}
          </>
        ) : (
          <div className="mt-5 rounded-2xl bg-white/10 p-5 text-center">
            {ranOut ? (
              <>
                <p className="font-display text-xl font-semibold">Time&rsquo;s up</p>
                <p className="mt-1 text-sm text-linen/75">Already paid in time? Send your slip on the right. If not, start again.</p>
              </>
            ) : (
              <p className="text-sm text-linen/80">
                You&rsquo;ll have {windowSeconds % 60 === 0 ? `${windowSeconds / 60} minutes` : `${windowSeconds} seconds`} to pay once you {qrAvailable ? "show the QR" : "show the details"}.
              </p>
            )}
            <button
              onClick={startWindow}
              disabled={starting}
              className="mt-4 w-full rounded-full bg-tangelo-600 py-3 font-semibold text-white transition hover:bg-tangelo-700 disabled:opacity-60"
            >
              {starting ? "One moment…" : ranOut ? "Start again" : qrAvailable ? "Show QR" : "Show payment details"}
            </button>
          </div>
        )}

        <ul className="mt-5 space-y-1 text-sm text-linen/80">
          {order.items.map((i, idx) => (
            <li key={idx}>
              <div className="flex justify-between">
                <span>{i.qty}× {i.name}</span>
                <span>{formatTHB(i.price * i.qty)}</span>
              </div>
              {i.note && <p className="text-xs text-linen/75">{i.note}</p>}
            </li>
          ))}
        </ul>
        {(order.discount ?? 0) > 0 && <div className="mt-3 flex justify-between border-t border-linen/20 pt-3 text-sm"><span>Grand opening · 10% off</span><span>−{formatTHB(order.discount!)}</span></div>}
      </section>

      {/* Step 2 — attach slip */}
      <section className="flex flex-col rounded-3xl bg-white p-6 shadow-sm ring-1 ring-choco/5">
        <p className="text-sm font-medium text-muted">2 · Send your slip</p>

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            pick(e.dataTransfer.files[0]);
          }}
          disabled={phase === "verifying" || phase === "queued"}
          className={`relative mt-4 grid min-h-64 flex-1 place-items-center overflow-hidden rounded-2xl border-2 border-dashed transition ${
            drag ? "border-tangelo bg-linen" : "border-choco/20 bg-linen-50 hover:border-tangelo"
          }`}
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Slip preview" className="max-h-80 rounded-lg object-contain" />
          ) : (
            <div className="flex flex-col items-center gap-2 p-6 text-center">
              <Image src="/mascots/pour.webp" alt="" width={120} height={120} />
              <p className="font-semibold">Tap to upload your slip</p>
              <p className="text-xs text-muted">PNG or JPG, up to 5 MB</p>
            </div>
          )}

          <AnimatePresence>
            {(phase === "verifying" || phase === "queued") && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 grid place-items-center bg-linen-50/85 backdrop-blur-sm"
              >
                <motion.div
                  className="absolute inset-x-0 h-1 bg-tangelo-600 shadow-[0_0_20px_#d54c15]"
                  animate={{ top: ["8%", "92%", "8%"] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                />
                <div className="flex flex-col items-center">
                  <Image src="/mascots/latte.webp" alt="" width={110} height={110} className="animate-bob" />
                  <p className="mt-1 font-display text-lg font-semibold">
                    Checking your slip…
                  </p>
                  <p className="text-xs text-muted">
                    {phase === "queued" ? "Almost done" : "This takes a few seconds"}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg"
          className="hidden"
          onChange={(e) => pick(e.target.files?.[0])}
        />

        {file && (
          <p className={`mt-2 text-xs ${qr ? "text-sage" : "text-muted"}`}>
            {qr ? "✓ Slip ready" : mode === "queue" ? "We can't read this slip. Try a clearer screenshot." : "Slip ready"}
          </p>
        )}

        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4, x: 0 }}
              animate={{ opacity: 1, y: 0, x: [0, -6, 6, -4, 4, 0] }}
              exit={{ opacity: 0 }}
              className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700"
              role="alert"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        <button
          onClick={submit}
          disabled={!file || phase === "verifying" || phase === "queued" || (mode === "queue" && !qr)}
          className="mt-4 rounded-full bg-tangelo-600 py-3.5 font-semibold text-white transition hover:bg-tangelo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Send slip
        </button>
      </section>
    </div>
  );
}
