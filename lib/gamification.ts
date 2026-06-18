import { format, subDays, subWeeks, startOfISOWeek, parseISO, differenceInCalendarDays, differenceInCalendarWeeks } from "date-fns";
import type { Frequency } from "./db";
import { BALANCE } from "./config/balance";

// ─── Level System (curva: degrau N → N+1 = floor(100 * N^1.5)) ──────────────

export function xpDoDegrau(n: number): number {
  return Math.floor(100 * Math.pow(n, 1.5));
}

export function xpAcumuladoAteNivel(n: number): number {
  if (n <= 1) return 0;
  let total = 0;
  for (let k = 1; k < n; k++) total += xpDoDegrau(k);
  return total;
}

export function nivelDoXp(xpTotal: number): number {
  let n = 1;
  while (xpTotal >= xpAcumuladoAteNivel(n + 1)) n++;
  return n;
}

// Rank derivado do nível
const RANKS_CONFIG = [
  { rank: "E", ate: 5 },  { rank: "D", ate: 10 }, { rank: "C", ate: 18 },
  { rank: "B", ate: 28 }, { rank: "A", ate: 40 }, { rank: "S", ate: Infinity },
] as const;

export function rankDoNivel(n: number): string {
  return RANKS_CONFIG.find((r) => n <= r.ate)?.rank ?? "S";
}

// Quanto XP falta perder pra cair de rank
export function xpAteRebaixar(xpTotal: number): { rankAbaixo: string; xp: number } | null {
  const nivel = nivelDoXp(xpTotal);
  const rankAtual = rankDoNivel(nivel);
  let nivelMin = nivel;
  while (nivelMin > 1 && rankDoNivel(nivelMin - 1) === rankAtual) nivelMin--;
  if (nivelMin <= 1) return null;
  const xpLimite = xpAcumuladoAteNivel(nivelMin);
  if (xpTotal <= xpLimite) return null;
  return { rankAbaixo: rankDoNivel(nivelMin - 1), xp: xpTotal - xpLimite };
}

// Streak multiplier
export function multStreak(streak: number): number {
  const { tier3Min, tier3Mult, tier2Min, tier2Mult, tier1Min, tier1Mult } = BALANCE.streak;
  if (streak >= tier3Min) return tier3Mult;
  if (streak >= tier2Min) return tier2Mult;
  if (streak >= tier1Min) return tier1Mult;
  return 1.0;
}

// getLevelThreshold / getXpToNextLevel mantidos p/ compatibilidade
export function getLevelThreshold(level: number): number {
  return xpAcumuladoAteNivel(level);
}
export function getXpToNextLevel(level: number): number {
  return xpDoDegrau(level);
}

export interface LevelInfo {
  level: number;
  totalXP: number;
  currentLevelXP: number;
  nextLevelXP: number;
  progress: number;
}

export function getLevelInfo(totalXP: number): LevelInfo {
  const level = nivelDoXp(totalXP);
  const currentThreshold = xpAcumuladoAteNivel(level);
  const nextLevelXP = xpDoDegrau(level);
  const currentLevelXP = totalXP - currentThreshold;
  const progress = Math.min(100, Math.floor((currentLevelXP / nextLevelXP) * 100));
  return { level, totalXP, currentLevelXP, nextLevelXP, progress };
}

// ─── Streak Computation ───────────────────────────────────────────────────────
// Takes an array of 'YYYY-MM-DD' date strings (may have duplicates)
// Returns { current, longest }

export interface StreakResult {
  current: number;
  longest: number;
}

export function computeDailyStreak(checkinDates: string[], now: Date = new Date()): StreakResult {
  if (checkinDates.length === 0) return { current: 0, longest: 0 };

  const uniqueDates = [...new Set(checkinDates)].sort().reverse();
  const today = format(now, "yyyy-MM-dd");
  const yesterday = format(subDays(now, 1), "yyyy-MM-dd");

  // Current streak
  let current = 0;
  const mostRecent = uniqueDates[0];

  if (mostRecent === today || mostRecent === yesterday) {
    let expected = mostRecent;
    for (const date of uniqueDates) {
      if (date === expected) {
        current++;
        expected = format(subDays(parseISO(expected), 1), "yyyy-MM-dd");
      } else if (date < expected) {
        break;
      }
    }
  }

  // Longest streak
  let longest = 0;
  let temp = 1;
  for (let i = 1; i < uniqueDates.length; i++) {
    const diff = differenceInCalendarDays(parseISO(uniqueDates[i - 1]), parseISO(uniqueDates[i]));
    if (diff === 1) {
      temp++;
    } else {
      longest = Math.max(longest, temp);
      temp = 1;
    }
  }
  longest = Math.max(longest, temp);

  return { current, longest };
}

