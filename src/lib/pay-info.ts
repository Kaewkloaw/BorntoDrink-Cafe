import "server-only";

const BANKS: Record<string, string> = { "01002": "Bangkok Bank", "01004": "Kasikorn", "01006": "Krungthai", "01014": "SCB", "01025": "Krungsri" };

/** The account customers transfer to, shown only when there is no PromptPay QR to scan. */
export function payAccount() {
  if (process.env.PROMPTPAY_ID?.trim() || !process.env.RECEIVER_ACCOUNT_NUMBER) return null;
  return {
    bank: BANKS[process.env.RECEIVER_ACCOUNT_TYPE ?? ""] ?? "Bank transfer",
    number: process.env.RECEIVER_ACCOUNT_NUMBER,
    name: process.env.RECEIVER_NAME_TH || process.env.PROMPTPAY_NAME || "BorntoDrink",
  };
}
