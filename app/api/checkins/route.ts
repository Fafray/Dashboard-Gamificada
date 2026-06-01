import { NextResponse } from "next/server";
import { format, startOfISOWeek, endOfISOWeek } from "date-fns";
import {
  getActivity,
  getActivities,
  createCheckin,
  hasCheckinToday,
  hasCheckinThisWeek,
  getCheckinDatesForActivity,
  getAllCheckins,
  getTotalCheckinsCount,
  addXP,
  updateLevel,
  getUserStats,
  unlockAchievement,
  getCheckinsByDate,
} from "@/lib/db";
import {
  computeStreak,
  calculateXP,
  getLevelInfo,
  evaluateAchievements,
  computeConsecutiveDays,
  getAchievementDef,
} from "@/lib/gamification";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  if (date) return NextResponse.json(await getCheckinsByDate(date));
  return NextResponse.json([]);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { activity_id } = body;

  if (!activity_id) {
    return NextResponse.json({ error: "activity_id is required" }, { status: 400 });
  }

  const activity = await getActivity(activity_id);
  if (!activity) {
    return NextResponse.json({ error: "Activity not found" }, { status: 404 });
  }

  const now = new Date();
  const todayStr = format(now, "yyyy-MM-dd");

  // Duplicate check
  if (activity.frequency === "daily") {
    if (await hasCheckinToday(activity_id, todayStr)) {
      return NextResponse.json({ error: "Já feito hoje!" }, { status: 409 });
    }
  } else if (activity.frequency === "weekly") {
    const weekStart = format(startOfISOWeek(now), "yyyy-MM-dd");
    const weekEnd = format(endOfISOWeek(now), "yyyy-MM-dd");
    if (await hasCheckinThisWeek(activity_id, weekStart, weekEnd)) {
      return NextResponse.json({ error: "Já feito essa semana!" }, { status: 409 });
    }
  }

  // Streak → XP
  const checkinDates = await getCheckinDatesForActivity(activity_id);
  const streak = computeStreak(checkinDates, activity.frequency);
  const xpEarned = calculateXP(activity.xp_base, streak.current);

  // Persist atomically — XP update paired with checkin insert to avoid double-grant
  let checkin;
  let updatedStats;
  try {
    checkin = await createCheckin(activity_id, xpEarned);
    updatedStats = await addXP(xpEarned);
  } catch (err: unknown) {
    // Unique index violation (race condition / double submit)
    if (typeof err === "object" && err !== null && "code" in err && (err as { code: string }).code === "23505") {
      return NextResponse.json({ error: "Já feito hoje!" }, { status: 409 });
    }
    throw err;
  }
  const levelInfo = getLevelInfo(updatedStats.total_xp);

  if (levelInfo.level !== updatedStats.level) {
    await updateLevel(levelInfo.level);
  }

  // Achievements
  const allCheckins = await getAllCheckins();
  const allDates = allCheckins.map((c) => c.checked_at.slice(0, 10));
  const consecutiveDays = computeConsecutiveDays(allDates);
  const checkinsToday = allDates.filter((d) => d === todayStr).length;

  // Streak for the current activity (returned to client for UI update)
  const newCheckinDates = await getCheckinDatesForActivity(activity_id);
  const newStreak = computeStreak(newCheckinDates, activity.frequency);

  // Max streak across ALL daily/weekly activities (L2: exclude 'free', L3: all activities)
  const allActivities = await getActivities(false);
  let maxStreak = 0;
  for (const act of allActivities) {
    if (act.frequency === "free") continue;
    const dates = act.id === activity_id ? newCheckinDates : await getCheckinDatesForActivity(act.id);
    const s = computeStreak(dates, act.frequency);
    maxStreak = Math.max(maxStreak, s.current, s.longest);
  }

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

  return NextResponse.json({ checkin, xpEarned, newStreak: newStreak.current, levelInfo, newlyUnlocked });
}
