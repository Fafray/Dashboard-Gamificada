import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSessionToken, COOKIE_NAME } from "@/lib/auth";

export async function POST(req: Request) {
  const { password } = await req.json();
  if (!password || password !== process.env.APP_PASSWORD) {
    await new Promise((r) => setTimeout(r, 500));
    return NextResponse.json({ error: "senha incorreta" }, { status: 401 });
  }
  const token = createSessionToken();
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
    secure: process.env.NODE_ENV === "production",
  });
  return NextResponse.json({ ok: true });
}
