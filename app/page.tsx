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

export default function DashboardPage() {
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
