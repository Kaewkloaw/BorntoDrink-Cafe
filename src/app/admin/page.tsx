import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { isAdmin } from "@/lib/auth";
import { displayStatus, listOrders } from "@/lib/store";
import { getAccountInfo, type Slip2GoAccount } from "@/lib/slip2go";
import { computeStats } from "@/lib/admin-stats";
import { formatTHB } from "@/lib/products";
import { AdminShell } from "@/components/AdminShell";
import { Loading, OrdersTable, PageHeader, Panel, Stat } from "@/components/AdminUI";

export const metadata = { title: "Admin · BorntoDrink", robots: { index: false } };

export default function AdminPage(props: PageProps<"/admin">) {
  return (
    <Suspense fallback={<Loading />}>
      <Dashboard {...props} />
    </Suspense>
  );
}

/** Only speak up when something needs doing: low tokens, plan about to expire, or Slip2Go unreachable. */
function slipAlert(account: Slip2GoAccount | null): string | null {
  if (!account) return "Can’t reach Slip2Go. New slips can’t be verified until this is fixed.";
  const left = account.tokenRemaining / Math.max(account.tokenLimit, 1);
  const days = Math.ceil((new Date(account.packageExpiredDate).getTime() - Date.now()) / 86_400_000);
  if (days <= 0) return "The Slip2Go plan has expired. Slips can’t be verified until it’s renewed.";
  if (account.tokenRemaining < 5 || left < 0.15) return `Only ${account.tokenRemaining} Slip2Go tokens left (about ${account.estimatedQuotaSlip} slips).`;
  if (days <= 3) return `The Slip2Go plan expires in ${days} ${days === 1 ? "day" : "days"}.`;
  return null;
}

