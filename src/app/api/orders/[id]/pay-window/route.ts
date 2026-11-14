import { NextResponse } from "next/server";
import QRCode from "qrcode";
import generatePayload from "promptpay-qr";
import { payAccount } from "@/lib/pay-info";
import { getOrder, payWindowSeconds, startPayWindow } from "@/lib/store";

/**
 * The customer tapped "Show QR": start a payment window and hand back the PromptPay QR.
 * The QR is only generated here (not in the page HTML), and the server remembers when the
 * window started, so the transfer time on the slip can be checked against it.
 */
export async function POST(_req: Request, ctx: RouteContext<"/api/orders/[id]/pay-window">) {
  const { id } = await ctx.params;
  const order = await getOrder(id);
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  if (order.status !== "pending") return NextResponse.json({ error: "This order can't be paid anymore." }, { status: 409 });

  const windowS = payWindowSeconds();
  let expiresAt: string | null = null;
  if (windowS > 0) {
    const started = await startPayWindow(id);
    if (!started) return NextResponse.json({ error: "This order can't be paid anymore." }, { status: 409 });
    expiresAt = new Date(Date.parse(started) + windowS * 1000).toISOString();
  }

  const ppId = process.env.PROMPTPAY_ID?.trim();
  const qr = ppId
    ? await QRCode.toDataURL(generatePayload(ppId, { amount: order.total }), { margin: 1, width: 320, color: { dark: "#3b1d0f" } })
    : null;

  return NextResponse.json({ qr, account: payAccount(), expiresAt, serverNow: Date.now() }, { headers: { "Cache-Control": "no-store" } });
}
