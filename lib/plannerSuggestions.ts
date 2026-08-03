import { getScheduledTasks, getActivities } from "./db";

export interface HourSuggestion {
  emoji: string;
  text: string;
  source: "agenda" | "habito";
}

export async function getHourlySuggestions(date: string): Promise<Record<number, HourSuggestion[]>> {
  const [tasks, activities] = await Promise.all([
    getScheduledTasks(false),
    getActivities(false),
  ]);

  const byHour: Record<number, HourSuggestion[]> = {};
  function add(hour: number, s: HourSuggestion) {
    (byHour[hour] ??= []).push(s);
  }

  for (const t of tasks) {
    if (t.due_date !== date || !t.due_time) continue;
    const hour = parseInt(t.due_time.split(":")[0], 10);
    if (!isNaN(hour)) add(hour, { emoji: t.emoji ?? "📅", text: t.name, source: "agenda" });
  }
  for (const a of activities) {
    if (!a.notify_at) continue;
    const hour = parseInt(a.notify_at.split(":")[0], 10);
    if (!isNaN(hour)) add(hour, { emoji: a.emoji ?? "🔔", text: a.name, source: "habito" });
  }

  return byHour;
}
