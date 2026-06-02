import { NextResponse } from "next/server";
import { format, startOfISOWeek, endOfISOWeek } from "date-fns";
import {
  getActivity,
  getActivities,
  createCheckin,
  hasCheckinToday,
  hasCheckinThisWeek,
  getWeeklyCheckinCount,
  getCheckinDatesForActivity,
  getAllCheckins,
  getTotalCheckinsCount,
  addXP,
  updateLevel,
  unlockAchievement,
  getCheckinsByDate,
  getUserStats,
  addPontosDisponiveis,
} from "@/lib/db";
import {
  computeStreak,
  calculateXP,
  getLevelInfo,
  evaluateAchievements,
  computeConsecutiveDays,
  getAchievementDef,
} from "@/lib/gamification";
import { xpComBonus } from "@/lib/attributes";
import type { Atributos } from "@/lib/attributes";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  if (date) return NextResponse.json(await getCheckinsByDate(date));
  return NextResponse.json([]);
}

export async function POST(req: Request) {
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
  }

  // Streak → XP (com bônus de atributo por categoria)
  const checkinDates = await getCheckinDatesForActivity(activity_id);
  const streak      = computeStreak(checkinDates, activity.frequency, now, activity.weekly_target ?? undefined);
  const playerStats = await getUserStats();
  const atributos   = (playerStats.atributos ?? { FOR: 0, VIT: 0, AGI: 0, INT: 0, PER: 0 }) as Atributos;
  const xpBase      = calculateXP(activity.xp_base, streak.current);
  const xpEarned    = xpComBonus(xpBase, activity.categoria, atributos);

  let checkin;
  let updatedStats;
  try {
    checkin      = await createCheckin(activity_id, xpEarned, actual_value ?? null);
    updatedStats = await addXP(xpEarned);
  } catch (err: unknown) {
    if (typeof err === "object" && err !== null && "code" in err && (err as { code: string }).code === "23505") {
      return NextResponse.json({ error: "Já feito hoje!" }, { status: 409 });
    }
    throw err;
  }

  const levelInfo = getLevelInfo(updatedStats.total_xp);
  if (levelInfo.level !== updatedStats.level) {
    const levelsGained = levelInfo.level - updatedStats.level;
    await updateLevel(levelInfo.level);
    if (levelsGained > 0) await addPontosDisponiveis(levelsGained * 3);
  }

  // Achievements
  const allCheckins   = await getAllCheckins();
  const allDates      = allCheckins.map((c) => c.checked_at.slice(0, 10));
  const consecutiveDays = computeConsecutiveDays(allDates);
  const checkinsToday = allDates.filter((d) => d === todayStr).length;

  const newCheckinDates = await getCheckinDatesForActivity(activity_id);
  const newStreak       = computeStreak(newCheckinDates, activity.frequency, now, activity.weekly_target ?? undefined);

  const allActivities = await getActivities(false);
  let maxStreak = 0;
  for (const act of allActivities) {
    if (act.frequency === "free") continue;
    const dates = act.id === activity_id ? newCheckinDates : await getCheckinDatesForActivity(act.id);
    const s = computeStreak(dates, act.frequency, now, act.weekly_target ?? undefined);
    maxStreak = Math.max(maxStreak, s.current, s.longest);
  }

  // Weekly count for nx_week (returned so client can update the counter)
  const weeklyCount = activity.frequency === "nx_week"
    ? await getWeeklyCheckinCount(activity_id, weekStart, weekEnd)
    : null;

  const ctx = {
    totalCheckins: await getTotalCheckinsCount(),
    maxStreak,
    level: levelInfo.level,
    checkinsToday,
    checkinHour: now.getHours(),
    consecutiveDays,
  };

  const earnedKeys = evaluateAchievements(ctx);
  const newlyUnlocked: { key: string; name: string; description: string; emoji: string }[] = [];
  for (const key of earnedKeys) {
    const result = await unlockAchievement(key);
    if (result) {
      const def = getAchievementDef(key);
      if (def) newlyUnlocked.push(def);
    }
  }

  return NextResponse.json({
    checkin,
    xpEarned,
    newStreak: newStreak.current,
    weeklyCount,
    levelInfo,
    newlyUnlocked,
  });
}
