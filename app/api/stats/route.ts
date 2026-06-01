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

  const rawStats = getUserStats();
  const levelInfo = getLevelInfo(rawStats.total_xp);
  const xpToday = getXpEarnedToday(todayStr);

  const activities = getActivities();
  const activitiesWithStatus = activities.map((activity) => {
    const checkinDates = getCheckinDatesForActivity(activity.id);
    const streak = computeStreak(checkinDates, activity.frequency);

    let doneToday = false;
    if (activity.frequency === "daily") {
      doneToday = hasCheckinToday(activity.id, todayStr);
    } else if (activity.frequency === "weekly") {
      doneToday = hasCheckinThisWeek(activity.id, weekStart, weekEnd);
    }

    return {
      ...activity,
      streak,
      doneToday,
    };
  });

  const unlockedAchievements = getAchievements();
  const achievementsWithDef = unlockedAchievements.map((a) => ({
    ...a,
    ...getAchievementDef(a.key),
  }));

  return NextResponse.json({
    stats: {
      ...rawStats,
      ...levelInfo,
    },
    xpToday,
    activities: activitiesWithStatus,
    achievements: achievementsWithDef,
  });
}
