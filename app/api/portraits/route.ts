import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { getPortraitOverrides, setPortraitOverride } from "@/lib/db";

export async function GET() {
  if (!(await isAuthed())) return NextResponse.json({});
  const overrides = await getPortraitOverrides();
  return NextResponse.json(overrides);
}

export async function POST(req: Request) {
  if (!(await isAuthed())) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const { rank, image } = await req.json();
  if (!rank || !image) return NextResponse.json({ error: "rank e image são obrigatórios" }, { status: 400 });
  await setPortraitOverride(rank, image);
  return NextResponse.json({ ok: true });
}
