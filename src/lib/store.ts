import "server-only";
import crypto from "crypto";
import { db } from "./supabase";
import { envWindowSeconds, getPaymentConfig } from "./payment-config";

export type OrderStatus = "pending" | "verifying" | "paid" | "rejected";
export type VerifyMode = "rest" | "queue";

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  qty: number;
  /** this drink's own requests as text, e.g. "Less sweet, Oat milk" (built from `options` by the server) */
  note?: string;
  /** chosen option ids that differ from the defaults, e.g. ["sweetness:less", "milk:oat"] */
  options?: string[];
}

export interface SlipInfo {
  code: string;
  message: string;
  transRef?: string;
  amount?: number;
  dateTime?: string;
  senderName?: string;
  senderBank?: string;
  receiverName?: string;
  receiverBank?: string;
  /** which Slip2Go API produced this result */
  via: "rest-image" | "rest-qr" | "queue";
  queueId?: string;
  /** a genuine transfer to our account, but made outside the payment window (money is in the bank) */
  late?: boolean;
  checkedAt: string;
}

export interface Order {
  id: string;
  createdAt: string;
  customerName: string;
  note?: string;
  items: OrderItem[];
  subtotal?: number;
  discount?: number;
  total: number;
  status: OrderStatus;
  /** every verification attempt, newest last */
  slipAttempts: SlipInfo[];
  paidAt?: string;
  /** set while waiting for a Queue API webhook */
  queueId?: string;
  queuedAt?: string;
  /** each time the customer tapped "Show QR" (starts a payment window); newest last */
  payStarts?: string[];
  /** payment window (seconds) that applied when this order was placed / last started; 0 = none */
  payWindowS?: number;
  /** staff sent the customer's money back */
  refunded?: boolean;
  /** last failure reason shown to the customer */
  lastError?: string;
}

export interface Settings {
  mode: VerifyMode;
}

export async function getSettings(): Promise<Settings> {
  const fallback: Settings = { mode: process.env.SLIP2GO_MODE === "queue" ? "queue" : "rest" };
  const { data } = await db().from("settings").select("value").eq("key", "app").maybeSingle();
  return { ...fallback, ...(data?.value as Partial<Settings> | undefined) };
}

export async function saveSettings(s: Settings) {
  const { error } = await db().from("settings").upsert({ key: "app", value: s });
  if (error) throw new Error(`saveSettings: ${error.message}`);
}

interface Row {
  id: string;
  version: number;
  data: Order;
}

export async function listOrders(): Promise<Order[]> {
  const { data, error } = await db().from("orders").select("data").order("created_at", { ascending: false });
  if (error) throw new Error(`listOrders: ${error.message}`);
  return (data ?? []).map((r) => r.data as Order);
}

export async function getOrder(id: string): Promise<Order | undefined> {
  const { data } = await db().from("orders").select("data").eq("id", id).maybeSingle();
  return data?.data as Order | undefined;
}

export async function findOrderByQueueId(queueId: string): Promise<Order | undefined> {
  const { data } = await db().from("orders").select("data").eq("queue_id", queueId).maybeSingle();
  return data?.data as Order | undefined;
}

