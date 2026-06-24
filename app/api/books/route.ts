import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { getBooks, createBook } from "@/lib/db";

export async function GET(req: Request) {
  if (!(await isAuthed())) return NextResponse.json([]);
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") as "want" | "reading" | "read" | null;
  const books = await getBooks(status ?? undefined);
  return NextResponse.json(books);
}

export async function POST(req: Request) {
  if (!(await isAuthed())) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const data = await req.json();
  const book = await createBook({
    title: data.title,
    author: data.author ?? null,
    cover_image: data.cover_image ?? null,
    cover_thumbnail: data.cover_thumbnail ?? null,
    description: data.description ?? null,
    status: data.status ?? "want",
    total_pages: data.total_pages ? Number(data.total_pages) : null,
    current_page: data.current_page ? Number(data.current_page) : 0,
    rating: data.rating ? Number(data.rating) : null,
    summary: data.summary ?? null,
    started_at: data.started_at ?? null,
    finished_at: data.finished_at ?? null,
  });
  return NextResponse.json(book);
}