export function computeWeeklyStreak(checkinDates: string[], now: Date = new Date()): StreakResult {
  if (checkinDates.length === 0) return { current: 0, longest: 0 };

  // Normalize to ISO week start (Monday)
  const weekStarts = [
    ...new Set(checkinDates.map((d) => format(startOfISOWeek(parseISO(d)), "yyyy-MM-dd"))),
  ].sort().reverse();

  const thisWeekStart = format(startOfISOWeek(now), "yyyy-MM-dd");
  const lastWeekStart = format(startOfISOWeek(subWeeks(now, 1)), "yyyy-MM-dd");

  // Current streak
  let current = 0;
  const mostRecent = weekStarts[0];

  if (mostRecent === thisWeekStart || mostRecent === lastWeekStart) {
    let expected = mostRecent;
    for (const week of weekStarts) {
      if (week === expected) {
        current++;
        expected = format(subWeeks(parseISO(expected), 1), "yyyy-MM-dd");
      } else {
        break;
      }
    }
  }

  // Longest streak
  let longest = 0;
  let temp = 1;
  for (let i = 1; i < weekStarts.length; i++) {
    const diff = differenceInCalendarWeeks(parseISO(weekStarts[i - 1]), parseISO(weekStarts[i]), {
      weekStartsOn: 1,
    });
    if (diff === 1) {
      temp++;
    } else {
      longest = Math.max(longest, temp);
      temp = 1;
    }
  }
  longest = Math.max(longest, temp);

  return { current, longest };
}

export function computeNxWeekStreak(
  checkinDates: string[],
  weeklyTarget: number,
  now: Date = new Date()
): StreakResult {
  if (checkinDates.length === 0) return { current: 0, longest: 0 };

  // Count check-ins per ISO week
  const weekCounts = new Map<string, number>();
  for (const date of checkinDates) {
    const weekStart = format(startOfISOWeek(parseISO(date)), "yyyy-MM-dd");
    weekCounts.set(weekStart, (weekCounts.get(weekStart) ?? 0) + 1);
  }

  // Weeks that met the target
  const completedWeeks = [...weekCounts.entries()]
    .filter(([, count]) => count >= weeklyTarget)
    .map(([week]) => week)
    .sort()
    .reverse();

  if (completedWeeks.length === 0) return { current: 0, longest: 0 };

  const thisWeekStart = format(startOfISOWeek(now), "yyyy-MM-dd");
  const lastWeekStart = format(startOfISOWeek(subWeeks(now, 1)), "yyyy-MM-dd");

  let current = 0;
  const mostRecent = completedWeeks[0];
  if (mostRecent === thisWeekStart || mostRecent === lastWeekStart) {
    let expected = mostRecent;
    for (const week of completedWeeks) {
      if (week === expected) {
        current++;
        expected = format(subWeeks(parseISO(expected), 1), "yyyy-MM-dd");
      } else break;
    }
  }

  let longest = 0;
  let temp = 1;
  for (let i = 1; i < completedWeeks.length; i++) {
    const diff = differenceInCalendarWeeks(
      parseISO(completedWeeks[i - 1]),
      parseISO(completedWeeks[i]),
      { weekStartsOn: 1 }
    );
    if (diff === 1) temp++;
    else { longest = Math.max(longest, temp); temp = 1; }
  }
  longest = Math.max(longest, temp);

  return { current, longest };
}

export function computeStreak(
  checkinDates: string[],
  frequency: Frequency,
  now: Date = new Date(),
  weeklyTarget?: number
): StreakResult {
  if (frequency === "free")    return { current: checkinDates.length, longest: checkinDates.length };
  if (frequency === "weekly")  return computeWeeklyStreak(checkinDates, now);
  if (frequency === "nx_week") return computeNxWeekStreak(checkinDates, weeklyTarget ?? 1, now);
  return computeDailyStreak(checkinDates, now);
}

// ─── XP Calculation ───────────────────────────────────────────────────────────

export function calculateXP(baseXP: number, currentStreak: number): number {
  return Math.ceil(baseXP * multStreak(currentStreak));
}

// ─── Streak Milestones ────────────────────────────────────────────────────────

export interface StreakMilestone {
  days: number;
  name: string;
  emoji: string;
}

const STREAK_MILESTONES: StreakMilestone[] = [
  { days: 3,   name: "Aquecendo",      emoji: "🔥" },
  { days: 7,   name: "Uma Semana!",    emoji: "⚡" },
  { days: 14,  name: "Duas Semanas!",  emoji: "💫" },
  { days: 30,  name: "Um Mês!",        emoji: "💎" },
  { days: 100, name: "Centurião!",     emoji: "👑" },
];

export function getStreakMilestone(streak: number): StreakMilestone | null {
  return STREAK_MILESTONES.find((m) => m.days === streak) ?? null;
}

// ─── Daily Completion Bonus ───────────────────────────────────────────────────

export const COMBO_BASE = BALANCE.combo.base;

// Combo XP: base + AGI contributes +1 per N points invested
export function computeComboXP(agi: number): number {
  return COMBO_BASE + Math.floor(agi / BALANCE.combo.agiPerPoints);
}

