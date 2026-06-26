import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { getPerfumes, createPerfume } from "@/lib/db";

export async function GET(req: Request) {
  if (!(await isAuthed())) return NextResponse.json([]);
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") as "owned" | "wishlist" | null;
  const perfumes = await getPerfumes(status ?? undefined);
  return NextResponse.json(perfumes);
}

export async function POST(req: Request) {
  if (!(await isAuthed())) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const data = await req.json();
  const perfume = await createPerfume({
    name: data.name,
    brand: data.brand ?? null,
    photo: data.photo ?? null,
    photo_thumbnail: data.photo_thumbnail ?? null,
    pyramid_image: data.pyramid_image ?? null,
    pyramid_thumbnail: data.pyramid_thumbnail ?? null,
    description: data.description ?? null,
    status: data.status ?? "owned",
    notes_top: data.notes_top ?? null,
    notes_heart: data.notes_heart ?? null,
    notes_base: data.notes_base ?? null,
    rating: data.rating ? Number(data.rating) : null,
    tags: data.tags ?? null,
    price: data.price ? Number(data.price) : null,
    inspiration: data.inspiration ?? null,
  });
  return NextResponse.json(perfume);
}
