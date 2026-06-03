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
  aplicarDecaySeNecessario,
  fecharDiasPassados,
  updateLevel,
} from "@/lib/db";
import { getLevelInfo, computeStreak } from "@/lib/gamification";
import { derivarClasse } from "@/lib/attributes";
import type { Atributos } from "@/lib/attributes";
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
      atributos={atributos}
      pontosDisponiveis={pontosDisponiveis}
      classeInfo={classeInfo}
    />
  );
}
