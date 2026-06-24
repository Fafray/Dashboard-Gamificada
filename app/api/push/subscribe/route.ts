import { NextResponse } from "next/server";
import { savePushSubscription, deletePushSubscription } from "@/lib/db";
import { isAuthed } from "@/lib/auth";

export async function POST(req: Request) {
  if (!(await isAuthed())) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const { endpoint, keys } = await req.json();
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json({ error: "Subscription inválida" }, { status: 400 });
  }
  await savePushSubscription(endpoint, keys.p256dh, keys.auth);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  if (!(await isAuthed())) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const { endpoint } = await req.json();
  if (!endpoint) return NextResponse.json({ error: "endpoint obrigatório" }, { status: 400 });
  await deletePushSubscription(endpoint);
  return NextResponse.json({ ok: true });
}
