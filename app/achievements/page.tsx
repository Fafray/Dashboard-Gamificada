import { format } from "date-fns";
import {
  getAchievements,
  getTotalCheckinsCount,
  getUserStats,
  getActivities,
  getCheckinDatesForActivity,
  getAllCheckinDatesFlat,
} from "@/lib/db";
import { getLevelInfo, computeStreak, computeConsecutiveDays } from "@/lib/gamification";
import { TITULOS } from "@/lib/titulos";
import { GradeTitulos } from "@/components/GradeTitulos";
import type { TituloItem } from "@/components/GradeTitulos";
import type { Atributos } from "@/lib/attributes";

export const dynamic = "force-dynamic";

interface ProgressoCtx {
  totalCheckins: number;
  maxStreak: number;
  level: number;
  consecutiveDays: number;
  atributos: Record<string, number>;
}

function getTituloProgresso(
  id: string,
  ctx: ProgressoCtx
): { atual: number; total: number } | null {
  const maxAttr = Math.max(0, ...Object.values(ctx.atributos));
  switch (id) {
    case "primeiro_passo":   return { atual: Math.min(ctx.totalCheckins, 1), total: 1 };
    case "engrenando":       return { atual: ctx.totalCheckins, total: 10 };
    case "despertado":       return { atual: ctx.level, total: 6 };
    case "streak_7":         return { atual: ctx.maxStreak, total: 7 };
    case "consistencia":     return { atual: ctx.consecutiveDays, total: 7 };
    case "meio_centenario":  return { atual: ctx.totalCheckins, total: 50 };
    case "especialista":     return { atual: maxAttr, total: 15 };
    case "streak_14":        return { atual: ctx.maxStreak, total: 14 };
    case "streak_30":        return { atual: ctx.maxStreak, total: 30 };
    case "disciplina_ferro": return { atual: ctx.consecutiveDays, total: 30 };
    case "veterano":         return { atual: ctx.level, total: 10 };
    case "centenario":       return { atual: ctx.totalCheckins, total: 100 };
    case "streak_100":       return { atual: ctx.maxStreak, total: 100 };
    case "mestre":           return { atual: ctx.level, total: 20 };
    case "ano_habitos":      return { atual: ctx.totalCheckins, total: 365 };
    default:                 return null;
  }
}

export default async function TitulosPage() {
  const now = new Date();

  const [unlocked, totalCheckins, rawStats, activities, allDates] = await Promise.all([
    getAchievements(),
    getTotalCheckinsCount(),
    getUserStats(),
    getActivities(false),
    getAllCheckinDatesFlat(),
  ]);

  const unlockedIds = new Set(unlocked.map((a) => a.key));
  const { level } = getLevelInfo(rawStats.total_xp);
  const atributos = (rawStats.atributos ?? { FOR: 0, VIT: 0, AGI: 0, INT: 0, PER: 0 }) as Atributos;

  let maxStreak = 0;
  for (const act of activities) {
    const dates = await getCheckinDatesForActivity(act.id);
    const { current, longest } = computeStreak(dates, act.frequency, now);
    maxStreak = Math.max(maxStreak, current, longest);
  }

  const consecutiveDays = computeConsecutiveDays(allDates);
  const ctx: ProgressoCtx = { totalCheckins, maxStreak, level, consecutiveDays, atributos };

  const titulos: TituloItem[] = TITULOS.map((t) => ({
    id: t.id,
    nome: t.nome,
    desc: t.desc,
    emoji: t.emoji,
    raridade: t.raridade,
    equipavel: t.equipavel,
    desbloqueado: unlockedIds.has(t.id),
    progresso: unlockedIds.has(t.id) ? null : getTituloProgresso(t.id, ctx),
  }));

  const totalDesbloqueados = titulos.filter((t) => t.desbloqueado).length;

  return (
    <GradeTitulos
      titulos={titulos}
      tituloAtivoId={rawStats.titulo_ativo_id}
      totalDesbloqueados={totalDesbloqueados}
    />
  );
}
