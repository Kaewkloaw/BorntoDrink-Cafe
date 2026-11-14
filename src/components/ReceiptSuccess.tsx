"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import type { PublicOrder } from "@/lib/store";
import { formatTHB } from "@/lib/products";
import { Flower, PetalX, Sparkle, Starburst } from "./Shapes";

const PRINT = 2.6; // seconds the receipt takes to feed out of the slot

/** Receipt printing out of a slot — the payment-success moment. */
export function ReceiptSuccess({ order }: { order: PublicOrder }) {
  const reduce = useReducedMotion();
  const paidAt = order.paidAt ? new Date(order.paidAt) : new Date();
  const rows = order.items.length;

  const confetti = [
    { C: Sparkle, color: "#d54c15", x: -170, y: -40, r: 40 },
    { C: PetalX, color: "#8b1538", x: 170, y: -10, r: -30 },
    { C: Flower, color: "#3f6447", x: -150, y: 140, r: 90 },
    { C: Starburst, color: "#5468b8", x: 160, y: 170, r: 120 },
    { C: Sparkle, color: "#8db6c7", x: 120, y: -80, r: 10 },
    { C: Flower, color: "#ebb8e3", x: -120, y: 260, r: -60 },
  ];

  return (
    <div className="relative mx-auto mt-6 flex max-w-md flex-col items-center">
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 16 }}
        className="mb-4 flex items-center gap-2 rounded-full bg-sage px-4 py-1.5 text-sm font-semibold text-white"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="3">
          <path d="m5 12 5 5 9-10" />
        </svg>
        Payment confirmed
      </motion.div>

      {/* the printer slot */}
      <div className="relative z-20 h-7 w-[92%] rounded-xl bg-gradient-to-b from-[#f1f1f1] via-[#cfcfcf] to-[#a9a9a9] p-1.5 shadow-[0_6px_14px_rgba(0,0,0,0.18),inset_0_1px_0_#fff]">
        <div className="h-full rounded-md bg-gradient-to-b from-[#3c3c3c] to-[#7a7a7a] shadow-inner" />
      </div>

      {/* receipt feeding out from under the slot */}
      <div className="relative z-10 -mt-3 w-[84%] overflow-hidden pb-4">
        <motion.div
          initial={reduce ? false : { y: "-100%" }}
          animate={{ y: ["-100%", "-78%", "-80%", "-52%", "-54%", "-26%", "-27%", "0%"] }}
          transition={{ duration: reduce ? 0 : PRINT, ease: "easeOut", times: [0, 0.18, 0.24, 0.45, 0.5, 0.72, 0.77, 1] }}
          className="receipt-tear bg-white px-6 pb-10 pt-8 font-mono text-[0.8125rem] text-choco-900 shadow-[0_10px_30px_rgba(59,29,15,0.18)]"
          style={{ backgroundImage: "linear-gradient(to bottom, rgba(0,0,0,0.06), transparent 24px)" }}
        >
          <div className="dash-line text-choco/25" />
          <div className="my-3 flex items-center justify-center gap-2">
            <Image src="/mascots/cup.webp" alt="" width={36} height={36} />
            <p className="text-center font-display text-2xl font-semibold tracking-wide">RECEIPT</p>
          </div>
          <div className="dash-line text-choco/25" />

          <p className="mt-3 text-center text-xs text-muted">
            BorntoDrink Cafe · #{order.id}
            <br />
            {paidAt.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
          </p>

          <ul className="mt-4 space-y-1.5">
            {order.items.map((i, idx) => (
              <motion.li
                key={idx}
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 + (idx / Math.max(rows, 1)) * (PRINT - 0.8) }}
              >
                <div className="flex justify-between gap-3">
                  <span className="truncate">{i.qty}x {i.name}</span>
                  <span className="shrink-0">{formatTHB(i.price * i.qty)}</span>
                </div>
                {i.note && <p className="text-xs text-muted">{i.note}</p>}
              </motion.li>
            ))}
          </ul>
          {(order.discount ?? 0) > 0 && <div className="mt-3 flex justify-between gap-3 text-sage"><span>GRAND OPENING · 10% OFF</span><span>−{formatTHB(order.discount!)}</span></div>}

          <div className="dash-line mt-4 text-choco/25" />
          <div className="mt-3 flex justify-between font-bold">
            <span>TOTAL AMOUNT</span>
            <span>{formatTHB(order.total)}</span>
          </div>
          <div className="mt-2 space-y-0.5 text-xs text-muted">
            <div className="flex justify-between">
              <span>PAID VIA</span>
              <span>{order.via ? "PromptPay" : "Confirmed by staff"}</span>
            </div>
            {order.senderName && (
              <div className="flex justify-between gap-3">
                <span>FROM</span>
                <span className="truncate">{order.senderName}{order.senderBank ? ` · ${order.senderBank}` : ""}</span>
              </div>
            )}
            {order.transRef && (
              <div className="flex justify-between gap-3">
                <span>REF</span>
                <span className="truncate">{order.transRef}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>CUSTOMER</span>
              <span>{order.customerName}</span>
            </div>
          </div>
          <div className="dash-line mt-4 text-choco/25" />

          <motion.p
            initial={reduce ? false : { scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: PRINT, type: "spring", stiffness: 300, damping: 12 }}
            className="my-4 text-center font-display text-3xl font-semibold"
          >
            THANK YOU
          </motion.p>
          <div className="dash-line text-choco/25" />
          <div className="barcode mx-auto mt-4 h-10 w-4/5" />
        </motion.div>
      </div>

      {/* mascot pops up after printing */}
      <motion.div
        initial={reduce ? false : { y: 60, opacity: 0, rotate: -10 }}
        animate={{ y: 0, opacity: 1, rotate: 0 }}
        transition={{ delay: PRINT + 0.2, type: "spring", stiffness: 200, damping: 12 }}
        className="pointer-events-none absolute -bottom-6 -right-10 z-30 hidden sm:block"
      >
        <Image src="/mascots/pastry.webp" alt="" width={150} height={150} className="drop-shadow-lg" />
      </motion.div>

      {/* confetti shapes */}
      {!reduce &&
        confetti.map(({ C, color, x, y, r }, i) => (
          <motion.div
            key={i}
            className="pointer-events-none absolute left-1/2 top-24 z-30"
            initial={{ x: 0, y: 0, scale: 0, rotate: 0, opacity: 0 }}
            animate={{ x, y, scale: 1, rotate: r, opacity: [0, 1, 1, 0] }}
            transition={{ delay: PRINT + i * 0.05, duration: 1.6, ease: "backOut" }}
          >
            <C className="h-8 w-8" color={color} />
          </motion.div>
        ))}

      <motion.div
        initial={reduce ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: PRINT + 0.5 }}
        className="mt-6 flex flex-col items-center gap-3 text-center"
      >
        <p className="text-muted">We&rsquo;re preparing your order. Show this receipt at the counter.</p>
        <div className="flex gap-2">
          <button onClick={() => window.print()} className="rounded-full px-5 py-2.5 font-semibold ring-1 ring-choco/30 hover:bg-white">
            Print receipt
          </button>
          <Link href="/" className="rounded-full bg-tangelo-600 px-5 py-2.5 font-semibold text-white hover:bg-tangelo-700">
            Order more
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
