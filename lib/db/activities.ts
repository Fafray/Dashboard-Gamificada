import { pool, init, localISOString } from "./client";

export type Frequency = "daily" | "weekly" | "free" | "nx_week" | "once";

export interface Activity {
  id: number;
  name: string;
  frequency: Frequency;
  emoji: string | null;
  color: string;
  archived: number;
  created_at: string;
  target_value: number | null;
  target_unit: string | null;
  weekly_target: number | null;
  categoria: string | null;
  scheduled_days: string | null;
  notify_at: string | null;
  due_date: string | null;
}

export interface ActivityStats {
  id: number;
  name: string;
  emoji: string | null;
  color: string;
  frequency: Frequency;
  total_checkins: number;
  last_checkin: string | null;
}

const ACTIVITY_ALLOWED_KEYS = new Set([
  "name", "frequency", "emoji", "color", "archived",
  "target_value", "target_unit", "weekly_target", "categoria",
  "scheduled_days", "notify_at", "due_date",
]);

export async function getActivities(includeArchived = false): Promise<Activity[]> {
  await init();
  const sql = includeArchived
    ? `SELECT * FROM activities ORDER BY created_at ASC`
    : `SELECT * FROM activities WHERE archived = 0 ORDER BY created_at ASC`;
  const res = await pool.query(sql);
  return res.rows;
}

export async function getActivity(id: number): Promise<Activity | null> {
  await init();
  const res = await pool.query(`SELECT * FROM activities WHERE id = $1`, [id]);
  return res.rows[0] ?? null;
}

export async function createActivity(
  data: Omit<Activity, "id" | "archived" | "created_at">
): Promise<Activity> {
  await init();
  const res = await pool.query(
    `INSERT INTO activities (name, frequency, emoji, color, target_value, target_unit, weekly_target, categoria, scheduled_days, notify_at, due_date, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id`,
    [data.name, data.frequency, data.emoji, data.color,
     data.target_value ?? null, data.target_unit ?? null, data.weekly_target ?? null,
     data.categoria ?? null, data.scheduled_days ?? null, data.notify_at ?? null,
     data.due_date ?? null, localISOString()]
  );
  return (await getActivity(res.rows[0].id))!;
}

export async function updateActivity(
  id: number,
  data: Partial<Omit<Activity, "id" | "created_at">>
): Promise<Activity | null> {
  await init();
  const keys = Object.keys(data).filter((k) => ACTIVITY_ALLOWED_KEYS.has(k)) as (keyof typeof data)[];
  if (keys.length === 0) return getActivity(id);
  const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(", ");
  const values = keys.map((k) => data[k]);
  await pool.query(`UPDATE activities SET ${setClause} WHERE id = $${keys.length + 1}`, [...values, id]);
  return getActivity(id);
}

export async function archiveActivity(id: number): Promise<void> {
  await init();
  await pool.query(`UPDATE activities SET archived = 1 WHERE id = $1`, [id]);
}

export async function deleteActivityPermanently(id: number): Promise<void> {
  await init();
  await pool.query(`DELETE FROM checkins WHERE activity_id = $1`, [id]);
  await pool.query(`DELETE FROM activities WHERE id = $1`, [id]);
}

export async function archiveExpiredOnce(todayStr: string): Promise<void> {
  await init();
  await pool.query(
    `UPDATE activities SET archived = 1
     WHERE frequency = 'once' AND archived = 0 AND due_date < $1`,
    [todayStr]
  );
}

export async function getActivitiesWithNotifyAt(timeStr: string): Promise<Activity[]> {
  await init();
  const res = await pool.query(
    `SELECT * FROM activities WHERE archived = 0 AND notify_at = $1`,
    [timeStr]
  );
  return res.rows;
}

export async function getActivityStatsAll(): Promise<ActivityStats[]> {
  await init();
  const res = await pool.query(`
    SELECT
      a.id, a.name, a.emoji, a.color, a.frequency,
      COUNT(c.id)::int            AS total_checkins,
      MAX(LEFT(c.checked_at, 10)) AS last_checkin
    FROM activities a
    LEFT JOIN checkins c ON c.activity_id = a.id
    WHERE a.archived = 0
    GROUP BY a.id, a.name, a.emoji, a.color, a.frequency
    ORDER BY COUNT(c.id) DESC
  `);
  return res.rows.map((r: Record<string, unknown>) => ({
    id: Number(r.id),
    name: r.name as string,
    emoji: r.emoji as string | null,
    color: r.color as string,
    frequency: r.frequency as Frequency,
    total_checkins: Number(r.total_checkins),
    last_checkin: r.last_checkin as string | null,
  }));
}
