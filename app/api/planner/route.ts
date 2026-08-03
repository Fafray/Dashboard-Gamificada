import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { getHourlyPlansForDate, upsertHourlyPlan } from "@/lib/db";
import { getHourlySuggestions } from "@/lib/plannerSuggestions";

export async function GET(req: Request) {
  if (!(await isAuthed())) return NextResponse.json({ rows: [], suggestions: {} });
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  if (!date) return NextResponse.json({ error: "date is required" }, { status: 400 });
  const [rows, suggestions] = await Promise.all([
    getHourlyPlansForDate(date),
    getHourlySuggestions(date),
  ]);
  return NextResponse.json({ rows, suggestions });
}

export async function PUT(req: Request) {
  if (!(await isAuthed())) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const body = await req.json();
  const { date, hour, text, duration, done } = body;

  if (!date || typeof hour !== "number" || hour < 0 || hour > 23) {
    return NextResponse.json({ error: "date and hour (0-23) are required" }, { status: 400 });
  }
  if (duration !== undefined && (typeof duration !== "number" || duration < 1 || duration > 12)) {
    return NextResponse.json({ error: "duration must be between 1 and 12" }, { status: 400 });
  }

  await upsertHourlyPlan(date, hour, { text, duration, done });
  return NextResponse.json({ success: true });
}
