"use client";

import { useRouter } from "next/navigation";
import { useEffect, useTransition } from "react";
import type { OrderStatus, VerifyMode } from "@/lib/store";

export function AdminControls({ id, status, late, refunded }: { id: string; status: OrderStatus; late?: boolean; refunded?: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const set = (s: OrderStatus, opts?: { refunded?: boolean; confirm?: string }) =>
    start(async () => {
      if (opts?.confirm && !confirm(opts.confirm)) return;
      await fetch(`/api/admin/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: s, refunded: opts?.refunded }),
      });
      router.refresh();
    });

  if (status === "paid" || refunded) return null;

  // The customer's money arrived, just after the time limit: staff either keep it (accept) or send it back.
  if (late) {
    return (
      <div className={`flex flex-wrap gap-1.5 ${pending ? "pointer-events-none opacity-50" : ""}`}>
        <button
          onClick={() => set("paid", { confirm: "Accept this late payment and mark the order as paid?" })}
          className="min-h-9 rounded-md border border-choco/25 bg-white px-3 text-sm font-medium transition hover:border-choco-900 hover:bg-choco-900 hover:text-white"
        >
          Accept payment
        </button>
        <button
          onClick={() => set("rejected", { refunded: true, confirm: "Only confirm after you have sent the money back to the customer. Mark as refunded?" })}
          className="min-h-9 rounded-md px-3 text-sm font-medium text-muted transition hover:bg-red-50 hover:text-red-700"
        >
          I refunded
        </button>
      </div>
    );
  }

  return (
    <div className={`flex gap-1.5 ${pending ? "pointer-events-none opacity-50" : ""}`}>
      <button
        onClick={() => set("paid", { confirm: "Mark this order as paid? Only do this after confirming the transfer yourself." })}
        className="rounded-md border border-choco/20 bg-white px-2.5 py-1 text-xs font-medium transition hover:border-choco-900 hover:bg-choco-900 hover:text-white"
        title="Mark as paid after checking the transfer yourself"
      >
        Mark paid
      </button>
      {status !== "rejected" && (
        <button
          onClick={() => set("rejected")}
          className="rounded-md px-2 py-1 text-xs font-medium text-muted transition hover:bg-red-50 hover:text-red-700"
        >
          Reject
        </button>
      )}
    </div>
  );
}

export function ModeToggle({ mode }: { mode: VerifyMode }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const set = (m: VerifyMode) =>
    start(async () => {
      await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: m }),
      });
      router.refresh();
    });

  return (
    <div
      role="radiogroup"
      aria-label="How slips are checked"
      className={`mt-3 grid grid-cols-2 gap-0.5 rounded-lg bg-choco/[0.06] p-0.5 text-sm font-medium ${pending ? "opacity-60" : ""}`}
    >
      {(["rest", "queue"] as const).map((m) => (
        <button
          key={m}
          role="radio"
          aria-checked={mode === m}
          onClick={() => set(m)}
          className={`rounded-md py-1.5 transition ${mode === m ? "bg-white text-choco-900 shadow-[0_0_0_1px_rgba(59,29,15,0.12)]" : "text-muted hover:text-choco-900"}`}
        >
          {m === "rest" ? "REST API" : "Queue API"}
        </button>
      ))}
    </div>
  );
}

/** Refresh the dashboard every 10s so queued slips show up as they resolve. */
export function AutoRefresh() {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => router.refresh(), 10000);
    return () => clearInterval(t);
  }, [router]);
  return null;
}
