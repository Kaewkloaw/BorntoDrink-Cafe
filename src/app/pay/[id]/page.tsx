import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import QRCode from "qrcode";
import generatePayload from "promptpay-qr";
import { payAccount } from "@/lib/pay-info";
import { getOrder, getSettings, payWindowSeconds, payWindowState, publicOrder } from "@/lib/store";
import { formatTHB } from "@/lib/products";
import { SlipPayment } from "@/components/SlipPayment";
import { Header } from "@/components/Header";
import { CartDrawer } from "@/components/CartDrawer";

export default function PayPage(props: PageProps<"/pay/[id]">) {
  return (
    <Suspense
      fallback={
        <main className="grid flex-1 place-items-center py-24">
          <Image src="/mascots/latte.webp" alt="" width={120} height={120} className="animate-bob" />
        </main>
      }
    >
      <PayContent {...props} />
    </Suspense>
  );
}

async function PayContent({ params }: PageProps<"/pay/[id]">) {
  await connection(); // the payment window depends on the current time
  const { id } = await params;
  const order = await getOrder(id);
  if (!order) notFound();
  const { mode } = await getSettings();

  const windowS = payWindowSeconds();
  const running = payWindowState(order);

  // With a time limit the QR is only sent once the customer taps "Show QR" (or while a window is running).
  const ppId = process.env.PROMPTPAY_ID?.trim();
  const qr =
    ppId && (windowS === 0 || running)
      ? await QRCode.toDataURL(generatePayload(ppId, { amount: order.total }), { margin: 1, width: 320, color: { dark: "#3b1d0f" } })
      : null;

  // like the QR, the account is only sent once a window is running (or when there is no time limit)
  const account = windowS === 0 || running ? payAccount() : null;

  return (
    <>
      <Header />
      <CartDrawer />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <Link href="/" className="inline-flex min-h-10 items-center text-sm text-muted hover:text-tangelo-700">← Back to menu</Link>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-2">
          <h1 className="font-display text-4xl font-semibold">Payment</h1>
          <p className="font-mono text-sm text-muted">#{order.id}</p>
        </div>

        <SlipPayment
          initial={publicOrder(order)}
          mode={mode}
          qrImage={qr}
          qrAvailable={!!ppId}
          account={account}
          windowSeconds={windowS}
          initialWindow={running}
          promptpayName={process.env.PROMPTPAY_NAME || "BorntoDrink"}
          totalLabel={formatTHB(order.total)}
        />
      </main>
    </>
  );
}
