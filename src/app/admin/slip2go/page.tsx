  import { Suspense } from "react";
import { headers } from "next/headers";
import { connection } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getSettings, listOrders } from "@/lib/store";
import { getAccountInfo, SLIP_MESSAGES } from "@/lib/slip2go";
import { computeStats } from "@/lib/admin-stats";
import { AdminShell } from "@/components/AdminShell";
import { ModeToggle } from "@/components/AdminControls";
import { Loading, PLAN_NAMES, PageHeader, Panel, Row } from "@/components/AdminUI";

const BANKS: Record<string, string> = { "01002": "Bangkok Bank", "01004": "Kasikorn", "01006": "Krungthai", "01014": "SCB", "01025": "Krungsri", "02001": "PromptPay (phone)", "04000": "TrueMoney" };

export const metadata = { title: "Slips · BorntoDrink Admin", robots: { index: false } };

export default function Slip2GoPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Slip2Go />
    </Suspense>
  );
}

async function Slip2Go() {
  await connection();
  await requireAdmin();

  const [orders, account, settings, h] = await Promise.all([listOrders(), getAccountInfo(), getSettings(), headers()]);
  const st = computeStats(orders);
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "your-domain";
  const proto = h.get("x-forwarded-proto") ?? "https";
  const webhookUrl = `${proto}://${host}/api/slip2go/webhook?token=${process.env.SLIP2GO_WEBHOOK_TOKEN ?? "<SLIP2GO_WEBHOOK_TOKEN>"}`;
  const windowS = Number(process.env.SLIP_WINDOW_SECONDS ?? 0);
  const pct = account ? Math.min(100, (account.tokenRemaining / Math.max(account.tokenLimit, 1)) * 100) : 0;

  return (
    <AdminShell active="slip2go" badge={st.needsAttention || undefined}>
      <PageHeader title="Slips" sub="How payments are checked" aside={st.passRate == null ? undefined : `${st.passRate}% of ${st.attempts} checks passed`} />

      <section className="grid gap-6 lg:grid-cols-2">
        <Panel title="Slip service (Slip2Go)" aside={account ? `${PLAN_NAMES[account.package] ?? account.package} plan` : undefined}>
          {account ? (
            <>
              <p className="text-2xl font-semibold tabular-nums tracking-tight">
                {account.tokenRemaining}
                <span className="ml-1 text-sm font-normal text-muted">/ {account.tokenLimit} tokens</span>
              </p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-choco/10">
                <div className={`h-full rounded-full ${pct < 15 ? "bg-red-600" : "bg-choco-900"}`} style={{ width: `${pct}%` }} />
              </div>
              <dl className="mt-5 divide-y divide-choco/10 border-t border-choco/10 text-sm">
                <Row k="Slips left" v={`~${account.estimatedQuotaSlip}`} />
                <Row k="Cost per slip" v={`${account.tokenPerSlip} token`} />
                <Row k="Plan expires" v={new Date(account.packageExpiredDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} />
              </dl>
            </>
          ) : (
            <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">Could not load /api/account/info. Check SLIP2GO_SECRET_KEY.</p>
          )}
        </Panel>

        <Panel title="How slips are checked" aside={settings.mode === "rest" ? "REST API" : "Queue API"}>
          <ModeToggle mode={settings.mode} />
          <p className="mt-3 text-sm leading-relaxed text-muted">
            {settings.mode === "rest" ? (
              <>
                REST API: the slip is checked the moment it is sent and the customer sees the result in a few seconds. Best for one shop.
              </>
            ) : (
              <>
                Queue API: the slip is queued and Slip2Go sends the result back a little later. Better for busy hours. Needs a public web address.
              </>
            )}
          </p>
          <p className="mt-4 text-xs font-medium text-muted">Result address (add it in Slip2Go → API Connect → Queue API)</p>
          <code className="mt-1.5 block break-all rounded-md border border-choco/10 bg-choco/[0.03] p-2 text-xs text-muted">{webhookUrl}</code>
          {webhookUrl.startsWith("http://localhost") && (
            <p className="mt-2 text-xs text-[#7a5000]">This address only works on this computer. Open this page from your public website to copy the right one.</p>
          )}
        </Panel>
      </section>

      <Panel title="Payment checks" aside="Applied to every slip">
        <dl className="divide-y divide-choco/10 border-t border-choco/10 text-sm">
          <Row k="Amount" v="Must equal the order total" />
          <Row k="Reused slips" v="Blocked" />
          <Row
            k="Receiving account"
            v={process.env.RECEIVER_ACCOUNT_NUMBER ? `${BANKS[process.env.RECEIVER_ACCOUNT_TYPE ?? ""] ?? "Any bank"} · ${process.env.RECEIVER_ACCOUNT_NUMBER}` : "Not restricted"}
          />
          <Row k="Receiver name" v={process.env.RECEIVER_NAME_TH ? process.env.RECEIVER_NAME_TH : "Not checked"} />
          <Row k="Time limit" v={windowS > 0 ? `Transfer within ${windowS % 60 === 0 ? `${windowS / 60} min` : `${windowS}s`} of showing the QR` : "Not checked"} />
        </dl>
        <p className="mt-3 text-xs leading-relaxed text-muted">
          Slips hide part of the account number and shorten the name, so only the bank and the visible digits can be matched. Settings live in <code>.env.local</code>.
        </p>
      </Panel>

      <Panel title="Rejected slips" aside={`${st.failedAttempts} total`}>
        {st.fails.length === 0 ? (
          <p className="text-sm text-muted">No rejected slips.</p>
        ) : (
          <ul className="divide-y divide-choco/10 text-sm">
            {st.fails.map(([code, n]) => (
              <li key={code} className="flex items-baseline gap-3 py-2.5 first:pt-0 last:pb-0">
                <code className="w-16 shrink-0 text-xs text-muted">{code}</code>
                <span className="flex-1">{SLIP_MESSAGES[code] ?? "Unknown error"}</span>
                <span className="tabular-nums text-muted">{n}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </AdminShell>
  );
}
