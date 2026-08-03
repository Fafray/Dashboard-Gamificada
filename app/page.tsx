import { isAuthed } from "@/lib/auth";
import { UnlockGate } from "@/components/UnlockGate";
import { format, startOfISOWeek, endOfISOWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  getActivities,
  getCheckinDatesForActivity,
  hasCheckinToday,
  hasCheckinThisWeek,
  getWeeklyCheckinCount,
  getTodayCheckinForActivity,
  getLastCheckinThisWeek,
  archiveExpiredOnce,
  getScheduledTasks,
  getHourlyPlansForDate,
} from "@/lib/db";
import { computeStreak } from "@/lib/streaks";
import { DashboardClient } from "@/components/DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  if (!(await isAuthed())) return <UnlockGate />;
  const now = new Date();
  const todayStr  = format(now, "yyyy-MM-dd");
  const weekStart = format(startOfISOWeek(now), "yyyy-MM-dd");
  const weekEnd   = format(endOfISOWeek(now),   "yyyy-MM-dd");

  await archiveExpiredOnce(todayStr).catch(() => {});

  const activities = await getActivities();

  const todayDow = now.getDay(); // 0=Dom ... 6=Sáb

  // Filtra atividades com dias específicos — só mostra se hoje for um dos dias agendados
  // Missões únicas (once) sempre aparecem (até o prazo)
  const activitiesToShow = activities.filter((a) => {
    if (a.frequency === "once") return true;
    if (!a.scheduled_days) return true;
    const days = a.scheduled_days.split(",").map(Number);
    return days.includes(todayDow);
  });

  const activitiesWithStatus = await Promise.all(
    activitiesToShow.map(async (activity) => {
      const isNxWeek = activity.frequency === "nx_week";

      const [checkinDates, doneRawBase, todayCheckin, weeklyCount] = await Promise.all([
        getCheckinDatesForActivity(activity.id),
        activity.frequency === "daily" || activity.frequency === "once"
          ? hasCheckinToday(activity.id, todayStr)
          : activity.frequency === "weekly"
          ? hasCheckinThisWeek(activity.id, weekStart, weekEnd)
          : isNxWeek
          ? (async () => {
              const count = await getWeeklyCheckinCount(activity.id, weekStart, weekEnd);
              return count >= (activity.weekly_target ?? 1);
            })()
          : Promise.resolve(false),
        // Para weekly: pega o checkin mais recente da semana (não só de hoje)
        activity.frequency === "weekly"
          ? getLastCheckinThisWeek(activity.id, weekStart, weekEnd)
          : getTodayCheckinForActivity(activity.id, todayStr),
        isNxWeek
          ? getWeeklyCheckinCount(activity.id, weekStart, weekEnd)
          : Promise.resolve(null),
      ]);

      // Para hábitos diários com meta numérica: "feito" quando acumulado >= meta
      const doneRaw = (activity.frequency === "daily" && activity.target_value != null)
        ? (Number(todayCheckin?.actual_value ?? 0) >= activity.target_value)
        : doneRawBase;

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
        todayCheckinValue: todayCheckin?.actual_value ?? null,
        weeklyCount: weeklyCount as number | null,
      };
    })
  );

  const allTasks = await getScheduledTasks(false);
  const todayTasks = allTasks.filter((t) => t.due_date <= todayStr);

  const todayPlanRows = await getHourlyPlansForDate(todayStr);
  const todayPlan = todayPlanRows.map((p) => ({ hour: p.hour, text: p.text }));

  const dateLabel = format(now, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR });
  const capitalizedDate = dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1);

  return (
    <DashboardClient
      activities={activitiesWithStatus}
      dateLabel={capitalizedDate}
      todayTasks={todayTasks}
      todayPlan={todayPlan}
    />
  );
}
