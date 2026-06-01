import { NextResponse } from "next/server";
import { format, startOfISOWeek, endOfISOWeek } from "date-fns";
import {
  getActivity,
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

  if (date) {
    const checkins = getCheckinsByDate(date);
    return NextResponse.json(checkins);
  }

  return NextResponse.json([]);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { activity_id } = body;

  if (!activity_id) {
    return NextResponse.json({ error: "activity_id is required" }, { status: 400 });
  }

  const activity = getActivity(activity_id);
  if (!activity) {
    return NextResponse.json({ error: "Activity not found" }, { status: 404 });
  }

  const now = new Date();
  const todayStr = format(now, "yyyy-MM-dd");

  // Duplicate check
  if (activity.frequency === "daily") {
    if (hasCheckinToday(activity_id, todayStr)) {
      return NextResponse.json({ error: "Já feito hoje!" }, { status: 409 });
    }
  } else if (activity.frequency === "weekly") {
    const weekStart = format(startOfISOWeek(now), "yyyy-MM-dd");
    const weekEnd = format(endOfISOWeek(now), "yyyy-MM-dd");
    if (hasCheckinThisWeek(activity_id, weekStart, weekEnd)) {
      return NextResponse.json({ error: "Já feito essa semana!" }, { status: 409 });
    }
  }

  // Compute current streak to determine XP bonus
  const checkinDates = getCheckinDatesForActivity(activity_id);
  const streak = computeStreak(checkinDates, activity.frequency);
  const xpEarned = calculateXP(activity.xp_base, streak.current);

  // Create check-in
  const checkin = createCheckin(activity_id, xpEarned);

  // Update total XP
  const updatedStats = addXP(xpEarned);
  const levelInfo = getLevelInfo(updatedStats.total_xp);

  // Update level in DB if it changed
  if (levelInfo.level !== updatedStats.level) {
    updateLevel(levelInfo.level);
  }

  // Check achievements
  const newCheckinDates = getCheckinDatesForActivity(activity_id);
  const newStreak = computeStreak(newCheckinDates, activity.frequency);
  const allCheckins = getAllCheckins();
  const allDates = allCheckins.map((c) => format(new Date(c.checked_at), "yyyy-MM-dd"));
  const consecutiveDays = computeConsecutiveDays(allDates);
  const checkinsToday = allDates.filter((d) => d === todayStr).length;

  const ctx = {
    totalCheckins: getTotalCheckinsCount(),
    maxStreak: Math.max(newStreak.current, newStreak.longest),
    level: levelInfo.level,
    checkinsToday,
    checkinHour: now.getHours(),
    consecutiveDays,
  };

  const earnedKeys = evaluateAchievements(ctx);
  const newlyUnlocked: { key: string; name: string; description: string; emoji: string }[] = [];

  for (const key of earnedKeys) {
    const result = unlockAchievement(key);
    if (result) {
      const def = getAchievementDef(key);
      if (def) {
        newlyUnlocked.push(def);
      }
    }
  }

  return NextResponse.json({
    checkin,
    xpEarned,
    newStreak: newStreak.current,
    levelInfo,
    newlyUnlocked,
  });
}
