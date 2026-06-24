import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { getPerfume, updatePerfume, deletePerfume } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthed())) return NextResponse.json(null);
  const { id } = await params;
  const perfume = await getPerfume(Number(id));
  return NextResponse.json(perfume);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthed())) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const { id } = await params;
  const data = await req.json();
  const perfume = await updatePerfume(Number(id), data);
  return NextResponse.json(perfume);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthed())) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const { id } = await params;
  await deletePerfume(Number(id));
  return NextResponse.json({ ok: true });
}
