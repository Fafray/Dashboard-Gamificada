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
  getLastCheckinThisWeek,
  aplicarDecaySeNecessario,
  fecharDiasPassados,
  updateLevel,
  getScheduledTasks,
} from "@/lib/db";
import { getLevelInfo, computeStreak } from "@/lib/gamification";
import { derivarClasse } from "@/lib/attributes";
import type { Atributos } from "@/lib/attributes";
import { getDailyBonusMissionId } from "@/lib/perks";
import { DashboardClient } from "@/components/DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const now = new Date();
  const todayStr  = format(now, "yyyy-MM-dd");
  const weekStart = format(startOfISOWeek(now), "yyyy-MM-dd");
  const weekEnd   = format(endOfISOWeek(now),   "yyyy-MM-dd");

  // Fecha dias passados sem checkin (penalidade) e aplica decay por inatividade
  const statsPreDecay = await getUserStats();
  await fecharDiasPassados().catch(() => {});
  await aplicarDecaySeNecessario(statsPreDecay.titulo_ativo_id);

  const [rawStats, activities, xpToday] = await Promise.all([
    getUserStats(),
    getActivities(),
    getXpEarnedToday(todayStr),
  ]);

  // Re-derivar nível após decay (pode ter caído)
  const { nivelDoXp: calcNivel } = await import("@/lib/gamification");
  const nivelAtual = calcNivel(rawStats.total_xp);
  if (nivelAtual !== rawStats.level) await updateLevel(nivelAtual);

  const atributos = (rawStats.atributos ?? { FOR: 0, VIT: 0, AGI: 0, INT: 0, PER: 0 }) as Atributos;
  const classeInfo = derivarClasse(atributos);
  const pontosDisponiveis = rawStats.pontos_disponiveis ?? 0;

  const levelInfo = getLevelInfo(rawStats.total_xp);

  const todayDow = now.getDay(); // 0=Dom ... 6=Sáb

  // Filtra atividades com dias específicos — só mostra se hoje for um dos dias agendados
  const activitiesToShow = activities.filter((a) => {
    if (!a.scheduled_days) return true;
    const days = a.scheduled_days.split(",").map(Number);
    return days.includes(todayDow);
  });

  const activitiesWithStatus = await Promise.all(
    activitiesToShow.map(async (activity) => {
      const isNxWeek = activity.frequency === "nx_week";

      const [checkinDates, doneRawBase, todayCheckin, weeklyCount] = await Promise.all([
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
        // Para weekly: pega o checkin mais recente da semana (não só de hoje)
        activity.frequency === "weekly"
          ? getLastCheckinThisWeek(activity.id, weekStart, weekEnd)
          : getTodayCheckinForActivity(activity.id, todayStr),
        isNxWeek
          ? getWeeklyCheckinCount(activity.id, weekStart, weekEnd)
          : Promise.resolve(null),
      ]);

      // Para hábitos diários com meta numérica: "feito" só quando acumulado >= meta
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
        todayCheckinXP: todayCheckin?.xp_earned ?? null,
        todayCheckinValue: todayCheckin?.actual_value ?? null,
        weeklyCount: weeklyCount as number | null,
      };
    })
  );

  const bonusMissionId = atributos.PER >= 5
    ? getDailyBonusMissionId(activitiesWithStatus.map((a) => a.id), now)
    : null;

  const allTasks = await getScheduledTasks(false);
  const todayTasks = allTasks.filter((t) => t.due_date <= todayStr);

  const dateLabel = format(now, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR });
  const capitalizedDate = dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1);

  return (
    <DashboardClient
      activities={activitiesWithStatus}
      levelInfo={levelInfo}
      xpToday={xpToday}
      dateLabel={capitalizedDate}
      atributos={atributos}
      pontosDisponiveis={pontosDisponiveis}
      classeInfo={classeInfo}
      bonusMissionId={bonusMissionId}
      todayTasks={todayTasks}
    />
  );
}
