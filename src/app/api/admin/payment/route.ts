import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { BANKS, getPaymentConfig, savePaymentConfig } from "@/lib/payment-config";

const MAX_IMAGE = 1_500_000; // characters of data URL

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!b) return NextResponse.json({ error: "Bad request" }, { status: 400 });

  const str = (k: string, max: number) => String(b[k] ?? "").trim().slice(0, max);
  const promptpayId = str("promptpayId", 20).replace(/[\s-]/g, "");
  const accountNumber = str("accountNumber", 20).replace(/[\s-]/g, "");
  const bankCode = str("bankCode", 5);
  const qrImage = str("qrImage", MAX_IMAGE + 1);
  const windowSeconds = Number(b.windowSeconds ?? 0);
  const slip2goSecretKey = str("slip2goSecretKey", 200);
  const cur = await getPaymentConfig();
  // the webhook link is saved on its own; a full save that doesn't mention it leaves it alone
  const webhookToken = "webhookToken" in b ? str("webhookToken", 200) : cur.webhookToken;
  if (Object.keys(b).length === 1 && "webhookToken" in b) {
    if (!webhookToken || !/^[A-Za-z0-9._~-]+$/.test(webhookToken))
      return NextResponse.json({ error: "Token may only use letters, digits and . _ ~ - and can't be empty." }, { status: 400 });
    await savePaymentConfig({ ...cur, webhookToken });
    return NextResponse.json({ ok: true });
  }
  const apiUrl = str("apiUrl", 200).replace(/\/+$/, "");
  const clockSkewSeconds = Number(b.clockSkewSeconds ?? 5);

  if (promptpayId && !/^(\d{10}|\d{13}|\d{15})$/.test(promptpayId))
    return NextResponse.json({ error: "PromptPay ID must be a 10-digit phone number, 13-digit ID or 15-digit e-wallet ID." }, { status: 400 });
  if (accountNumber && !/^\d{6,15}$/.test(accountNumber)) return NextResponse.json({ error: "Account number must be digits only." }, { status: 400 });
  if (bankCode && !BANKS[bankCode]) return NextResponse.json({ error: "Unknown bank." }, { status: 400 });
  if (!Number.isInteger(windowSeconds) || windowSeconds < 0 || windowSeconds > 86400)
    return NextResponse.json({ error: "Payment time must be a whole number of seconds (0 = no limit)." }, { status: 400 });
  if (apiUrl && !/^https?:\/\/[^\s]+$/.test(apiUrl)) return NextResponse.json({ error: "API address must start with http:// or https://" }, { status: 400 });
  if (webhookToken && !/^[A-Za-z0-9._~-]+$/.test(webhookToken)) return NextResponse.json({ error: "Webhook token may only use letters, digits and . _ ~ -" }, { status: 400 });
  if (!Number.isInteger(clockSkewSeconds) || clockSkewSeconds < 0 || clockSkewSeconds > 600)
    return NextResponse.json({ error: "Clock tolerance must be 0–600 seconds." }, { status: 400 });
  if (qrImage && (!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(qrImage) || qrImage.length > MAX_IMAGE))
    return NextResponse.json({ error: "QR image must be a PNG/JPG under about 1 MB." }, { status: 400 });

  await savePaymentConfig({ promptpayId, accountName: str("accountName", 100), accountNumber, bankCode, qrImage, windowSeconds, slip2goSecretKey, webhookToken, apiUrl, clockSkewSeconds });
  return NextResponse.json({ ok: true });
}
