import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { deletePortraitOverride } from "@/lib/db";

export async function DELETE(_req: Request, { params }: { params: Promise<{ rank: string }> }) {
  if (!(await isAuthed())) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const { rank } = await params;
  await deletePortraitOverride(decodeURIComponent(rank));
  return NextResponse.json({ ok: true });
}
