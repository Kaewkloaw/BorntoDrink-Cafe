"use client";

import { useMemo, useState } from "react";
import { formatTHB } from "@/lib/products";

export interface SlipPoint {
  code: string;
  /** baht on the slip, when Slip2Go read one */
  amount?: number;
  /** ISO time the slip was checked */
  at: string;
}

const DAY = 86_400_000;
const BKK = 7 * 3_600_000; // the shop works in Bangkok time

/** start of the Bangkok calendar day that contains `t` */
const dayStart = (t: number) => Math.floor((t + BKK) / DAY) * DAY - BKK;
const fmt = (t: number) => new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Bangkok" });
const isoDay = (t: number) => new Date(t + BKK).toISOString().slice(0, 10);
const fromIso = (s: string) => Date.parse(`${s}T00:00:00+07:00`);

type Period = "today" | "week" | "month" | "custom";
const PERIODS: { key: Period; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "week", label: "This week" },
  { key: "month", label: "This month" },
  { key: "custom", label: "Pick dates" },
];

const OK = new Set(["200000", "200200"]);
const CATS = [
  { key: "all", label: "All slips", dot: "bg-choco-900", help: "Every slip a customer sent", test: () => true },
  { key: "ok", label: "Accepted", dot: "bg-sage", help: "Real, correct and matched the order", test: (c: string) => OK.has(c) },
  { key: "receiver", label: "Wrong receiver", dot: "bg-[#4a90c2]", help: "Paid to another account or name", test: (c: string) => c === "200401" },
  { key: "amount", label: "Wrong amount", dot: "bg-[#e0902c]", help: "Amount doesn't equal the order total", test: (c: string) => c === "200402" },
  { key: "late", label: "Outside time limit", dot: "bg-[#d4a017]", help: "Transferred after the payment time", test: (c: string) => c === "200403" },
  { key: "used", label: "Already used", dot: "bg-[#8a5cc2]", help: "The same slip was sent before", test: (c: string) => c === "200501" },
  { key: "invalid", label: "Not found / invalid", dot: "bg-[#c0392b]", help: "Slip not found, fake or unreadable", test: (c: string) => ["200404", "200500", "400001", "400002"].includes(c) },
  { key: "other", label: "Other problems", dot: "bg-choco/40", help: "Bank busy, service unavailable, too many tries", test: () => true },
] as const;

function categorise(code: string): (typeof CATS)[number]["key"] {
  for (const c of CATS) if (c.key !== "all" && c.key !== "other" && c.test(code)) return c.key;
  return "other";
}

export function SlipStats({ points, now }: { points: SlipPoint[]; now: number }) {
  const [period, setPeriod] = useState<Period>("today");
  const [from, setFrom] = useState(() => isoDay(now));
  const [to, setTo] = useState(() => isoDay(now));

  const [start, end] = useMemo(() => {
    const today = dayStart(now);
    if (period === "today") return [today, today + DAY];
    if (period === "week") {
      const dow = (new Date(today + BKK).getUTCDay() + 6) % 7; // Monday = 0
      return [today - dow * DAY, today + DAY];
    }
    if (period === "month") {
      const d = new Date(today + BKK);
      return [fromIso(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`), today + DAY];
    }
    const a = fromIso(from);
    const b = fromIso(to);
    return Number.isFinite(a) && Number.isFinite(b) ? [Math.min(a, b), Math.max(a, b) + DAY] : [today, today + DAY];
  }, [period, from, to, now]);

  const stats = useMemo(() => {
    const m = new Map<string, { n: number; sum: number }>(CATS.map((c) => [c.key, { n: 0, sum: 0 }]));
    for (const p of points) {
      const t = Date.parse(p.at);
      if (!(t >= start && t < end)) continue;
      for (const key of ["all", categorise(p.code)]) {
        const e = m.get(key)!;
        e.n += 1;
        e.sum += p.amount ?? 0;
      }
    }
    return m;
  }, [points, start, end]);

  const total = stats.get("all")!.n;
  const range = end - start <= DAY ? fmt(start) : `${fmt(start)} – ${fmt(end - DAY)}`;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted" aria-live="polite">
          {range} · <span className="font-medium text-choco-900">{total}</span> {total === 1 ? "slip" : "slips"}
        </p>
        <div role="tablist" aria-label="Period" className="flex gap-0.5 rounded-lg bg-choco/[0.06] p-0.5 text-sm font-medium">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              role="tab"
              aria-selected={period === p.key}
              onClick={() => setPeriod(p.key)}
              className={`rounded-md px-3 py-1.5 transition ${period === p.key ? "bg-white text-choco-900 shadow-[0_0_0_1px_rgba(59,29,15,0.12)]" : "text-muted hover:text-choco-900"}`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {period === "custom" && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <input type="date" aria-label="From" max={isoDay(now)} value={from} onChange={(e) => e.target.value && setFrom(e.target.value)} className="h-9 rounded-lg border border-choco/15 bg-white px-3 outline-none focus:border-choco-900" />
          <span className="text-muted">to</span>
          <input type="date" aria-label="To" max={isoDay(now)} value={to} onChange={(e) => e.target.value && setTo(e.target.value)} className="h-9 rounded-lg border border-choco/15 bg-white px-3 outline-none focus:border-choco-900" />
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {CATS.map((c) => {
          const e = stats.get(c.key)!;
          const dim = e.n === 0 && c.key !== "all";
          return (
            <div key={c.key} title={c.help} className={`rounded-xl border border-choco/10 p-3.5 ${c.key === "ok" ? "bg-[#f1f6ee]" : "bg-white"} ${dim ? "opacity-60" : ""}`}>
              <p className="flex items-center gap-2 text-sm font-medium">
                <span className={`h-2 w-2 shrink-0 rounded-full ${c.dot}`} aria-hidden="true" />
                {c.label}
              </p>
              <p className="mt-2 text-2xl font-semibold tabular-nums leading-none">
                {e.n} <span className="text-sm font-normal text-muted">{e.n === 1 ? "slip" : "slips"}</span>
              </p>
              <p className="mt-1.5 text-xs tabular-nums text-muted">{e.sum > 0 ? formatTHB(e.sum) : "—"}</p>
            </div>
          );
        })}
      </div>
      {total === 0 && <p className="mt-3 text-sm text-muted">No slips in this period yet.</p>}
    </div>
  );
}
