import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { getHourlyPlansForDate, upsertHourlyPlan } from "@/lib/db";

export async function GET(req: Request) {
  if (!(await isAuthed())) return NextResponse.json([]);
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  if (!date) return NextResponse.json({ error: "date is required" }, { status: 400 });
  const rows = await getHourlyPlansForDate(date);
  return NextResponse.json(rows);
}

export async function PUT(req: Request) {
  if (!(await isAuthed())) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const body = await req.json();
  const { date, hour, text } = body;

  if (!date || typeof hour !== "number" || hour < 0 || hour > 23 || typeof text !== "string") {
    return NextResponse.json({ error: "date, hour (0-23) and text are required" }, { status: 400 });
  }

  await upsertHourlyPlan(date, hour, text);
  return NextResponse.json({ success: true });
}
