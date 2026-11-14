import "server-only";

/**
 * Slip2Go client — https://slip2go.com/guide
 *
 * REST API  (synchronous, result in the response)
 *   POST /api/verify-slip/qr-image/info   multipart: file + payload(JSON, conditions top-level)
 *   POST /api/verify-slip/qr-code/info    JSON: { payload: { qrCode, checkCondition } }
 * Queue API (asynchronous, result POSTed to the webhook set in the Slip2Go dashboard)
 *   POST /api/queue/verify-slip/qr-code   JSON: { payload: { qrCode, checkCondition } } -> 200202 { queueId }
 * Account
 *   GET  /api/account/info
 */

const API_URL = process.env.SLIP2GO_API_URL || "https://connect.slip2go.com";

function authHeader() {
  const key = process.env.SLIP2GO_SECRET_KEY;
  if (!key) throw new Error("SLIP2GO_SECRET_KEY is not set");
  return { Authorization: `Bearer ${key}` };
}

export interface Slip2GoParty {
  account?: { name?: string; bank?: { account?: string } };
  bank?: { id?: string; name?: string };
}

export interface Slip2GoSlip {
  referenceId?: string;
  queueId?: string;
  transRef?: string;
  dateTime?: string;
  amount?: number;
  receiver?: Slip2GoParty;
  sender?: Slip2GoParty;
}

export interface Slip2GoResponse {
  code: string;
  message: string;
  data?: Slip2GoSlip;
}

/** Thai-language explanations for the codes a customer can hit. */
export const SLIP_MESSAGES: Record<string, string> = {
  "200000": "Payment received.",
  "200200": "Payment received.",
  "200202": "Slip received.",
  "200401": "This transfer didn't go to our account.",
  "200402": "The amount doesn't match your order.",
  "200403": "We received your transfer, but after the payment time. Please show this to our staff and they'll sort it out.",
  "200404": "We couldn't find this slip.",
  "200500": "This slip isn't valid.",
  "200501": "This slip was already used.",
  "200502": "The bank is busy. Please try again.",
  "400001": "We couldn't read this slip.",
  "400002": "That file isn't a slip.",
  "400422": "Slip checking isn't ready. Please ask our staff.",
  "401004": "Slip checking is unavailable. Please ask our staff.",
  "401005": "Slip checking is unavailable. Please ask our staff.",
  "429000": "Too many tries. Please wait a moment.",
};

export const isSlipOk = (code: string) => code === "200000" || code === "200200";

export interface Conditions {
  amount: number;
  receiverAccount?: string;
  /** Slip2Go accountType, e.g. "01014" = SCB */
  receiverType?: string;
}

function conditions({ amount, receiverAccount, receiverType }: Conditions) {
  const c: Record<string, unknown> = {
    checkDuplicate: true,
    checkAmount: { type: "eq", amount: String(amount) },
  };
  if (receiverAccount) {
    // Only type + number are sent. Slips show a truncated Thai name, so a name here rejects real payments.
    c.checkReceiver = [{ ...(receiverType ? { accountType: receiverType } : {}), accountNumber: receiverAccount.replace(/\D/g, "") }];
  }
  // No checkDate: tested against real slips, it only works at whole-day precision
  // (a date 1 minute after the transfer still passes), so the time window is enforced
  // in applySlipResult from the transfer time Slip2Go returns.
  return c;
}

async function call(path: string, init: RequestInit): Promise<Slip2GoResponse> {
  const res = await fetch(`${API_URL}${path}`, { ...init, cache: "no-store" });
  try {
    return (await res.json()) as Slip2GoResponse;
  } catch {
    return { code: String(res.status), message: `Slip2Go HTTP ${res.status}` };
  }
}

/** REST: verify by uploading the slip image. */
export function verifySlipImage(file: Blob, filename: string, c: Conditions) {
  const form = new FormData();
  form.append("file", file, filename);
  form.append("payload", JSON.stringify(conditions(c)));
  return call("/api/verify-slip/qr-image/info", { method: "POST", headers: authHeader(), body: form });
}

/** REST: verify by the QR string decoded from the slip. */
export function verifySlipQr(qrCode: string, c: Conditions) {
  return call("/api/verify-slip/qr-code/info", {
    method: "POST",
    headers: { ...authHeader(), "Content-Type": "application/json" },
    body: JSON.stringify({ payload: { qrCode, checkCondition: conditions(c) } }),
  });
}

/** Queue: enqueue a QR string; Slip2Go POSTs the result to our webhook later. */
export function queueSlipQr(qrCode: string, c: Conditions) {
  return call("/api/queue/verify-slip/qr-code", {
    method: "POST",
    headers: { ...authHeader(), "Content-Type": "application/json" },
    body: JSON.stringify({ payload: { qrCode, checkCondition: conditions(c) } }),
  });
}

export interface Slip2GoAccount {
  shopName: string;
  package: string;
  packageExpiredDate: string;
  tokenLimit: number;
  tokenRemaining: number;
  creditRemaining: number;
  tokenPerSlip: number;
  estimatedQuotaSlip: number;
  quotaQrLimit?: number;
  quotaQrRemaining?: number;
}

export async function getAccountInfo(): Promise<Slip2GoAccount | null> {
  try {
    const json = (await call("/api/account/info", {
      headers: { ...authHeader(), "Content-Type": "application/json" },
    })) as unknown as { code: string; data?: Slip2GoAccount };
    return json.code === "200001" && json.data ? json.data : null;
  } catch {
    return null;
  }
}
