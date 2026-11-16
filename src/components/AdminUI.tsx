import Image from "next/image";
import { displayStatus, isOkCode, type DisplayStatus, type Order } from "@/lib/store";
import { SLIP_MESSAGES } from "@/lib/slip2go";
import { formatTHB } from "@/lib/products";
import { AdminControls } from "./AdminControls";

export const PLAN_NAMES: Record<string, string> = { ทดลอง: "Trial" };

export const FILTERS: { key: "all" | DisplayStatus; label: string }[] = [
  { key: "all", label: "All" },
  { key: "paid", label: "Paid" },
  { key: "pending", label: "Unpaid" },
  { key: "verifying", label: "Checking" },
  { key: "rejected", label: "Rejected" },
  { key: "expired", label: "Expired" },
];

export function Loading() {
  return <main className="grid min-h-screen place-items-center bg-[#f8f1e8] text-sm text-muted">Loading…</main>;
}

export function PageHeader({ title, sub, aside }: { title: string; sub?: string; aside?: React.ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="text-xs text-muted">{sub}</p>
        <h1 className="font-display text-2xl font-semibold tracking-tight">{title}</h1>
      </div>
      {aside && <div className="text-sm text-muted">{aside}</div>}
    </header>
  );
}

export function Panel({ title, aside, id, children }: { title: string; aside?: string; id?: string; children: React.ReactNode }) {
  return (
    <div id={id} className="scroll-mt-20 rounded-xl border border-choco/10 bg-white p-4 sm:p-5">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-base font-semibold">{title}</h2>
        {aside && <span className="text-sm text-muted">{aside}</span>}
      </div>
      {children}
    </div>
  );
}

export function Stat({ label, value, sub, hero }: { label: string; value: string; sub: string; hero?: boolean }) {
  return (
    <div className={`px-5 py-4 ${hero ? "bg-[#fcebdf]" : ""}`}>
      <p className={`text-sm ${hero ? "font-medium text-tangelo-600" : "text-muted"}`}>{label}</p>
      <p className={`mt-1 font-semibold tabular-nums tracking-tight ${hero ? "text-2xl text-tangelo-600" : "text-xl"}`}>{value}</p>
      <p className="mt-1 text-xs text-muted">{sub}</p>
    </div>
  );
}

export function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-2 py-2.5">
      <dt className="text-muted">{k}</dt>
      <dd className="font-medium tabular-nums">{v}</dd>
    </div>
  );
}

/* ---------------- orders table ---------------- */

// One grid template shared by the header row and every order row so columns line up.
const ORDER_GRID = "md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)_minmax(0,1.25fr)_5rem_14rem]";

const LABEL: Record<DisplayStatus, string> = { paid: "Paid", pending: "Unpaid", verifying: "Checking", rejected: "Rejected", expired: "Expired" };

const STATUS: Record<DisplayStatus, { text: string; bg: string; dot: string }> = {
  expired: { text: "text-muted", bg: "bg-choco/[0.06]", dot: "bg-choco/30" },
  paid: { text: "text-sage", bg: "bg-[#e5eee1]", dot: "bg-sage" },
  pending: { text: "text-[#7a5000]", bg: "bg-[#fdf0c8]", dot: "bg-[#d99a00]" },
  verifying: { text: "text-slate", bg: "bg-botticelli-100", dot: "bg-slate animate-pulse" },
  rejected: { text: "text-red-700", bg: "bg-red-50", dot: "bg-red-600" },
};

const AVATAR = ["bg-[#f0dcec] text-berry", "bg-[#fbeab0] text-[#7a5000]", "bg-botticelli-100 text-slate", "bg-[#e6e9bd] text-sage", "bg-[#fcebdf] text-tangelo-600"];

const VIA: Record<string, string> = { "rest-image": "REST · image", "rest-qr": "REST · QR", queue: "Queue" };

