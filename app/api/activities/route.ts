import { NextResponse } from "next/server";
import { getActivities, createActivity } from "@/lib/db";
import { isAuthed } from "@/lib/auth";

export async function GET(req: Request) {
  if (!(await isAuthed())) return NextResponse.json([]);
  const { searchParams } = new URL(req.url);
  const includeArchived = searchParams.get("include_archived") === "true";
  const activities = await getActivities(includeArchived);
  return NextResponse.json(activities);
}

export async function POST(req: Request) {
  if (!(await isAuthed())) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const body = await req.json();
  const { name, frequency, emoji, color } = body;

  if (!name || !frequency) {
    return NextResponse.json({ error: "name and frequency are required" }, { status: 400 });
  }
  if (!["daily", "weekly", "free", "nx_week", "once"].includes(frequency)) {
    return NextResponse.json({ error: "frequency must be daily, weekly, free, nx_week, or once" }, { status: 400 });
  }

  const { weekly_target, target_value, target_unit, categoria, scheduled_days, notify_at, due_date } = body;

  const activity = await createActivity({
    name,
    frequency,
    emoji:          emoji ?? null,
    color:          color ?? "#7c3aed",
    weekly_target:  weekly_target ?? null,
    target_value:   target_value ?? null,
    target_unit:    target_unit ?? null,
    categoria:      categoria ?? null,
    scheduled_days: scheduled_days ?? null,
    notify_at:      notify_at ?? null,
    due_date:       due_date ?? null,
  });

  return NextResponse.json(activity, { status: 201 });
}
