import { format, startOfISOWeek, endOfISOWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  getUserStats,
  getActivities,
  getCheckinDatesForActivity,
  hasCheckinToday,
  hasCheckinThisWeek,
  getXpEarnedToday,
} from "@/lib/db";
import { getLevelInfo, computeStreak } from "@/lib/gamification";
import { DashboardClient } from "@/components/DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const now = new Date();
  const todayStr = format(now, "yyyy-MM-dd");
  const weekStart = format(startOfISOWeek(now), "yyyy-MM-dd");
  const weekEnd = format(endOfISOWeek(now), "yyyy-MM-dd");

  const [rawStats, activities, xpToday] = await Promise.all([
    getUserStats(),
    getActivities(),
    getXpEarnedToday(todayStr),
  ]);

  const levelInfo = getLevelInfo(rawStats.total_xp);

  const activitiesWithStatus = await Promise.all(
    activities.map(async (activity) => {
      const [checkinDates, doneRaw] = await Promise.all([
        getCheckinDatesForActivity(activity.id),
        activity.frequency === "daily"
          ? hasCheckinToday(activity.id, todayStr)
          : activity.frequency === "weekly"
          ? hasCheckinThisWeek(activity.id, weekStart, weekEnd)
          : Promise.resolve(false),
      ]);
      const streak = computeStreak(checkinDates, activity.frequency);
      return { ...activity, streak, doneToday: doneRaw };
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
