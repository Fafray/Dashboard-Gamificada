import { type PoolClient } from "pg";
import { BALANCE } from "../config/balance";
import { pool, init, localISOString } from "./client";
import type { UserStats } from "./stats";

export interface Checkin {
  id: number;
  activity_id: number;
  checked_at: string;
  xp_earned: number;
  actual_value: number | null;
  checkin_level: "minimum" | "beyond" | null;
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
  xpEarned: number,
  actualValue?: number | null,
  at?: Date,
  checkinLevel?: "minimum" | "beyond" | null
): Promise<Checkin> {
  await init();
  const res = await pool.query(
    `INSERT INTO checkins (activity_id, checked_at, xp_earned, actual_value, checkin_level) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [activityId, localISOString(at), xpEarned, actualValue ?? null, checkinLevel ?? null]
  );
  return res.rows[0];
}

export async function createCheckinAtomic(
  activityId: number,
  xpEarned: number,
  actualValue: number | null,
  checkinLevel: "minimum" | "beyond" | null,
  computeLevel: (totalXP: number) => number
): Promise<{ checkin: Checkin; stats: UserStats }> {
  await init();
  const client: PoolClient = await pool.connect();
  try {
    await client.query("BEGIN");

    const checkinRes = await client.query(
      `INSERT INTO checkins (activity_id, checked_at, xp_earned, actual_value, checkin_level)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [activityId, localISOString(), xpEarned, actualValue, checkinLevel]
    );
    const checkin: Checkin = checkinRes.rows[0];

    await client.query(
      `UPDATE user_stats SET total_xp = total_xp + $1, last_seen = $2 WHERE id = 1`,
      [xpEarned, localISOString()]
    );
    const statsRes = await client.query(`SELECT * FROM user_stats WHERE id = 1`);
    const stats: UserStats = statsRes.rows[0];

    const newLevel = computeLevel(stats.total_xp);
    await client.query(`UPDATE user_stats SET level = $1 WHERE id = 1`, [newLevel]);

    const nivelMax = stats.nivel_maximo_atingido ?? 1;
    if (newLevel > nivelMax) {
      const pontos = (newLevel - nivelMax) * BALANCE.attributes.pointsPerLevel;
      await client.query(
        `UPDATE user_stats SET nivel_maximo_atingido = $1, pontos_disponiveis = pontos_disponiveis + $2 WHERE id = 1`,
        [newLevel, pontos]
      );
    }

    await client.query("COMMIT");
    return { checkin, stats: { ...stats, level: newLevel } };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function getXpSumTodayExcluding(excludeActivityId: number, todayStr: string): Promise<number> {
  await init();
  const res = await pool.query(
    `SELECT COALESCE(SUM(xp_earned), 0) as total
     FROM checkins
     WHERE LEFT(checked_at, 10) = $1 AND activity_id != $2`,
    [todayStr, excludeActivityId]
  );
  return parseInt(res.rows[0].total);
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

export async function getAllCheckinDatesFlat(): Promise<string[]> {
  await init();
  const res = await pool.query(`SELECT LEFT(checked_at, 10) as d FROM checkins ORDER BY d DESC`);
  return res.rows.map((r: { d: string }) => r.d);
}

export async function getTotalCheckinsCount(): Promise<number> {
  await init();
  const res = await pool.query(`SELECT COUNT(*) as cnt FROM checkins`);
  return parseInt(res.rows[0].cnt);
}

export async function getCheckinsCountToday(localDateStr: string): Promise<number> {
  await init();
  const res = await pool.query(
    `SELECT COUNT(DISTINCT activity_id) as cnt FROM checkins WHERE LEFT(checked_at, 10) = $1`,
    [localDateStr]
  );
  return parseInt(res.rows[0].cnt);
}

export async function getXpEarnedToday(localDateStr: string): Promise<number> {
  await init();
  const res = await pool.query(
    `SELECT COALESCE(SUM(xp_earned), 0) as total FROM checkins WHERE LEFT(checked_at, 10) = $1`,
    [localDateStr]
  );
  return parseInt(res.rows[0].total);
}

export async function getTodayCheckinForActivity(
  activityId: number, localDateStr: string
): Promise<{ id: number; xp_earned: number; actual_value: number | null } | null> {
  await init();
  const res = await pool.query(
    `SELECT id, xp_earned, actual_value FROM checkins WHERE activity_id = $1 AND LEFT(checked_at, 10) = $2 ORDER BY checked_at DESC LIMIT 1`,
    [activityId, localDateStr]
  );
  if (!res.rows[0]) return null;
  const r = res.rows[0];
  return { id: r.id, xp_earned: Number(r.xp_earned), actual_value: r.actual_value != null ? Number(r.actual_value) : null };
}

export async function accumulateCheckinValue(
  activityId: number,
  todayStr: string,
  increment: number
): Promise<{ id: number; actual_value: number; xp_earned: number }> {
  await init();
  const existing = await pool.query(
    `SELECT id, actual_value, xp_earned FROM checkins WHERE activity_id = $1 AND LEFT(checked_at, 10) = $2`,
    [activityId, todayStr]
  );
  if (existing.rows.length > 0) {
    const row = existing.rows[0];
    const newValue = (Number(row.actual_value) || 0) + increment;
    await pool.query(`UPDATE checkins SET actual_value = $1 WHERE id = $2`, [newValue, row.id]);
    return { id: row.id, actual_value: newValue, xp_earned: Number(row.xp_earned) };
  } else {
    const res = await pool.query(
      `INSERT INTO checkins (activity_id, checked_at, xp_earned, actual_value) VALUES ($1, $2, 0, $3) RETURNING id`,
      [activityId, localISOString(), increment]
    );
    return { id: res.rows[0].id, actual_value: increment, xp_earned: 0 };
  }
}

export async function setCheckinXp(checkinId: number, xpEarned: number): Promise<void> {
  await init();
  await pool.query(`UPDATE checkins SET xp_earned = $1 WHERE id = $2`, [xpEarned, checkinId]);
}

export async function getLastCheckinThisWeek(
  activityId: number, weekStart: string, weekEnd: string
): Promise<{ id: number; xp_earned: number; actual_value: number | null } | null> {
  await init();
  const res = await pool.query(
    `SELECT id, xp_earned, actual_value FROM checkins
     WHERE activity_id = $1 AND LEFT(checked_at, 10) >= $2 AND LEFT(checked_at, 10) <= $3
     ORDER BY checked_at DESC LIMIT 1`,
    [activityId, weekStart, weekEnd]
  );
  if (!res.rows[0]) return null;
  const r = res.rows[0];
  return { id: r.id, xp_earned: Number(r.xp_earned), actual_value: r.actual_value != null ? Number(r.actual_value) : null };
}

export async function deleteCheckin(id: number): Promise<number> {
  await init();
  const res = await pool.query(`SELECT xp_earned FROM checkins WHERE id = $1`, [id]);
  if (res.rows.length === 0) return 0;
  const xp = res.rows[0].xp_earned as number;
  await pool.query(`DELETE FROM checkins WHERE id = $1`, [id]);
  await pool.query(
    `UPDATE user_stats SET total_xp = GREATEST(0, total_xp - $1) WHERE id = 1`,
    [xp]
  );
  return xp;
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

export async function getXpPerDay(days: number): Promise<{ date: string; xp: number }[]> {
  await init();
  const res = await pool.query(
    `SELECT LEFT(checked_at, 10) as date, SUM(xp_earned) as xp
     FROM checkins WHERE checked_at >= $1
     GROUP BY LEFT(checked_at, 10) ORDER BY date ASC`,
    [localISOString(new Date(Date.now() - days * 86400000)).slice(0, 10)]
  );
  return res.rows.map((r: { date: string; xp: string }) => ({
    date: r.date, xp: parseInt(r.xp),
  }));
}
