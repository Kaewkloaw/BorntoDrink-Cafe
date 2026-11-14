import { PRODUCT_MAP } from "./products";
import { displayStatus, isOkCode, type Order } from "./store";

/** Every number the admin pages show, computed in one place so the pages can't disagree. */
export function computeStats(orders: Order[], now = new Date()) {
  const dayKey = (d: Date) => d.toDateString();
  const paidDate = (o: Order) => new Date(o.paidAt ?? o.createdAt);

  const paid = orders.filter((o) => o.status === "paid");
  const attempts = orders.flatMap((o) => o.slipAttempts);
  const okAttempts = attempts.filter((a) => isOkCode(a.code)).length;
  const revenue = paid.reduce((s, o) => s + o.total, 0);
  const paidToday = paid.filter((o) => dayKey(paidDate(o)) === dayKey(now));

  const counts: Record<string, number> = { all: orders.length };
  for (const o of orders) {
    const d = displayStatus(o, now.getTime());
    counts[d] = (counts[d] ?? 0) + 1;
  }

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (6 - i));
    const list = paid.filter((o) => dayKey(paidDate(o)) === dayKey(d));
    return {
      label: d.toLocaleDateString("en-GB", { weekday: "short" }),
      date: d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
      sum: list.reduce((s, o) => s + o.total, 0),
      n: list.length,
    };
  });

  // count by product (not by the name stored in the order) so renamed menu items stay together
  const sold = new Map<string, number>();
  for (const o of paid) for (const i of o.items) {
    const name = PRODUCT_MAP.get(i.productId)?.name ?? i.name;
    sold.set(name, (sold.get(name) ?? 0) + i.qty);
  }

  const fails = new Map<string, number>();
  for (const a of attempts) if (!isOkCode(a.code)) fails.set(a.code, (fails.get(a.code) ?? 0) + 1);

  const pending = counts.pending ?? 0;
  const verifying = counts.verifying ?? 0;

  return {
    paid,
    counts,
    attempts: attempts.length,
    okAttempts,
    failedAttempts: attempts.length - okAttempts,
    passRate: attempts.length ? Math.round((okAttempts / attempts.length) * 100) : null,
    revenue,
    revenueToday: paidToday.reduce((s, o) => s + o.total, 0),
    paidToday: paidToday.length,
    avgTicket: paid.length ? revenue / paid.length : 0,
    pending,
    verifying,
    needsAttention: pending + verifying,
    days,
    maxDay: niceMax(Math.max(...days.map((d) => d.sum))),
    weekTotal: days.reduce((s, d) => s + d.sum, 0),
    top: [...sold.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5),
    fails: [...fails.entries()].sort((a, b) => b[1] - a[1]),
  };
}

function niceMax(v: number) {
  if (v <= 0) return 100;
  const p = 10 ** Math.floor(Math.log10(v));
  return Math.ceil(v / p) * p;
}
