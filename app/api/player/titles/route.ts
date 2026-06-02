import { NextResponse } from "next/server";
import { equiparTitulo, getUserStats } from "@/lib/db";

export async function POST(req: Request) {
  const { id } = await req.json();
  if (id !== null && typeof id !== "string") {
    return NextResponse.json({ error: "id inválido" }, { status: 400 });
  }
  await equiparTitulo(id ?? null);
  const stats = await getUserStats();
  return NextResponse.json({ titulo_ativo_id: stats.titulo_ativo_id });
}
