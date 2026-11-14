import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { displayStatus, listOrders } from "@/lib/store";
import { computeStats } from "@/lib/admin-stats";
import { AdminShell } from "@/components/AdminShell";
import { FILTERS, Loading, OrdersTable, PageHeader } from "@/components/AdminUI";

export const metadata = { title: "Orders · BorntoDrink Admin", robots: { index: false } };

export default function OrdersPage(props: PageProps<"/admin/orders">) {
  return (
    <Suspense fallback={<Loading />}>
      <Orders {...props} />
    </Suspense>
  );
}

async function Orders({ searchParams }: PageProps<"/admin/orders">) {
  await connection();
  await requireAdmin();
  const sp = await searchParams;
  const filter = FILTERS.find((f) => f.key === sp.status)?.key ?? "all";

  const orders = await listOrders();
  const st = computeStats(orders);
  const shown = filter === "all" ? orders : orders.filter((o) => displayStatus(o) === filter);

  return (
    <AdminShell active="orders" badge={st.needsAttention || undefined}>
      <PageHeader title="Orders" sub="Review payments and manage incoming orders" aside={`${orders.length} total`} />

      <section>
        <div className="no-scrollbar mb-4 flex gap-5 overflow-x-auto border-b border-choco/10 text-sm">
          {FILTERS.map((f) => (
            <Link
              key={f.key}
              href={f.key === "all" ? "/admin/orders" : `/admin/orders?status=${f.key}`}
              className={`-mb-px shrink-0 border-b-2 pb-2.5 transition ${filter === f.key ? "border-choco-900 font-medium text-choco-900" : "border-transparent text-muted hover:text-choco-900"}`}
            >
              {f.label} <span className="tabular-nums text-muted">{st.counts[f.key] ?? 0}</span>
            </Link>
          ))}
        </div>
        <OrdersTable orders={shown} empty={orders.length === 0 ? "No orders yet. New orders will appear here." : "No orders with this status."} />
      </section>
    </AdminShell>
  );
}