async function Dashboard({ searchParams }: PageProps<"/admin">) {
  await connection(); // always render per request (auth + live data)
  const sp = await searchParams;
  if (!(await isAdmin())) return <Login error={!!sp.error} />;

  const [orders, account] = await Promise.all([listOrders(), getAccountInfo()]);
  const now = new Date();
  const st = computeStats(orders, now);
  const alert = slipAlert(account);
  const attention = orders.filter((o) => {
    const d = displayStatus(o, now.getTime());
    return d === "pending" || d === "verifying";
  });

  return (
    <AdminShell active="dashboard" badge={st.needsAttention || undefined}>
      <PageHeader
        title="Dashboard"
        sub={now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Bangkok" })}
      />

      {alert && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#e8c36a] bg-[#fdf3d6] px-4 py-3 text-sm text-[#6b4700]">
          <span>{alert}</span>
          <Link href="/admin/slip2go" className="font-medium underline underline-offset-2">
            Open Slips →
          </Link>
        </div>
      )}

      {/* KPI strip */}
      <section aria-label="Summary" className="grid grid-cols-2 divide-choco/10 overflow-hidden rounded-xl border border-choco/10 bg-white lg:grid-cols-4 lg:divide-x [&>*:nth-child(-n+2)]:border-b [&>*:nth-child(-n+2)]:border-choco/10 lg:[&>*:nth-child(-n+2)]:border-b-0 [&>*:nth-child(odd)]:border-r [&>*:nth-child(odd)]:border-choco/10 lg:[&>*:nth-child(odd)]:border-r-0">
        <Stat hero label="Revenue today" value={formatTHB(st.revenueToday)} sub={`${st.paidToday} paid ${st.paidToday === 1 ? "order" : "orders"}`} />
        <Stat label="Total revenue" value={formatTHB(st.revenue)} sub={`${st.paid.length} paid · avg ${formatTHB(Math.round(st.avgTicket))}`} />
        <Stat label="Awaiting payment" value={String(st.needsAttention)} sub={`${st.pending} unpaid · ${st.verifying} checking`} />
        <Stat label="Slips accepted" value={st.passRate == null ? "—" : `${st.passRate}%`} sub={`${st.okAttempts} of ${st.attempts} slips`} />
      </section>

      {/* needs attention */}
      <section>
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="text-base font-semibold">Needs attention</h2>
          <Link href="/admin/orders" className="text-sm text-muted hover:text-choco-900">
            All orders →
          </Link>
        </div>
        <OrdersTable orders={attention.slice(0, 3)} empty="All caught up. Nothing is waiting on you." />
      </section>

      {/* revenue + best sellers */}
      <section className="grid gap-6 lg:grid-cols-[1.7fr_1fr]">
        <Panel title="Revenue" aside={`${formatTHB(st.weekTotal)} in the last 7 days`}>
          <div className="flex gap-3">
            <div className="flex h-28 flex-col justify-between pb-6 text-right text-xs tabular-nums text-muted">
              {[st.maxDay, st.maxDay / 2, 0].map((v) => (
                <span key={v}>{v ? formatTHB(v) : "0"}</span>
              ))}
            </div>
            <div className="relative flex h-28 flex-1 items-end gap-3">
              <div className="pointer-events-none absolute inset-x-0 top-0 bottom-6 flex flex-col justify-between">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="border-t border-choco/10" />
                ))}
              </div>
              {st.days.map((d, i) => {
                const today = i === 6;
                return (
                  <div key={i} className="relative flex h-full flex-1 flex-col items-center justify-end gap-2" title={`${d.date}: ${formatTHB(d.sum)} · ${d.n} ${d.n === 1 ? "order" : "orders"}`}>
                    <div className="flex h-[calc(100%-1.5rem)] w-full items-end justify-center">
                      <div
                        className={`w-full max-w-9 rounded-t-md ${today ? "bg-tangelo-600" : d.sum ? "bg-choco/70" : "bg-choco/10"}`}
                        style={{ height: d.sum ? `${(d.sum / st.maxDay) * 100}%` : 3 }}
                      />
                    </div>
                    <span className={`text-xs ${today ? "font-medium text-choco-900" : "text-muted"}`}>{today ? "Today" : d.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </Panel>

        <Panel title="Best sellers">
          {st.top.length === 0 ? (
            <p className="text-sm text-muted">No sales yet.</p>
          ) : (
            <ol className="divide-y divide-choco/10 text-sm">
              {st.top.map(([name, qty], i) => (
                <li key={name} className="flex items-baseline gap-3 py-2.5 first:pt-0 last:pb-0">
                  <span className="w-4 text-xs tabular-nums text-muted">{i + 1}</span>
                  <span className="flex-1 truncate">{name}</span>
                  <span className="tabular-nums text-muted">{qty} sold</span>
                </li>
              ))}
            </ol>
          )}
        </Panel>
      </section>
    </AdminShell>
  );
}

function Login({ error }: { error: boolean }) {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f8f1e8] p-4">
      <form action="/api/admin/login" method="post" className="w-full max-w-sm rounded-xl border border-choco/10 bg-white p-8">
        <p className="font-display text-xl font-semibold">
          Bornto<span className="text-tangelo-600">Drink</span>
        </p>
        <h1 className="mt-6 text-lg font-semibold">Staff sign in</h1>
        <p className="mt-1 text-sm text-muted">Enter the admin password to continue.</p>
        <label className="mt-5 block text-sm font-medium" htmlFor="pw">
          Password
        </label>
        <input
          id="pw"
          type="password"
          name="password"
          required
          autoFocus
          className="mt-1.5 w-full rounded-lg border border-choco/20 bg-white px-3 py-2 text-sm outline-none transition focus:border-choco-900 focus:ring-2 focus:ring-choco-900/10"
        />
        {error && <p className="mt-2 text-sm text-red-700">Incorrect password.</p>}
        <button className="mt-5 w-full rounded-lg bg-choco-900 py-2.5 text-sm font-medium text-white transition hover:bg-black">Sign in</button>
        <Link href="/" className="mt-4 block text-center text-sm text-muted hover:text-choco-900">
          ← Back to store
        </Link>
      </form>
    </main>
  );
}
