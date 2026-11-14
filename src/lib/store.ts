import "server-only";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

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
  /** staff sent the customer's money back */
  refunded?: boolean;
  /** last failure reason shown to the customer */
  lastError?: string;
}

export interface Settings {
  mode: VerifyMode;
}

const SETTINGS_FILE = path.join(process.cwd(), "data", "settings.json");

export async function getSettings(): Promise<Settings> {
  const fallback: Settings = { mode: process.env.SLIP2GO_MODE === "queue" ? "queue" : "rest" };
  try {
    return { ...fallback, ...JSON.parse(await fs.readFile(SETTINGS_FILE, "utf8")) };
  } catch {
    return fallback;
  }
}

export async function saveSettings(s: Settings) {
  await fs.mkdir(path.dirname(SETTINGS_FILE), { recursive: true });
  await fs.writeFile(SETTINGS_FILE, JSON.stringify(s, null, 2));
}

const DATA_DIR = path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "orders.json");

// Serialise writes so concurrent requests don't clobber the JSON file.
let queue: Promise<unknown> = Promise.resolve();
function locked<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.catch(() => undefined);
  return run;
}

async function readAll(): Promise<Order[]> {
  try {
    return JSON.parse(await fs.readFile(FILE, "utf8")) as Order[];
  } catch {
    return [];
  }
}

async function writeAll(orders: Order[]) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = `${FILE}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(orders, null, 2));
  await fs.rename(tmp, FILE);
}

export async function listOrders(): Promise<Order[]> {
  const orders = await readAll();
  return orders.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getOrder(id: string): Promise<Order | undefined> {
  return (await readAll()).find((o) => o.id === id);
}

export function createOrder(input: Omit<Order, "id" | "createdAt" | "status" | "slipAttempts">) {
  return locked(async () => {
    const orders = await readAll();
    const id = `BTD-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;
    const order: Order = { ...input, customerName: input.customerName || `Guest ${id.slice(-4)}`, id, createdAt: new Date().toISOString(), status: "pending", slipAttempts: [] };
    orders.push(order);
    await writeAll(orders);
    return order;
  });
}

export function updateOrder(id: string, fn: (o: Order, all: Order[]) => void) {
  return locked(async () => {
    const orders = await readAll();
    const order = orders.find((o) => o.id === id);
    if (!order) return undefined;
    fn(order, orders);
    await writeAll(orders);
    return order;
  });
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
export function startPayWindow(id: string) {
  return locked(async () => {
    const orders = await readAll();
    const o = orders.find((x) => x.id === id);
    if (!o || o.status !== "pending") return undefined;
    const starts = o.payStarts ?? [];
    const last = starts.at(-1);
    if (last && Date.now() - Date.parse(last) < 2000) return last;
    const now = new Date().toISOString();
    o.payStarts = [...starts, now].slice(-20);
    await writeAll(orders);
    return now;
  });
}

export const payWindowSeconds = () => Math.max(0, Number(process.env.SLIP_WINDOW_SECONDS ?? 0) || 0);

/** The payment window that is running right now for this order, if any. */
export function payWindowState(o: Order) {
  const w = payWindowSeconds();
  const last = o.payStarts?.at(-1);
  const until = w > 0 && o.status === "pending" && last ? Date.parse(last) + w * 1000 : 0;
  const now = Date.now();
  return until > now ? { expiresAt: new Date(until).toISOString(), serverNow: now } : null;
}

export type DisplayStatus = OrderStatus | "expired";
/** the pay window plus 5 minutes of grace, never less than 10 minutes */
const abandonedAfterMs = () => Math.max(10 * 60, payWindowSeconds() + 5 * 60) * 1000;

/** "pending" orders nobody paid or attached a slip to for a while (window + 5 min) are shown as expired (display only). */
export function displayStatus(o: Order, now = Date.now()): DisplayStatus {
  if (payWindowSeconds() > 0 && o.status === "pending" && o.slipAttempts.length === 0) {
    const lastTouch = Math.max(Date.parse(o.createdAt), ...(o.payStarts ?? []).map((s) => Date.parse(s)));
    if (now - lastTouch > abandonedAfterMs()) return "expired";
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
