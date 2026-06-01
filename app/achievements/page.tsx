import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  getAchievements,
  getTotalCheckinsCount,
  getUserStats,
  getActivities,
  getCheckinDatesForActivity,
  getAllCheckinDatesFlat,
  getCheckinsCountToday,
} from "@/lib/db";
import {
  ACHIEVEMENTS,
  getLevelInfo,
  computeStreak,
  computeConsecutiveDays,
} from "@/lib/gamification";
import { AchievementsGrid } from "./AchievementsGrid";

export const dynamic = "force-dynamic";

export default function AchievementsPage() {
  const now = new Date();
  const todayStr = format(now, "yyyy-MM-dd");

  // Unlocked achievements (keys)
  const unlocked = getAchievements();
  const unlockedMap = new Map(unlocked.map((a) => [a.key, a.unlocked_at]));

  // Current stats for progress
  const totalCheckins = getTotalCheckinsCount();
  const rawStats = getUserStats();
  const { level } = getLevelInfo(rawStats.total_xp);

  // Max streak across all activities
  const activities = getActivities(false);
  let maxStreak = 0;
  for (const act of activities) {
    const dates = getCheckinDatesForActivity(act.id);
    const { current, longest } = computeStreak(dates, act.frequency);
    maxStreak = Math.max(maxStreak, current, longest);
  }

  // Consecutive days with at least 1 activity
  const allDates = getAllCheckinDatesFlat();
  const consecutiveDays = computeConsecutiveDays(allDates);

  // Distinct activities checked today (multitask)
  const checkinsToday = getCheckinsCountToday(todayStr);

  const progressCtx = {
    totalCheckins,
    maxStreak,
    level,
    consecutiveDays,
    checkinsToday,
  };

  // Build enriched achievement list
  const enriched = ACHIEVEMENTS.map((def) => ({
    ...def,
    unlocked: unlockedMap.has(def.key),
    unlockedAt: unlockedMap.get(def.key) ?? null,
    progress: getProgress(def.key, progressCtx),
  }));

  const unlockedCount = enriched.filter((a) => a.unlocked).length;

  return (
    <AchievementsGrid
      achievements={enriched}
      unlockedCount={unlockedCount}
      total={enriched.length}
    />
  );
}

interface Ctx {
  totalCheckins: number;
  maxStreak: number;
  level: number;
  consecutiveDays: number;
  checkinsToday: number;
}

function getProgress(key: string, ctx: Ctx): { current: number; target: number } | null {
  switch (key) {
    case "checkins_10":   return { current: ctx.totalCheckins, target: 10 };
    case "checkins_50":   return { current: ctx.totalCheckins, target: 50 };
    case "checkins_100":  return { current: ctx.totalCheckins, target: 100 };
    case "checkins_365":  return { current: ctx.totalCheckins, target: 365 };
    case "streak_7":      return { current: ctx.maxStreak, target: 7 };
    case "streak_14":     return { current: ctx.maxStreak, target: 14 };
    case "streak_30":     return { current: ctx.maxStreak, target: 30 };
    case "streak_100":    return { current: ctx.maxStreak, target: 100 };
    case "level_5":       return { current: ctx.level, target: 5 };
    case "level_10":      return { current: ctx.level, target: 10 };
    case "level_20":      return { current: ctx.level, target: 20 };
    case "multitask_3":   return { current: ctx.checkinsToday, target: 3 };
    case "consistent_7":  return { current: ctx.consecutiveDays, target: 7 };
    default:              return null; // early_bird, night_owl, first_checkin — no progress bar
  }
}
