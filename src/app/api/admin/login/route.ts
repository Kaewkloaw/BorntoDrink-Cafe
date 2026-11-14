import { NextResponse } from "next/server";
import { ADMIN_COOKIE, checkPassword, cookieOptions, makeToken } from "@/lib/auth";

export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const pw = String(form?.get("password") ?? "");
  const url = new URL("/admin", req.url);
  if (!checkPassword(pw)) {
    url.searchParams.set("error", "1");
    return NextResponse.redirect(url, 303);
  }
  const res = NextResponse.redirect(url, 303);
  res.cookies.set(ADMIN_COOKIE, makeToken(), cookieOptions);
  return res;
}
