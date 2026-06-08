import { NextResponse } from "next/server";
import { format, startOfISOWeek, endOfISOWeek } from "date-fns";
import {
  getActivity,
  getActivities,
  createCheckin,
  hasCheckinToday,
  hasCheckinThisWeek,
  getWeeklyCheckinCount,
  getCheckinDatesForActivity,
  getAllCheckins,
  getTotalCheckinsCount,
  addXP,
  updateLevel,
  unlockAchievement,
  hasAchievement,
  getCheckinsByDate,
  getUserStats,
  sincronizarNivelMaximo,
  setUltimaAtividade,
  registrarEvento,
  getXpSumTodayExcluding,
  getTotalGraduationCount,
} from "@/lib/db";
import {
  computeStreak,
  calculateXP,
  getLevelInfo,
  computeConsecutiveDays,
  nivelDoXp,
  rankDoNivel,
} from "@/lib/gamification";
import { xpComBonus } from "@/lib/attributes";
import type { Atributos } from "@/lib/attributes";
import { verificarTitulos, bonusXpDoTitulo, getTituloDef } from "@/lib/titulos";
import type { TituloStats, PlayerEstado } from "@/lib/titulos";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  if (date) return NextResponse.json(await getCheckinsByDate(date));
  return NextResponse.json([]);
}

function graduationThreshold(graduationCount: number): number {
  if (graduationCount === 0) return 21;
  if (graduationCount === 1) return 42;
  return 66;
}