export function getDailyCompletionBonus(activitiesCount: number): number {
  if (activitiesCount < 2) return 0;
  return activitiesCount * 10;
}

// ─── Achievements ─────────────────────────────────────────────────────────────

export interface AchievementDef {
  key: string;
  name: string;
  description: string;
  emoji: string;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    key: "first_checkin",
    name: "Primeiro Passo",
    description: "Complete sua primeira atividade",
    emoji: "🌱",
  },
  {
    key: "streak_7",
    name: "Uma Semana",
    description: "7 dias seguidos em qualquer atividade",
    emoji: "🔥",
  },
  {
    key: "streak_14",
    name: "Duas Semanas",
    description: "14 dias seguidos em qualquer atividade",
    emoji: "⚡",
  },
  {
    key: "streak_30",
    name: "Um Mês",
    description: "30 dias seguidos em qualquer atividade",
    emoji: "💎",
  },
  {
    key: "streak_100",
    name: "Centurião",
    description: "100 dias seguidos em qualquer atividade",
    emoji: "👑",
  },
  {
    key: "checkins_10",
    name: "Engrenando",
    description: "10 check-ins no total",
    emoji: "⚙️",
  },
  {
    key: "checkins_50",
    name: "Meio Centenário",
    description: "50 check-ins no total",
    emoji: "🎯",
  },
  {
    key: "checkins_100",
    name: "Centenário",
    description: "100 check-ins no total",
    emoji: "💯",
  },
  {
    key: "checkins_365",
    name: "Um Ano de Hábitos",
    description: "365 check-ins no total",
    emoji: "🏆",
  },
  {
    key: "level_5",
    name: "Aprendiz",
    description: "Atingir nível 5",
    emoji: "⭐",
  },
  {
    key: "level_10",
    name: "Veterano",
    description: "Atingir nível 10",
    emoji: "🌟",
  },
  {
    key: "level_20",
    name: "Mestre",
    description: "Atingir nível 20",
    emoji: "🔮",
  },
  {
    key: "multitask_3",
    name: "Multitarefa",
    description: "Fazer 3 ou mais atividades em um único dia",
    emoji: "🎪",
  },
  {
    key: "early_bird",
    name: "Madrugador",
    description: "Check-in antes das 7h da manhã",
    emoji: "🌅",
  },
  {
    key: "night_owl",
    name: "Coruja",
    description: "Check-in após as 22h",
    emoji: "🦉",
  },
  {
    key: "consistent_7",
    name: "Consistência",
    description: "Pelo menos 1 atividade por dia durante 7 dias seguidos",
    emoji: "🎖️",
  },
];

export function getAchievementDef(key: string): AchievementDef | undefined {
  return ACHIEVEMENTS.find((a) => a.key === key);
}

export interface AchievementCheckContext {
  totalCheckins: number;
  maxStreak: number;
  level: number;
  checkinsToday: number;
  checkinHour: number;
  consecutiveDays: number; // days in a row with at least 1 activity
}

export function evaluateAchievements(ctx: AchievementCheckContext): string[] {
  const earned: string[] = [];

  if (ctx.totalCheckins >= 1) earned.push("first_checkin");
  if (ctx.maxStreak >= 7) earned.push("streak_7");
  if (ctx.maxStreak >= 14) earned.push("streak_14");
  if (ctx.maxStreak >= 30) earned.push("streak_30");
  if (ctx.maxStreak >= 100) earned.push("streak_100");
  if (ctx.totalCheckins >= 10) earned.push("checkins_10");
  if (ctx.totalCheckins >= 50) earned.push("checkins_50");
  if (ctx.totalCheckins >= 100) earned.push("checkins_100");
  if (ctx.totalCheckins >= 365) earned.push("checkins_365");
  if (ctx.level >= 5) earned.push("level_5");
  if (ctx.level >= 10) earned.push("level_10");
  if (ctx.level >= 20) earned.push("level_20");
  if (ctx.checkinsToday >= 3) earned.push("multitask_3");
  if (ctx.checkinHour < 7) earned.push("early_bird");
  if (ctx.checkinHour >= 22) earned.push("night_owl");
  if (ctx.consecutiveDays >= 7) earned.push("consistent_7");

  return earned;
}

// Compute how many consecutive days (up to today) had at least 1 check-in
export function computeConsecutiveDays(allCheckinDates: string[]): number {
  if (allCheckinDates.length === 0) return 0;
  const uniqueDates = [...new Set(allCheckinDates)].sort().reverse();
  const today = format(new Date(), "yyyy-MM-dd");
  const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd");
  const mostRecent = uniqueDates[0];
  if (mostRecent !== today && mostRecent !== yesterday) return 0;

  let count = 0;
  let expected = mostRecent;
  for (const date of uniqueDates) {
    if (date === expected) {
      count++;
      expected = format(subDays(parseISO(expected), 1), "yyyy-MM-dd");
    } else if (date < expected) {
      break;
    }
  }
  return count;
}
