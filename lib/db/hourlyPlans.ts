import { pool, init, localISOString } from "./client";

export interface HourlyPlan {
  id: number;
  plan_date: string;
  hour: number;
  text: string;
  duration: number;
  done: boolean;
}

export interface HourlyPlanNotifyItem {
  id: number;
  text: string;
}

export async function getHourlyPlansForDate(date: string): Promise<HourlyPlan[]> {
  await init();
  const res = await pool.query(
    `SELECT id, plan_date, hour, text, duration, done FROM hourly_plans WHERE plan_date = $1 ORDER BY hour ASC`,
    [date]
  );
  return res.rows;
}

export async function upsertHourlyPlan(
  date: string,
  hour: number,
  data: { text?: string; duration?: number; done?: boolean }
): Promise<void> {
  await init();
  const existing = await pool.query(
    `SELECT text, duration, done FROM hourly_plans WHERE plan_date = $1 AND hour = $2`,
    [date, hour]
  );
  const current = existing.rows[0];
  const text     = (data.text !== undefined ? data.text : (current?.text ?? "")).trim();
  const duration = data.duration !== undefined ? data.duration : (current?.duration ?? 1);
  const done     = data.done !== undefined ? data.done : (current?.done ?? false);

  if (!text) {
    await pool.query(`DELETE FROM hourly_plans WHERE plan_date = $1 AND hour = $2`, [date, hour]);
    return;
  }

  const now = localISOString();
  await pool.query(
    `INSERT INTO hourly_plans (plan_date, hour, text, duration, done, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $6)
     ON CONFLICT (plan_date, hour) DO UPDATE SET text = $3, duration = $4, done = $5, updated_at = $6`,
    [date, hour, text, duration, done, now]
  );
}

export async function getPlannerEntriesForNotification(date: string, hour: number): Promise<HourlyPlanNotifyItem[]> {
  await init();
  const res = await pool.query(
    `SELECT id, text FROM hourly_plans
     WHERE plan_date = $1 AND hour = $2 AND done = FALSE AND notified_at IS NULL`,
    [date, hour]
  );
  return res.rows;
}

export async function markHourlyPlanNotified(id: number): Promise<void> {
  await init();
  await pool.query(`UPDATE hourly_plans SET notified_at = $1 WHERE id = $2`, [localISOString(), id]);
}

export async function getDatesWithEntriesInRange(startDate: string, endDate: string): Promise<string[]> {
  await init();
  const res = await pool.query(
    `SELECT DISTINCT plan_date FROM hourly_plans WHERE plan_date >= $1 AND plan_date <= $2`,
    [startDate, endDate]
  );
  return res.rows.map((r: { plan_date: string }) => r.plan_date);
}
