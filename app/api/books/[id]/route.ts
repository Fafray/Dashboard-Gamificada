import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { getBook, updateBook, deleteBook } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthed())) return NextResponse.json(null);
  const { id } = await params;
  const book = await getBook(Number(id));
  return NextResponse.json(book);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthed())) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const { id } = await params;
  const data = await req.json();
  const book = await updateBook(Number(id), data);
  return NextResponse.json(book);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthed())) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const { id } = await params;
  await deleteBook(Number(id));
  return NextResponse.json({ ok: true });
}
