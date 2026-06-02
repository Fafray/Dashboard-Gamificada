import { format, startOfISOWeek, endOfISOWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  getUserStats,
  getActivities,
  getCheckinDatesForActivity,
  hasCheckinToday,
  hasCheckinThisWeek,
  getWeeklyCheckinCount,
  getXpEarnedToday,
  getTodayCheckinForActivity,
} from "@/lib/db";
import { getLevelInfo, computeStreak } from "@/lib/gamification";
import { DashboardClient } from "@/components/DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const now = new Date();
  const todayStr  = format(now, "yyyy-MM-dd");
  const weekStart = format(startOfISOWeek(now), "yyyy-MM-dd");
  const weekEnd   = format(endOfISOWeek(now),   "yyyy-MM-dd");

  const [rawStats, activities, xpToday] = await Promise.all([
    getUserStats(),
    getActivities(),
    getXpEarnedToday(todayStr),
  ]);

  const levelInfo = getLevelInfo(rawStats.total_xp);

  const activitiesWithStatus = await Promise.all(
    activities.map(async (activity) => {
      const isNxWeek = activity.frequency === "nx_week";

      const [checkinDates, doneRaw, todayCheckin, weeklyCount] = await Promise.all([
        getCheckinDatesForActivity(activity.id),
        activity.frequency === "daily"
          ? hasCheckinToday(activity.id, todayStr)
          : activity.frequency === "weekly"
          ? hasCheckinThisWeek(activity.id, weekStart, weekEnd)
          : isNxWeek
          ? (async () => {
              const count = await getWeeklyCheckinCount(activity.id, weekStart, weekEnd);
              return count >= (activity.weekly_target ?? 1);
            })()
          : Promise.resolve(false),
        getTodayCheckinForActivity(activity.id, todayStr),
        isNxWeek
          ? getWeeklyCheckinCount(activity.id, weekStart, weekEnd)
          : Promise.resolve(null),
      ]);

      const streak = computeStreak(
        checkinDates,
        activity.frequency,
        now,
        activity.weekly_target ?? undefined
      );

      return {
        ...activity,
        streak,
        doneToday: doneRaw,
        todayCheckinId: todayCheckin?.id ?? null,
        todayCheckinXP: todayCheckin?.xp_earned ?? null,
        weeklyCount: weeklyCount as number | null,
      };
    })
  );

  const dateLabel = format(now, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR });
  const capitalizedDate = dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1);

  return (
    <DashboardClient
      activities={activitiesWithStatus}
      levelInfo={levelInfo}
      xpToday={xpToday}
      dateLabel={capitalizedDate}
    />
  );
}
