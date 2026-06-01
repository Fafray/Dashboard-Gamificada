import { NextResponse } from "next/server";
import { format, startOfISOWeek, endOfISOWeek } from "date-fns";
import {
  getUserStats,
  getActivities,
  getCheckinDatesForActivity,
  hasCheckinToday,
  hasCheckinThisWeek,
  getXpEarnedToday,
  getAchievements,
} from "@/lib/db";
import { getLevelInfo, computeStreak, getAchievementDef } from "@/lib/gamification";

export async function GET() {
  const now = new Date();
  const todayStr = format(now, "yyyy-MM-dd");
  const weekStart = format(startOfISOWeek(now), "yyyy-MM-dd");
  const weekEnd = format(endOfISOWeek(now), "yyyy-MM-dd");

  const [rawStats, activities, xpToday, unlockedAchievements] = await Promise.all([
    getUserStats(),
    getActivities(),
    getXpEarnedToday(todayStr),
    getAchievements(),
  ]);

  const levelInfo = getLevelInfo(rawStats.total_xp);

  const activitiesWithStatus = await Promise.all(
    activities.map(async (activity) => {
      const [checkinDates, doneToday] = await Promise.all([
        getCheckinDatesForActivity(activity.id),
        activity.frequency === "daily"
          ? hasCheckinToday(activity.id, todayStr)
          : activity.frequency === "weekly"
          ? hasCheckinThisWeek(activity.id, weekStart, weekEnd)
          : Promise.resolve(false),
      ]);
      const streak = computeStreak(checkinDates, activity.frequency);
      return { ...activity, streak, doneToday };
    })
  );

  const achievementsWithDef = unlockedAchievements.map((a) => ({
    ...a,
    ...getAchievementDef(a.key),
  }));

  return NextResponse.json({
    stats: { ...rawStats, ...levelInfo },
    xpToday,
    activities: activitiesWithStatus,
    achievements: achievementsWithDef,
  });
}