export async function POST(req: Request) {
  const body = await req.json();
  const { activity_id, actual_value, checkin_level } = body;

  if (!activity_id) {
    return NextResponse.json({ error: "activity_id is required" }, { status: 400 });
  }

  const activity = await getActivity(activity_id);
  if (!activity) {
    return NextResponse.json({ error: "Activity not found" }, { status: 404 });
  }

  const now = new Date();
  const todayStr = format(now, "yyyy-MM-dd");
  const weekStart = format(startOfISOWeek(now), "yyyy-MM-dd");
  const weekEnd   = format(endOfISOWeek(now),   "yyyy-MM-dd");

  // Duplicate / quota check per frequency
  if (activity.frequency === "daily") {
    if (await hasCheckinToday(activity_id, todayStr)) {
      return NextResponse.json({ error: "Já feito hoje!" }, { status: 409 });
    }
  } else if (activity.frequency === "weekly") {
    if (await hasCheckinThisWeek(activity_id, weekStart, weekEnd)) {
      return NextResponse.json({ error: "Já feito essa semana!" }, { status: 409 });
    }
  } else if (activity.frequency === "nx_week") {
    if (await hasCheckinToday(activity_id, todayStr)) {
      return NextResponse.json({ error: "Já registrado hoje!" }, { status: 409 });
    }
    const count = await getWeeklyCheckinCount(activity_id, weekStart, weekEnd);
    if (count >= (activity.weekly_target ?? 1)) {
      return NextResponse.json({ error: "Meta semanal já atingida!" }, { status: 409 });
    }
  }

  // Streak → XP (multStreak + bônus de atributo + bônus de título + level bonus)
  const checkinDates  = await getCheckinDatesForActivity(activity_id);
  const streak        = computeStreak(checkinDates, activity.frequency, now, activity.weekly_target ?? undefined);
  const playerStats   = await getUserStats();
  const atributos     = (playerStats.atributos ?? { FOR: 0, VIT: 0, AGI: 0, INT: 0, PER: 0 }) as Atributos;
  const tituloBonus   = bonusXpDoTitulo(playerStats.titulo_ativo_id, activity.categoria);
  const xpBase        = calculateXP(activity.xp_base, streak.current);
  const levelMult     = checkin_level === "beyond" ? 1.25 : 1.0;
  const xpEarned      = Math.round(xpComBonus(xpBase, activity.categoria, atributos) * (1 + tituloBonus) * levelMult);

  let checkin;
  let updatedStats;
  try {
    checkin      = await createCheckin(activity_id, xpEarned, actual_value ?? null, undefined, checkin_level ?? null);
    updatedStats = await addXP(xpEarned);
  } catch (err: unknown) {
    if (typeof err === "object" && err !== null && "code" in err && (err as { code: string }).code === "23505") {
      return NextResponse.json({ error: "Já feito hoje!" }, { status: 409 });
    }
    throw err;
  }

  const levelInfo = getLevelInfo(updatedStats.total_xp);
  await updateLevel(levelInfo.level);
  await sincronizarNivelMaximo(levelInfo.level);
  await setUltimaAtividade(now.toISOString());

  // Eventos de mudança de nível / rank
  const oldLevel = nivelDoXp(playerStats.total_xp);
  const newLevel = levelInfo.level;
  if (newLevel !== oldLevel) {
    const oldRank = rankDoNivel(oldLevel);
    const newRank = rankDoNivel(newLevel);
    if (newLevel > oldLevel) {
      await registrarEvento("nivel_up", `Subiu para Nível ${newLevel}`, { nivel: newLevel, rank: newRank });
      if (newRank !== oldRank) {
        await registrarEvento("rank_up", `Promovido para ${newRank}-RANK`, { nivel: newLevel, rank: newRank });
      }
    } else {
      await registrarEvento("nivel_down", `Caiu para Nível ${newLevel}`, { nivel: newLevel, rank: newRank });
      if (newRank !== oldRank) {
        await registrarEvento("rank_down", `Rebaixado para ${newRank}-RANK`, { nivel: newLevel, rank: newRank });
      }
    }
  }

  // Verificar títulos
  const allCheckins     = await getAllCheckins();
  const allDates        = allCheckins.map((c) => c.checked_at.slice(0, 10));
  const consecutiveDays = computeConsecutiveDays(allDates);
  const checkinsToday   = allDates.filter((d) => d === todayStr).length;

  const newCheckinDates = await getCheckinDatesForActivity(activity_id);
  const newStreak       = computeStreak(newCheckinDates, activity.frequency, now, activity.weekly_target ?? undefined);

  const allActivities = await getActivities(false);
  let maxStreak = 0;
  for (const act of allActivities) {
    if (act.frequency === "free") continue;
    const dates = act.id === activity_id ? newCheckinDates : await getCheckinDatesForActivity(act.id);
    const s = computeStreak(dates, act.frequency, now, act.weekly_target ?? undefined);
    maxStreak = Math.max(maxStreak, s.current, s.longest);
  }

  // Weekly count for nx_week
  const weeklyCount = activity.frequency === "nx_week"
    ? await getWeeklyCheckinCount(activity_id, weekStart, weekEnd)
    : null;

  const totalCheckins = await getTotalCheckinsCount();
  const desbloqueados = (await import("@/lib/db").then((m) => m.getAchievements()))
    .map((a) => a.key);

  const playerEstado: PlayerEstado = {
    streak:    maxStreak,
    xpTotal:   updatedStats.total_xp,
    atributos: atributos as Record<string, number>,
  };

  const tituloStats: TituloStats = {
    totalCheckins,
    maxMissoesNumDia:     checkinsToday,          // proxy: max hoje (simplificado)
    maxCategoriasNumDia:  0,                       // calculado na página de títulos
    checkinAntesDas7:     now.getHours() < 7,
    checkinApos22h:       now.getHours() >= 22,
    teveDiaPerfeito:      false,                   // calculado na página de títulos
    diasComMissaoSeguidos: consecutiveDays,
    diasPerfeitosSeguidos: 0,
    diasSemFalhar:        consecutiveDays,
    sobreviveuAoRebaixamento: false,
    recuperouNivelPerdido: (updatedStats.nivel_maximo_atingido ?? 1) > levelInfo.level,
    recuperouRankPerdido: false,
    vezesRenasceu:        0,
    diasNaMesmaClasse:    0,
  };

  const earnedKeys = verificarTitulos(desbloqueados, playerEstado, tituloStats);
  const newlyUnlocked: { key: string; name: string; description: string; emoji: string }[] = [];
  for (const key of earnedKeys) {
    const result = await unlockAchievement(key);
    if (result) {
      const def = getTituloDef(key);
      if (def) {
        newlyUnlocked.push({ key: def.id, name: def.nome, description: def.desc, emoji: def.emoji });
        await registrarEvento("titulo", `${def.emoji} Título desbloqueado: ${def.nome}`, { titulo_id: key });
      }
    }
  }

  // Micro-hábito: achievement primeiro mínimo
  if (checkin_level === "minimum" && !(await hasAchievement("micro_primeiro_minimo"))) {
    const r = await unlockAchievement("micro_primeiro_minimo");
    if (r) {
      const def = getTituloDef("micro_primeiro_minimo");
      if (def) {
        newlyUnlocked.push({ key: def.id, name: def.nome, description: def.desc, emoji: def.emoji });
        await registrarEvento("titulo", `${def.emoji} Título desbloqueado: ${def.nome}`, { titulo_id: def.id });
      }
    }
  }

  // Keystone bonus: +10% do XP total das outras atividades do dia
  let keystoneBonusXP = 0;
  if (activity.is_keystone) {
    const otherXpToday = await getXpSumTodayExcluding(activity_id, todayStr);
    keystoneBonusXP = Math.round(otherXpToday * 0.10);
    if (keystoneBonusXP > 0) {
      updatedStats = await addXP(keystoneBonusXP);
      await registrarEvento("keystone_bonus", `⚓ Bônus âncora: +${keystoneBonusXP} XP`, { bonus: keystoneBonusXP });
    }
  }

  // Verificação de graduação
  const graduation_available = !!(
    activity.micro_version &&
    newStreak.current === graduationThreshold(activity.graduation_count)
  );

  return NextResponse.json({
    checkin,
    xpEarned: xpEarned + keystoneBonusXP,
    keystoneBonusXP,
    newStreak: newStreak.current,
    weeklyCount,
    levelInfo,
    newlyUnlocked,
    graduation_available,
  });
}
