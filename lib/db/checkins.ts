import { pool, init, localISOString } from "./client";

export interface Checkin {
  id: number;
  activity_id: number;
  checked_at: string;
  actual_value: number | null;
}

export async function getCheckinsByDate(date: string): Promise<Checkin[]> {
  await init();
  const res = await pool.query(
    `SELECT * FROM checkins WHERE LEFT(checked_at, 10) = $1 ORDER BY checked_at DESC`,
    [date]
  );
  return res.rows;
}

export async function hasCheckinToday(activityId: number, localDateStr: string): Promise<boolean> {
  await init();
  const res = await pool.query(
    `SELECT COUNT(*) as cnt FROM checkins WHERE activity_id = $1 AND LEFT(checked_at, 10) = $2`,
    [activityId, localDateStr]
  );
  return parseInt(res.rows[0].cnt) > 0;
}

export async function hasCheckinThisWeek(
  activityId: number, weekStart: string, weekEnd: string
): Promise<boolean> {
  await init();
  const res = await pool.query(
    `SELECT COUNT(*) as cnt FROM checkins
     WHERE activity_id = $1 AND LEFT(checked_at, 10) >= $2 AND LEFT(checked_at, 10) <= $3`,
    [activityId, weekStart, weekEnd]
  );
  return parseInt(res.rows[0].cnt) > 0;
}

export async function getWeeklyCheckinCount(
  activityId: number, weekStart: string, weekEnd: string
): Promise<number> {
  await init();
  const res = await pool.query(
    `SELECT COUNT(*) as cnt FROM checkins
     WHERE activity_id = $1 AND LEFT(checked_at, 10) >= $2 AND LEFT(checked_at, 10) <= $3`,
    [activityId, weekStart, weekEnd]
  );
  return parseInt(res.rows[0].cnt);
}

export async function createCheckin(
  activityId: number,
  actualValue?: number | null,
  at?: Date
): Promise<Checkin> {
  await init();
  const res = await pool.query(
    `INSERT INTO checkins (activity_id, checked_at, actual_value) VALUES ($1, $2, $3) RETURNING *`,
    [activityId, localISOString(at), actualValue ?? null]
  );
  return res.rows[0];
}

export async function getCheckinDatesForActivity(activityId: number): Promise<string[]> {
  await init();
  const res = await pool.query(
    `SELECT LEFT(checked_at, 10) as d FROM checkins WHERE activity_id = $1 ORDER BY d DESC`,
    [activityId]
  );
  return res.rows.map((r: { d: string }) => r.d);
}

export async function getAllCheckins(): Promise<Checkin[]> {
  await init();
  const res = await pool.query(`SELECT * FROM checkins ORDER BY checked_at DESC`);
  return res.rows;
}

export async function getTotalCheckinsCount(): Promise<number> {
  await init();
  const res = await pool.query(`SELECT COUNT(*) as cnt FROM checkins`);
  return parseInt(res.rows[0].cnt);
}

export async function getTodayCheckinForActivity(
  activityId: number, localDateStr: string
): Promise<{ id: number; actual_value: number | null } | null> {
  await init();
  const res = await pool.query(
    `SELECT id, actual_value FROM checkins WHERE activity_id = $1 AND LEFT(checked_at, 10) = $2 ORDER BY checked_at DESC LIMIT 1`,
    [activityId, localDateStr]
  );
  if (!res.rows[0]) return null;
  const r = res.rows[0];
  return { id: r.id, actual_value: r.actual_value != null ? Number(r.actual_value) : null };
}

export async function accumulateCheckinValue(
  activityId: number,
  todayStr: string,
  increment: number
): Promise<{ id: number; actual_value: number }> {
  await init();
  const existing = await pool.query(
    `SELECT id, actual_value FROM checkins WHERE activity_id = $1 AND LEFT(checked_at, 10) = $2`,
    [activityId, todayStr]
  );
  if (existing.rows.length > 0) {
    const row = existing.rows[0];
    const newValue = (Number(row.actual_value) || 0) + increment;
    await pool.query(`UPDATE checkins SET actual_value = $1 WHERE id = $2`, [newValue, row.id]);
    return { id: row.id, actual_value: newValue };
  } else {
    const res = await pool.query(
      `INSERT INTO checkins (activity_id, checked_at, actual_value) VALUES ($1, $2, $3) RETURNING id`,
      [activityId, localISOString(), increment]
    );
    return { id: res.rows[0].id, actual_value: increment };
  }
}

export async function getLastCheckinThisWeek(
  activityId: number, weekStart: string, weekEnd: string
): Promise<{ id: number; actual_value: number | null } | null> {
  await init();
  const res = await pool.query(
    `SELECT id, actual_value FROM checkins
     WHERE activity_id = $1 AND LEFT(checked_at, 10) >= $2 AND LEFT(checked_at, 10) <= $3
     ORDER BY checked_at DESC LIMIT 1`,
    [activityId, weekStart, weekEnd]
  );
  if (!res.rows[0]) return null;
  const r = res.rows[0];
  return { id: r.id, actual_value: r.actual_value != null ? Number(r.actual_value) : null };
}

export async function deleteCheckin(id: number): Promise<boolean> {
  await init();
  const res = await pool.query(`DELETE FROM checkins WHERE id = $1`, [id]);
  return (res.rowCount ?? 0) > 0;
}

export async function getCheckinsGroupedByDate(
  days: number
): Promise<{ date: string; count: number }[]> {
  await init();
  const res = await pool.query(
    `SELECT LEFT(checked_at, 10) as date, COUNT(*) as count
     FROM checkins WHERE checked_at >= $1
     GROUP BY LEFT(checked_at, 10) ORDER BY date ASC`,
    [localISOString(new Date(Date.now() - days * 86400000)).slice(0, 10)]
  );
  return res.rows.map((r: { date: string; count: string }) => ({
    date: r.date, count: parseInt(r.count),
  }));
}
