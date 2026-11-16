import "server-only";
import { db } from "./supabase";

/** Banks the admin can pick (Slip2Go account-type codes). */
export const BANKS: Record<string, string> = {
  "02001": "PromptPay (phone)",
  "04000": "TrueMoney",
  "01002": "Bangkok Bank",
  "01004": "Kasikorn",
  "01006": "Krungthai",
  "01011": "TTB",
  "01014": "SCB",
  "01025": "Krungsri",
  "01030": "GSB",
  "01069": "CIMB Thai",
  "01070": "Kiatnakin Phatra",
  "01071": "TISCO",
  "01073": "LH Bank",
  "01067": "UOB",
};

export interface PaymentConfig {
  /** PromptPay ID (phone number or national ID) used to draw the QR */
  promptpayId: string;
  /** account holder name (Thai) — also checked against the name on the slip */
  accountName: string;
  accountNumber: string;
  /** Slip2Go bank code, e.g. 01004 */
  bankCode: string;
  /** uploaded QR image (data URL). When set it is shown instead of a generated PromptPay QR. */
  qrImage: string;
  /** seconds the customer has to pay after tapping "Show QR" (0 = no limit) */
  windowSeconds: number;
  /** Slip2Go secret key (admin only — never send to customers) */
  slip2goSecretKey: string;
  /** Slip2Go API address */
  apiUrl: string;
  /** secret in the Queue API webhook address (?token=...) */
  webhookToken: string;
  /** allowance (seconds) for clock difference between the bank and this server */
  clockSkewSeconds: number;
}

export const DEFAULT_API_URL = "https://connect.slip2go.com";
export const envWindowSeconds = () => Math.max(0, Number(process.env.SLIP_WINDOW_SECONDS ?? 0) || 0);

/** Saved in the database by the admin; falls back to the .env values for anything not saved. */
export async function getPaymentConfig(): Promise<PaymentConfig> {
  const env: PaymentConfig = {
    promptpayId: process.env.PROMPTPAY_ID?.trim() ?? "",
    accountName: process.env.RECEIVER_NAME_TH?.trim() || process.env.PROMPTPAY_NAME?.trim() || "",
    accountNumber: process.env.RECEIVER_ACCOUNT_NUMBER?.trim() ?? "",
    bankCode: process.env.RECEIVER_ACCOUNT_TYPE?.trim() ?? "",
    qrImage: "",
    windowSeconds: envWindowSeconds(),
    slip2goSecretKey: process.env.SLIP2GO_SECRET_KEY?.trim() ?? "",
    apiUrl: process.env.SLIP2GO_API_URL?.trim() || DEFAULT_API_URL,
    webhookToken: process.env.SLIP2GO_WEBHOOK_TOKEN?.trim() ?? "",
    clockSkewSeconds: Math.max(0, Number(process.env.SLIP_CLOCK_SKEW_SECONDS ?? 5) || 0),
  };
  const { data } = await db().from("settings").select("value").eq("key", "payment").maybeSingle();
  const saved = data?.value as Partial<PaymentConfig> | undefined;
  if (!saved) return env;
  return { ...env, ...saved, slip2goSecretKey: saved.slip2goSecretKey?.trim() || env.slip2goSecretKey,
    apiUrl: saved.apiUrl?.trim() || env.apiUrl,
    webhookToken: saved.webhookToken?.trim() || env.webhookToken,
  };
}

export async function savePaymentConfig(c: PaymentConfig) {
  const { error } = await db().from("settings").upsert({ key: "payment", value: c });
  if (error) throw new Error(`savePaymentConfig: ${error.message}`);
}

/** The account customers transfer to, shown only when there is no QR (generated or uploaded). */
export function payAccount(c: PaymentConfig) {
  if (c.promptpayId || c.qrImage || !c.accountNumber) return null;
  return { bank: BANKS[c.bankCode] ?? "Bank transfer", number: c.accountNumber, name: c.accountName || "BorntoDrink" };
}
