import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { format, startOfISOWeek, endOfISOWeek } from "date-fns";
import {
  getActivity,
  createCheckin,
  hasCheckinToday,
  hasCheckinThisWeek,
  getWeeklyCheckinCount,
  getCheckinDatesForActivity,
  getCheckinsByDate,
  archiveActivity,
} from "@/lib/db";
import { computeStreak } from "@/lib/streaks";

export async function GET(req: Request) {
  if (!(await isAuthed())) return NextResponse.json([]);
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  if (date) return NextResponse.json(await getCheckinsByDate(date));
  return NextResponse.json([]);
}

export async function POST(req: Request) {
  if (!(await isAuthed())) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const body = await req.json();
  const { activity_id, actual_value } = body;

  if (!activity_id) {
    return NextResponse.json({ error: "activity_id is required" }, { status: 400 });
  }

  const activity = await getActivity(activity_id);
  if (!activity) {
    return NextResponse.json({ error: "Activity not found" }, { status: 404 });
  }

  const now = new Date();
  const todayStr = format(now, "yyyy-MM-dd");
  const weekStart = format(startOfISOWeek(now), "yyyy-MM-dd");
  const weekEnd   = format(endOfISOWeek(now),   "yyyy-MM-dd");

  // Duplicate / quota check per frequency
  if (activity.frequency === "daily") {
    if (await hasCheckinToday(activity_id, todayStr)) {
      return NextResponse.json({ error: "Já feito hoje!" }, { status: 409 });
    }
  } else if (activity.frequency === "weekly") {
    if (await hasCheckinThisWeek(activity_id, weekStart, weekEnd)) {
      return NextResponse.json({ error: "Já feito essa semana!" }, { status: 409 });
    }
  } else if (activity.frequency === "nx_week") {
    if (await hasCheckinToday(activity_id, todayStr)) {
      return NextResponse.json({ error: "Já registrado hoje!" }, { status: 409 });
    }
    const count = await getWeeklyCheckinCount(activity_id, weekStart, weekEnd);
    if (count >= (activity.weekly_target ?? 1)) {
      return NextResponse.json({ error: "Meta semanal já atingida!" }, { status: 409 });
    }
  } else if (activity.frequency === "once") {
    if (await hasCheckinToday(activity_id, todayStr)) {
      return NextResponse.json({ error: "Missão já concluída!" }, { status: 409 });
    }
  }

  let checkin;
  try {
    checkin = await createCheckin(activity_id, actual_value ?? null);
  } catch (err: unknown) {
    if (typeof err === "object" && err !== null && "code" in err && (err as { code: string }).code === "23505") {
      return NextResponse.json({ error: "Já feito hoje!" }, { status: 409 });
    }
    throw err;
  }

  // Missão única: arquiva automaticamente após concluir
  if (activity.frequency === "once") {
    await archiveActivity(activity_id);
  }

  const newCheckinDates = await getCheckinDatesForActivity(activity_id);
  const newStreak = computeStreak(newCheckinDates, activity.frequency, now, activity.weekly_target ?? undefined);

  const weeklyCount = activity.frequency === "nx_week"
    ? await getWeeklyCheckinCount(activity_id, weekStart, weekEnd)
    : null;

  return NextResponse.json({
    checkin,
    newStreak: newStreak.current,
    weeklyCount,
  });
}
