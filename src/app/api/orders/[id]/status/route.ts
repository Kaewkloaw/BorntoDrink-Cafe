import { NextResponse } from "next/server";
import { getOrder, publicOrder } from "@/lib/store";

/** Polled by the pay page while a Queue API verification is in flight. */
export async function GET(_req: Request, ctx: RouteContext<"/api/orders/[id]/status">) {
  const { id } = await ctx.params;
  const order = await getOrder(id);
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(publicOrder(order), { headers: { "Cache-Control": "no-store" } });
}
