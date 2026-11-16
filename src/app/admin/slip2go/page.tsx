  import { Suspense } from "react";
import { headers } from "next/headers";
import { connection } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getSettings, listOrders } from "@/lib/store";
import { BANKS, getPaymentConfig } from "@/lib/payment-config";
import { getAccountInfo } from "@/lib/slip2go";
import { computeStats } from "@/lib/admin-stats";
import { WebhookLink } from "@/components/WebhookLink";
import { SlipStats } from "@/components/SlipStats";
import { PaymentChecks } from "@/components/PaymentChecks";
import { AdminShell } from "@/components/AdminShell";
import { ModeToggle } from "@/components/AdminControls";
import { Loading, PLAN_NAMES, PageHeader, Panel, Row } from "@/components/AdminUI";

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

  const [orders, account, settings, h, pay] = await Promise.all([listOrders(), getAccountInfo(), getSettings(), headers(), getPaymentConfig()]);
  const now = new Date();
  const st = computeStats(orders);
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "your-domain";
  const proto = h.get("x-forwarded-proto") ?? "https";
  const webhookUrl = `${proto}://${host}/api/slip2go/webhook?token=${pay.webhookToken || "<webhook token>"}`;
  const pct = account ? Math.min(100, (account.tokenRemaining / Math.max(account.tokenLimit, 1)) * 100) : 0;

  return (
    <AdminShell active="slip2go" badge={st.needsAttention || undefined}>
      <PageHeader title="Slips" sub="How payments are checked" aside={st.passRate == null ? undefined : `${st.passRate}% of ${st.attempts} checks passed`} />

      <Panel title="Payment checks" aside="Applied to every slip">
        <PaymentChecks initial={pay} banks={BANKS} />
        <p className="mt-3 text-xs leading-relaxed text-muted">
          Slips hide part of the account number and shorten the name, so only the bank and the visible digits can be matched.
        </p>
      </Panel>

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
            <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">Could not load /api/account/info. Check the secret key below.</p>
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
          <WebhookLink key={pay.webhookToken} origin={`${proto}://${host}`} token={pay.webhookToken} />
          {webhookUrl.startsWith("http://localhost") && (
            <p className="mt-2 text-xs text-[#7a5000]">This address only works on this computer. Open this page from your public website to copy the right one.</p>
          )}
        </Panel>
      </section>

      <Panel title="Slip activity" aside="Slips checked for orders in this shop">
        <SlipStats now={now.getTime()} points={orders.flatMap((o) => o.slipAttempts.map((a) => ({ code: a.code, amount: a.amount, at: a.checkedAt })))} />
      </Panel>
    </AdminShell>
  );
}