export async function createOrder(input: Omit<Order, "id" | "createdAt" | "status" | "slipAttempts" | "payWindowS">) {
  const id = `BTD-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;
  const order: Order = { ...input, customerName: input.customerName || `Guest ${id.slice(-4)}`, id, createdAt: new Date().toISOString(), status: "pending", slipAttempts: [], payWindowS: (await getPaymentConfig()).windowSeconds };
  const { error } = await db().from("orders").insert({ id, created_at: order.createdAt, status: order.status, queue_id: null, data: order });
  if (error) throw new Error(`createOrder: ${error.message}`);
  return order;
}

/**
 * Read-modify-write one order with optimistic locking: the update only lands if nobody changed the
 * row since we read it (`version`), otherwise we re-read and re-apply `fn`. Safe across serverless instances.
 * `all` holds the already-paid orders (what `transRefUsed` needs).
 */
export async function updateOrder(id: string, fn: (o: Order, all: Order[]) => void): Promise<Order | undefined> {
  for (let attempt = 0; attempt < 6; attempt++) {
    const { data: row } = await db().from("orders").select("id, version, data").eq("id", id).maybeSingle<Row>();
    if (!row) return undefined;
    const { data: paidRows } = await db().from("orders").select("data").eq("status", "paid");
    const paid = (paidRows ?? []).map((r) => r.data as Order).filter((o) => o.id !== id);
    const order = row.data;
    const all = [...paid, order];
    fn(order, all);
    const { data: updated, error } = await db()
      .from("orders")
      .update({ status: order.status, queue_id: order.queueId ?? null, data: order, version: row.version + 1 })
      .eq("id", id)
      .eq("version", row.version)
      .select("id");
    if (error) throw new Error(`updateOrder: ${error.message}`);
    if (updated && updated.length > 0) return order;
  }
  throw new Error("updateOrder: too much contention, try again");
}

/** Has any *other* order already been paid with this bank transaction ref? */
export function transRefUsed(all: Order[], transRef: string, exceptId: string) {
  return all.some(
    (o) => o.id !== exceptId && o.status === "paid" && o.slipAttempts.some((s) => s.transRef === transRef && isOkCode(s.code)),
  );
}

/** Slip2Go success codes: 200000 "Slip found" and 200200 "Slip is valid". */
export const isOkCode = (code: string) => code === "200000" || code === "200200";

/** Start (or reuse, if tapped again within 2s) a payment window for this order. Returns its start time. */
export async function startPayWindow(id: string, windowS: number) {
  let result: string | undefined;
  await updateOrder(id, (o) => {
    result = undefined;
    if (o.status !== "pending") return;
    const starts = o.payStarts ?? [];
    const last = starts.at(-1);
    if (last && Date.now() - Date.parse(last) < 2000) {
      result = last;
      return;
    }
    const now = new Date().toISOString();
    o.payWindowS = windowS;
    o.payStarts = [...starts, now].slice(-20);
    result = now;
  });
  return result;
}

/** the window that applies to this order (older orders fall back to the .env value) */
export const orderWindow = (o: Order) => o.payWindowS ?? envWindowSeconds();

/** The payment window that is running right now for this order, if any. */
export function payWindowState(o: Order) {
  const w = orderWindow(o);
  const last = o.payStarts?.at(-1);
  const until = w > 0 && o.status === "pending" && last ? Date.parse(last) + w * 1000 : 0;
  const now = Date.now();
  return until > now ? { expiresAt: new Date(until).toISOString(), serverNow: now } : null;
}

export type DisplayStatus = OrderStatus | "expired";
/** the pay window plus 5 minutes of grace, never less than 10 minutes */
const abandonedAfterMs = (o: Order) => Math.max(10 * 60, orderWindow(o) + 5 * 60) * 1000;

/** "pending" orders nobody paid or attached a slip to for a while (window + 5 min) are shown as expired (display only). */
export function displayStatus(o: Order, now = Date.now()): DisplayStatus {
  if (orderWindow(o) > 0 && o.status === "pending" && o.slipAttempts.length === 0) {
    const lastTouch = Math.max(Date.parse(o.createdAt), ...(o.payStarts ?? []).map((s) => Date.parse(s)));
    if (now - lastTouch > abandonedAfterMs(o)) return "expired";
  }
  return o.status;
}

/** Shape the customer-facing receipt (no internal fields). */
export function publicOrder(o: Order) {
  const slip = [...o.slipAttempts].reverse().find((s) => isOkCode(s.code));
  return {
    id: o.id,
    status: o.status,
    customerName: o.customerName,
    items: o.items,
    subtotal: o.subtotal,
    discount: o.discount,
    total: o.total,
    paidAt: o.paidAt,
    transRef: slip?.transRef,
    senderName: slip?.senderName,
    senderBank: slip?.senderBank,
    via: slip?.via,
    lastError: o.lastError,
  };
}
export type PublicOrder = ReturnType<typeof publicOrder>;