export function OrdersTable({ orders, empty }: { orders: Order[]; empty: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-choco/10 bg-white">
      <div className={`hidden gap-4 border-b border-choco/10 bg-[#faf4ec] px-5 py-2.5 text-xs font-medium text-muted md:grid ${ORDER_GRID}`}>
        <span>Customer</span>
        <span>Items</span>
        <span>Slip</span>
        <span className="text-right">Total</span>
        <span>Status</span>
      </div>
      {orders.length === 0 ? (
        <div className="flex flex-col items-center px-5 py-10 text-center text-sm text-muted">
          <Image src="/mascots/cup.webp" alt="" width={96} height={96} />
          <p className="mt-2">{empty}</p>
        </div>
      ) : (
        <ul className="divide-y divide-choco/10">
          {orders.slice(0, 100).map((o) => (
            <OrderRow key={o.id} o={o} />
          ))}
        </ul>
      )}
    </div>
  );
}

function OrderRow({ o }: { o: Order }) {
  const okSlip = [...o.slipAttempts].reverse().find((s) => isOkCode(s.code));
  const slip = okSlip ?? o.slipAttempts.at(-1);
  const ds = displayStatus(o);
  const lateSlip = [...o.slipAttempts].reverse().find((a) => a.late);
  const st = STATUS[ds];
  const avatar = AVATAR[[...o.customerName].reduce((n, ch) => n + ch.charCodeAt(0), 0) % AVATAR.length];

  return (
    <li className={`grid gap-x-4 gap-y-3 px-5 py-3 transition hover:bg-choco/[0.02] md:items-center ${ORDER_GRID}`}>
      {/* customer */}
      <div className="flex min-w-0 gap-3">
        <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-semibold ${avatar}`}>
          {o.customerName.trim().slice(0, 1).toUpperCase() || "?"}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium" title={`Order ${o.id}`}>
            {o.customerName}
          </p>
          <p className="mt-0.5 text-xs text-muted">
            {new Date(o.createdAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" })}
          </p>
        </div>
      </div>

      {/* items */}
      <div className="min-w-0 text-sm text-choco/80">
        <ul className="space-y-0.5">
          {o.items.map((i, idx) => (
            <li key={idx}>
              {i.qty > 1 ? `${i.qty}× ${i.name}` : i.name}
              {i.note && <span className="block text-xs font-medium text-tangelo-600">{i.note}</span>}
            </li>
          ))}
        </ul>
        {o.note && <p className="mt-1.5 text-xs text-muted">Note: {o.note}</p>}
      </div>

      {/* slip: what to show depends on the order's status first */}
      <div className="min-w-0 text-xs">
        {o.refunded ? (
          <p className="text-choco/80">Money refunded to the customer</p>
        ) : lateSlip && o.status !== "paid" ? (
          <>
            <p className="font-medium text-[#7a5000]">Late transfer{lateSlip.amount != null ? ` · ${formatTHB(lateSlip.amount)}` : ""} received</p>
            <p className="mt-0.5 text-muted">Accept it, or refund the customer.</p>
          </>
        ) : o.status === "paid" && !okSlip ? (
          <p className="text-muted">Marked paid by staff</p>
        ) : o.status === "verifying" ? (
          <p className="text-slate">Checking slip…</p>
        ) : slip ? (
          <p
            className={`font-medium ${isOkCode(slip.code) ? "text-sage" : "text-red-700"}`}
            title={[
              `${slip.code} · ${VIA[slip.via] ?? slip.via}`,
              slip.senderName && `From: ${slip.senderName}${slip.senderBank ? ` (${slip.senderBank})` : ""}`,
              slip.transRef && `Ref: ${slip.transRef}`,
            ]
              .filter(Boolean)
              .join("\n")}
          >
            {isOkCode(slip.code) ? "Verified" : SLIP_MESSAGES[slip.code] ?? slip.message}
          </p>
        ) : (
          <p className="text-muted">No slip yet</p>
        )}
      </div>

      {/* total */}
      <div className="md:text-right"><p className="text-sm font-semibold tabular-nums">{formatTHB(o.total)}</p>{(o.discount ?? 0) > 0 && <p className="text-xs text-sage">Grand opening −{formatTHB(o.discount!)}</p>}</div>

      {/* status + actions */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 md:flex-nowrap md:gap-2">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${st.text} ${st.bg}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
          {o.refunded ? "Refunded" : LABEL[ds]}
        </span>
        <AdminControls id={o.id} status={o.status} late={!!lateSlip} refunded={o.refunded} />
      </div>
    </li>
  );
}
