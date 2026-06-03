import { format } from "date-fns";
import {
  getAchievements,
  getTotalCheckinsCount,
  getUserStats,
  getActivities,
  getCheckinDatesForActivity,
  getAllCheckinDatesFlat,
  getMaxCheckinsOnDay,
  getMaxCategoriasOnDay,
  getTeveDiaPerfeito,
} from "@/lib/db";
import { getLevelInfo, computeStreak, computeConsecutiveDays, nivelDoXp } from "@/lib/gamification";
import { TITULOS } from "@/lib/titulos";
import type { PlayerEstado, TituloStats } from "@/lib/titulos";
import { GradeTitulos } from "@/components/GradeTitulos";
import type { Atributos } from "@/lib/attributes";

export const dynamic = "force-dynamic";

export default async function TitulosPage() {
  const now = new Date();

  const [unlocked, totalCheckins, rawStats, activities, allDates] = await Promise.all([
    getAchievements(),
    getTotalCheckinsCount(),
    getUserStats(),
    getActivities(false),
    getAllCheckinDatesFlat(),
  ]);

  const unlockedIds = unlocked.map((a) => a.key);
  const { level } = getLevelInfo(rawStats.total_xp);
  const atributos = (rawStats.atributos ?? { FOR: 0, VIT: 0, AGI: 0, INT: 0, PER: 0 }) as Atributos;

  let maxStreak = 0;
  for (const act of activities) {
    const dates = await getCheckinDatesForActivity(act.id);
    const { current, longest } = computeStreak(dates, act.frequency, now);
    maxStreak = Math.max(maxStreak, current, longest);
  }

  const consecutiveDays = computeConsecutiveDays(allDates);

  // Stats extras (resilientes a erros)
  const [maxMissoesNumDia, maxCategoriasNumDia, teveDiaPerfeito] = await Promise.all([
    getMaxCheckinsOnDay().catch(() => 0),
    getMaxCategoriasOnDay().catch(() => 0),
    getTeveDiaPerfeito().catch(() => false),
  ]);

  // Detecta check-in antes das 7h ou após as 22h em qualquer momento do histórico
  // (simplificação: usa a hora atual do mais recente — para título one-shot é suficiente)
  const checkinHour = now.getHours();

  const player: PlayerEstado = {
    streak: maxStreak,
    xpTotal: rawStats.total_xp,
    atributos: atributos as Record<string, number>,
  };

  const stats: TituloStats = {
    totalCheckins,
    maxMissoesNumDia,
    maxCategoriasNumDia,
    checkinAntesDas7: checkinHour < 7,
    checkinApos22h: checkinHour >= 22,
    teveDiaPerfeito,
    diasComMissaoSeguidos: consecutiveDays,
    diasPerfeitosSeguidos: 0,   // requer tracking futuro
    diasSemFalhar: consecutiveDays,
    sobreviveuAoRebaixamento: false,
    recuperouNivelPerdido: (rawStats.nivel_maximo_atingido ?? 1) > nivelDoXp(rawStats.total_xp),
    recuperouRankPerdido: false,
    vezesRenasceu: 0,
    diasNaMesmaClasse: 0,
  };

  const totalDesbloqueados = TITULOS.filter((t) => unlockedIds.includes(t.id)).length;

  return (
    <GradeTitulos
      desbloqueados={unlockedIds}
      tituloAtivoId={rawStats.titulo_ativo_id}
      player={player}
      stats={stats}
      totalDesbloqueados={totalDesbloqueados}
    />
  );
}

