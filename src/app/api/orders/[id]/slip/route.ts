import { NextResponse } from "next/server";
import { getOrder, getSettings, publicOrder, updateOrder } from "@/lib/store";
import { queueSlipQr, SLIP_MESSAGES, verifySlipImage, verifySlipQr, type Slip2GoResponse } from "@/lib/slip2go";
import { getPaymentConfig } from "@/lib/payment-config";
import { applySlipResult } from "@/lib/verify";

const MAX_BYTES = 5 * 1024 * 1024;
const TYPES: Record<string, string> = { "image/png": "slip.png", "image/jpeg": "slip.jpg", "image/jpg": "slip.jpg" };

export async function POST(req: Request, ctx: RouteContext<"/api/orders/[id]/slip">) {
  const { id } = await ctx.params;
  const order = await getOrder(id);
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  if (order.status === "paid") return NextResponse.json({ ok: true, order: publicOrder(order) });
  const STALE_MS = 90_000; // a queue result that hasn't arrived after 90s: let the customer retry
  const stale = order.status === "verifying" && Date.now() - new Date(order.queuedAt ?? 0).getTime() > STALE_MS;
  if (order.status === "verifying" && !stale)
    return NextResponse.json({ ok: true, queued: true, order: publicOrder(order) });

  const form = await req.formData().catch(() => null);
  const file = form?.get("slip");
  const qrCode = String(form?.get("qrCode") ?? "").trim().slice(0, 500);
  const hasFile = file instanceof Blob && file.size > 0;

  if (hasFile) {
    if (file.size > MAX_BYTES) return NextResponse.json({ error: "File is larger than 5 MB." }, { status: 400 });
    if (!TYPES[file.type]) return NextResponse.json({ error: "Please upload a PNG or JPG." }, { status: 400 });
  }
  if (!hasFile && !qrCode) return NextResponse.json({ error: "Please attach your transfer slip." }, { status: 400 });

  const { mode } = await getSettings();
  const pay = await getPaymentConfig();
  const cond = {
    amount: order.total,
    receiverAccount: pay.accountNumber || undefined,
    receiverType: pay.bankCode || undefined,
  };

  try {
    // ---------- Queue API ----------
    if (mode === "queue") {
      if (!qrCode)
        return NextResponse.json({ error: "We couldn't read this slip. Please try a clearer one." }, { status: 400 });
      const r = await queueSlipQr(qrCode, cond);
      if (r.code !== "200202" || !r.data?.queueId) {
        const reason = SLIP_MESSAGES[r.code] ?? r.message;
        await updateOrder(id, (o) => void (o.lastError = reason));
        return NextResponse.json({ ok: false, code: r.code, error: reason }, { status: 422 });
      }
      const queued = await updateOrder(id, (o) => {
        o.status = "verifying";
        o.queueId = r.data!.queueId;
        o.queuedAt = new Date().toISOString();
        o.lastError = undefined;
      });
      return NextResponse.json({ ok: true, queued: true, order: publicOrder(queued!) });
    }

    // ---------- REST API ----------
    let r: Slip2GoResponse;
    let via: "rest-image" | "rest-qr";
    if (hasFile) {
      r = await verifySlipImage(file, TYPES[file.type], cond);
      via = "rest-image";
    } else {
      r = await verifySlipQr(qrCode, cond);
      via = "rest-qr";
    }
    const { ok, reason, code, order: updated } = await applySlipResult(id, r, via);
    if (!ok) return NextResponse.json({ ok: false, code, error: reason }, { status: 422 });
    return NextResponse.json({ ok: true, order: publicOrder(updated!) });
  } catch (e) {
    console.error("Slip2Go call failed", e);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 502 });
  }
}
