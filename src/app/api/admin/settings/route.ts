import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { saveSettings } from "@/lib/store";

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { mode } = (await req.json().catch(() => ({}))) as { mode?: string };
  if (mode !== "rest" && mode !== "queue") return NextResponse.json({ error: "Bad mode" }, { status: 400 });
  await saveSettings({ mode });
  return NextResponse.json({ ok: true, mode });
}
