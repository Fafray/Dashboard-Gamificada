import { pool, init, localISOString } from "./client";

export interface HourlyPlan {
  id: number;
  plan_date: string;
  hour: number;
  text: string;
}

export async function getHourlyPlansForDate(date: string): Promise<HourlyPlan[]> {
  await init();
  const res = await pool.query(
    `SELECT id, plan_date, hour, text FROM hourly_plans WHERE plan_date = $1 ORDER BY hour ASC`,
    [date]
  );
  return res.rows;
}

export async function upsertHourlyPlan(date: string, hour: number, text: string): Promise<void> {
  await init();
  const trimmed = text.trim();
  if (!trimmed) {
    await pool.query(`DELETE FROM hourly_plans WHERE plan_date = $1 AND hour = $2`, [date, hour]);
    return;
  }
  const now = localISOString();
  await pool.query(
    `INSERT INTO hourly_plans (plan_date, hour, text, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $4)
     ON CONFLICT (plan_date, hour) DO UPDATE SET text = $3, updated_at = $4`,
    [date, hour, trimmed, now]
  );
}
