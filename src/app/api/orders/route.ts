import { NextResponse } from "next/server";
import { PRODUCT_MAP, calculatePromotion } from "@/lib/products";
import { resolveOptions } from "@/lib/options";
import { createOrder, type OrderItem } from "@/lib/store";

export async function POST(req: Request) {
  let body: { customerName?: string; note?: string; items?: { productId: string; qty: number; options?: string[] }[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const customerName = (body.customerName ?? "").trim().slice(0, 60); // optional: createOrder fills in "Guest ABCD"
  if (!Array.isArray(body.items) || body.items.length === 0)
    return NextResponse.json({ error: "Your bag is empty." }, { status: 400 });

  // Prices always come from the server-side menu, never from the client.
  const items: OrderItem[] = [];
  for (const { productId, qty, options } of body.items) {
    const p = PRODUCT_MAP.get(productId);
    const q = Math.floor(Number(qty));
    if (!p || !(q >= 1 && q <= 50)) return NextResponse.json({ error: "Invalid item in order." }, { status: 400 });
    const r = resolveOptions(productId, options);
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
    // price is always worked out here: menu price + the chosen options' extras
    items.push({
      productId,
      name: p.name,
      price: p.price + r.extra,
      qty: q,
      ...(r.ids.length ? { options: r.ids, note: r.labels.join(", ") } : {}),
    });
  }
  const { subtotal, discount, total } = calculatePromotion(items);

  const order = await createOrder({ customerName, note: body.note?.trim().slice(0, 200) || undefined, items, subtotal, discount, total });
  return NextResponse.json({ id: order.id });
}
