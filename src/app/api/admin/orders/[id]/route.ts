import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { updateOrder, type OrderStatus } from "@/lib/store";

/** Admin override: manually mark an order paid / rejected / pending. */
export async function PATCH(req: Request, ctx: RouteContext<"/api/admin/orders/[id]">) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const { status, refunded } = (await req.json().catch(() => ({}))) as { status?: OrderStatus; refunded?: boolean };
  if (!status || !["pending", "paid", "rejected"].includes(status))
    return NextResponse.json({ error: "Bad status" }, { status: 400 });
  const o = await updateOrder(id, (o) => {
    o.status = status;
    o.paidAt = status === "paid" ? (o.paidAt ?? new Date().toISOString()) : undefined;
    o.queueId = undefined; // a staff decision wins over any queued Slip2Go result arriving later
    if (status === "paid") o.lastError = undefined;
    o.refunded = status === "rejected" && refunded === true ? true : undefined;
  });
  if (!o) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
