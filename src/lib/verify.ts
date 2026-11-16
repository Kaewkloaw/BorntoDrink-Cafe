import "server-only";
import { isSlipOk, SLIP_MESSAGES, type Slip2GoResponse } from "./slip2go";
import { getPaymentConfig } from "./payment-config";
import { orderWindow, transRefUsed, updateOrder, type Order, type SlipInfo } from "./store";

const TITLES = /^(นางสาว|น\.ส\.|นาย|นาง|ด\.ช\.|ด\.ญ\.|miss|mrs?\.?|ms\.?)\s*/i;
const norm = (s: string) => s.replace(TITLES, "").replace(/\s+/g, " ").trim();

/**
 * Slips print the receiver name truncated ("ปุญชญา จ"), so the slip's name must be the START of the
 * configured full name. Off when no account name is set.
 */
function receiverNameOk(slipName: string | undefined, expected: string) {
  if (!expected) return true;
  if (!slipName) return false;
  const a = norm(slipName);
  return a.length >= 4 && norm(expected).startsWith(a);
}

/**
 * The transfer must fall inside a payment window: from a moment the customer tapped "Show QR"
 * until the order's payment window later (± clock skew). Any of the order's windows counts. Off when 0.
 * No windows at all (QR never shown) or no transfer time on the slip = not accepted.
 */
function withinWindow(dateTime: string | undefined, payStarts: string[] | undefined, windowS: number, skewS: number) {
  if (!(windowS > 0)) return true;
  const t = Date.parse(dateTime ?? "");
  if (!Number.isFinite(t) || !payStarts?.length) return false;
  return payStarts.some((s) => {
    const start = Date.parse(s);
    return t >= start - skewS * 1000 && t <= start + (windowS + skewS) * 1000;
  });
}

/**
 * Apply a Slip2Go result (from REST or from a Queue webhook) to an order.
 * Marks it paid only if the code is a success AND the amount matches AND the
 * bank transaction hasn't paid another order here.
 */
export async function applySlipResult(
  orderId: string,
  result: Slip2GoResponse,
  via: SlipInfo["via"],
): Promise<{ order?: Order; ok: boolean; reason: string; code: string }> {
  const d = result.data;
  const attempt: SlipInfo = {
    code: String(result.code),
    message: result.message,
    transRef: d?.transRef,
    amount: d?.amount,
    dateTime: d?.dateTime,
    senderName: d?.sender?.account?.name,
    senderBank: d?.sender?.bank?.name,
    receiverName: d?.receiver?.account?.name,
    receiverBank: d?.receiver?.bank?.name,
    via,
    queueId: d?.queueId,
    checkedAt: new Date().toISOString(),
  };

  const cfg = await getPaymentConfig();
  const expectedName = cfg.accountName.trim();
  let ok = false;
  let reason = SLIP_MESSAGES[attempt.code] ?? result.message ?? "We couldn't check your slip.";

  const order = await updateOrder(orderId, (o, all) => {
    if (o.status === "paid") {
      ok = true;
      return;
    }
    ok = isSlipOk(attempt.code);
    if (ok && Number(attempt.amount) !== o.total) {
      ok = false;
      attempt.code = "200402";
      reason = SLIP_MESSAGES["200402"];
    }
    if (ok && !receiverNameOk(attempt.receiverName, expectedName)) {
      ok = false;
      attempt.code = "200401";
      reason = SLIP_MESSAGES["200401"];
    }
    if (ok && !withinWindow(attempt.dateTime, o.payStarts, o.payStarts?.length ? orderWindow(o) : cfg.windowSeconds, cfg.clockSkewSeconds)) {
      ok = false;
      attempt.code = "200403";
      attempt.late = true; // everything else checked out, so staff must either accept it or refund it
      reason = SLIP_MESSAGES["200403"];
    }
    if (ok && attempt.transRef && transRefUsed(all, attempt.transRef, o.id)) {
      ok = false;
      attempt.code = "200501";
      reason = SLIP_MESSAGES["200501"];
    }
    o.slipAttempts.push(attempt);
    o.queueId = undefined;
    if (ok) {
      o.status = "paid";
      o.paidAt = attempt.checkedAt;
      o.lastError = undefined;
    } else {
      o.status = "pending"; // let the customer try another slip
      o.lastError = reason;
    }
  });

  return { order, ok, reason, code: attempt.code };
}
