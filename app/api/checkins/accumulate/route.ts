import { NextResponse } from "next/server";
import { format, startOfISOWeek, endOfISOWeek } from "date-fns";
import {
  getActivity,
  getCheckinDatesForActivity,
  accumulateCheckinValue,
  setCheckinXp,
  addXP,
  updateLevel,
  getUserStats,
  sincronizarNivelMaximo,
  setUltimaAtividade,
} from "@/lib/db";
import {
  computeStreak,
  calculateXP,
  getLevelInfo,
} from "@/lib/gamification";
import { xpComBonus } from "@/lib/attributes";
import { forStreakBoosted, agiMorningBonus, intStudyBonus, getDailyBonusMissionId, perBonusMissionBonus } from "@/lib/perks";
import { bonusXpDoTitulo } from "@/lib/titulos";
import type { Atributos } from "@/lib/attributes";

export async function POST(req: Request) {
  const body = await req.json();
  const { activity_id, increment } = body;

  if (!activity_id || typeof increment !== "number" || increment <= 0) {
    return NextResponse.json({ error: "activity_id and positive increment required" }, { status: 400 });
  }

  const activity = await getActivity(activity_id);
  if (!activity || !activity.target_value) {
    return NextResponse.json({ error: "Activity not found or has no target" }, { status: 404 });
  }

  const now = new Date();
  const todayStr = format(now, "yyyy-MM-dd");

  // Accumulate the value
  const result = await accumulateCheckinValue(activity_id, todayStr, increment);
  const newTotal = result.actual_value;
  const targetMet = newTotal >= activity.target_value;
  const xpAlreadyAwarded = result.xp_earned > 0;

  let xpEarned = 0;
  let levelInfo = null;

  // Award XP only when target first reached
  if (targetMet && !xpAlreadyAwarded) {
    const playerStats = await getUserStats();
    const atributos = (playerStats.atributos ?? { FOR: 0, VIT: 0, AGI: 0, INT: 0, PER: 0 }) as Atributos;
    const checkinDates = await getCheckinDatesForActivity(activity_id);
    const streak = computeStreak(checkinDates, activity.frequency, now, activity.weekly_target ?? undefined);
    const tituloBonus = bonusXpDoTitulo(playerStats.titulo_ativo_id, activity.categoria);
    const effectiveStreak = forStreakBoosted(streak.current, atributos, activity.categoria);
    const xpBase = calculateXP(activity.xp_base, effectiveStreak);
    const agiBonus = agiMorningBonus(atributos, now.getHours());
    const intBonus = intStudyBonus(atributos, activity.categoria);
    const allActivities = await import("@/lib/db").then((m) => m.getActivities(false));
    const bonusMissionId = getDailyBonusMissionId(allActivities.map((a) => a.id), now);
    const perBonus = perBonusMissionBonus(atributos, activity_id, bonusMissionId);

    xpEarned = Math.round(
      xpComBonus(xpBase, activity.categoria, atributos)
      * (1 + tituloBonus)
      * (1 + agiBonus + intBonus + perBonus)
    );

    await setCheckinXp(result.id, xpEarned);
    const updatedStats = await addXP(xpEarned);
    const lInfo = getLevelInfo(updatedStats.total_xp);
    await updateLevel(lInfo.level);
    await sincronizarNivelMaximo(lInfo.level);
    await setUltimaAtividade(now.toISOString());
    levelInfo = lInfo;
  } else {
    const stats = await getUserStats();
    levelInfo = getLevelInfo(stats.total_xp);
  }

  return NextResponse.json({
    total: newTotal,
    targetReached: targetMet,
    xpEarned,
    checkinId: result.id,
    levelInfo,
  });
}
