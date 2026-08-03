import { format, subDays, subWeeks, startOfISOWeek, parseISO, differenceInCalendarDays, differenceInCalendarWeeks } from "date-fns";
import type { Frequency } from "./db";

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

// Quantos dias consecutivos (até hoje) tiveram ao menos 1 check-in em qualquer hábito
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
