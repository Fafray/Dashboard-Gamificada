import { NextResponse } from "next/server";
import { getUserStats, investirPonto } from "@/lib/db";
import { derivarClasse } from "@/lib/attributes";
import type { Atributos } from "@/lib/attributes";

export async function GET() {
  const stats = await getUserStats();
  const atributos = (stats.atributos ?? { FOR: 0, VIT: 0, AGI: 0, INT: 0, PER: 0 }) as Atributos;
  const classe = derivarClasse(atributos);
  return NextResponse.json({
    atributos,
    pontos_disponiveis: stats.pontos_disponiveis ?? 0,
    classe,
  });
}

export async function POST(req: Request) {
  const { attr } = await req.json();
  const valid = ["FOR", "VIT", "AGI", "INT", "PER"];
  if (!valid.includes(attr)) {
    return NextResponse.json({ error: "Atributo inválido" }, { status: 400 });
  }
  const stats = await investirPonto(attr);
  const atributos = stats.atributos as Atributos;
  const classe = derivarClasse(atributos);
  return NextResponse.json({
    atributos,
    pontos_disponiveis: stats.pontos_disponiveis,
    classe,
  });
}
