import crypto from "crypto";
import { NextResponse } from "next/server";
import { findOrderByQueueId } from "@/lib/store";
import { getPaymentConfig } from "@/lib/payment-config";
import { db } from "@/lib/supabase";
import type { Slip2GoResponse } from "@/lib/slip2go";
import { applySlipResult } from "@/lib/verify";

/** Keep the raw callbacks so we can see exactly what Slip2Go sends (docs don't cover failures). */
async function log(entry: unknown) {
  try {
    await db().from("webhook_log").insert({ entry });
  } catch {}
}

type Loose = Record<string, unknown> | undefined;
const str = (v: unknown) => (typeof v === "string" && v ? v : undefined);

/** The docs show data.queueId, but accept the other likely spots too. */
function findQueueId(b: Loose): string | undefined {
  const d = b?.data as Loose;
  return str(d?.queueId) ?? str(b?.queueId) ?? str(d?.referenceId) ?? str(b?.referenceId) ?? str(d?.id) ?? str(b?.id);
}

/**
 * Slip2Go Queue API callback.
 * Register in the Slip2Go dashboard as:
 *   https://<public-host>/api/slip2go/webhook?token=<webhook token>
 * Slip2Go does not document a signature header, so the secret token in the URL
 * is what proves the call came from the URL we gave them.
 */
export async function POST(req: Request) {
  const expected = (await getPaymentConfig()).webhookToken;
  const got = new URL(req.url).searchParams.get("token") ?? "";
  const a = crypto.createHash("sha256").update(got).digest();
  const b = crypto.createHash("sha256").update(expected).digest();
  if (!expected || !crypto.timingSafeEqual(a, b)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const raw = await req.text();
  let body: Slip2GoResponse & Record<string, unknown>;
  try {
    body = JSON.parse(raw);
  } catch {
    await log({ error: "invalid json", raw: raw.slice(0, 2000) });
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Real callbacks arrive wrapped one level deeper than the docs show:
  //   { data: { code, message, data: { queueId, transRef, amount, ... } } }
  // Unwrap that, and fall back to the documented flat shape.
  const inner = (body.data as Loose)?.code !== undefined ? ((body.data as unknown) as Slip2GoResponse & Record<string, unknown>) : body;

  const queueId = findQueueId(inner);
  if (!queueId) {
    await log({ matched: false, reason: "no queueId found", body });
    return NextResponse.json({ received: true, matched: false });
  }

  const order = await findOrderByQueueId(queueId);
  if (!order) {
    console.warn("Slip2Go webhook: no order waiting for queueId", queueId);
    await log({ matched: false, reason: "no order for queueId", queueId, body });
    return NextResponse.json({ received: true, matched: false });
  }

  // Normalise so applySlipResult always sees data.queueId.
  const normalised: Slip2GoResponse = { code: String(inner.code), message: String(inner.message ?? ""), data: { ...(inner.data ?? {}), queueId } };
  const { ok, code } = await applySlipResult(order.id, normalised, "queue");
  await log({ matched: true, orderId: order.id, ok, code, body });
  return NextResponse.json({ received: true, matched: true, orderId: order.id, ok, code });
}
