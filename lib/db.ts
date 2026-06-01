import { Pool } from "pg";

// Store local datetime (no timezone suffix) so date extraction is timezone-safe.
function localISOString(d = new Date()): string {
  const p = (n: number, len = 2) => String(n).padStart(len, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}.${p(d.getMilliseconds(), 3)}`;
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
});

// One-time schema init — idempotent (IF NOT EXISTS everywhere)
let schemaReady: Promise<void> | null = null;

function init(): Promise<void> {
  if (schemaReady) return schemaReady;
  schemaReady = (async () => {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS activities (
        id         SERIAL  PRIMARY KEY,
        name       TEXT    NOT NULL,
        frequency  TEXT    NOT NULL CHECK(frequency IN ('daily', 'weekly', 'free')),
        xp_base    INTEGER NOT NULL DEFAULT 10,
        emoji      TEXT,
        color      TEXT    NOT NULL DEFAULT '#7c3aed',
        archived   INTEGER NOT NULL DEFAULT 0,
        created_at TEXT    NOT NULL
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS checkins (
        id          SERIAL  PRIMARY KEY,
        activity_id INTEGER NOT NULL REFERENCES activities(id),
        checked_at  TEXT    NOT NULL,
        xp_earned   INTEGER NOT NULL
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS achievements (
        id          SERIAL PRIMARY KEY,
        key         TEXT   NOT NULL UNIQUE,
        unlocked_at TEXT   NOT NULL
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_stats (
        id        INTEGER PRIMARY KEY,
        total_xp  INTEGER NOT NULL DEFAULT 0,
        level     INTEGER NOT NULL DEFAULT 1,
        last_seen TEXT    NOT NULL
      )
    `);
    await pool.query(
      `INSERT INTO user_stats (id, total_xp, level, last_seen)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO NOTHING`,
      [1, 0, 1, localISOString()]
    );
  })();
  return schemaReady;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type Frequency = "daily" | "weekly" | "free";

export interface Activity {
  id: number;
  name: string;
  frequency: Frequency;
  xp_base: number;
  emoji: string | null;
  color: string;
  archived: number;
  created_at: string;
}

export interface Checkin {
  id: number;
  activity_id: number;
  checked_at: string;
  xp_earned: number;
}

export interface Achievement {
  id: number;
  key: string;
  unlocked_at: string;
}

export interface UserStats {
  id: number;
  total_xp: number;
  level: number;
  last_seen: string;
}

// ─── Activities ───────────────────────────────────────────────────────────────

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
    `INSERT INTO activities (name, frequency, xp_base, emoji, color, created_at)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [data.name, data.frequency, data.xp_base, data.emoji, data.color, localISOString()]
  );
  return (await getActivity(res.rows[0].id))!;
}

export async function updateActivity(
  id: number,
  data: Partial<Omit<Activity, "id" | "created_at">>
): Promise<Activity | null> {
  await init();
  const keys = Object.keys(data) as (keyof typeof data)[];
  if (keys.length === 0) return getActivity(id);
  const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(", ");
  const values = keys.map((k) => data[k]);
  await pool.query(`UPDATE activities SET ${setClause} WHERE id = $${keys.length + 1}`, [
    ...values,
    id,
  ]);
  return getActivity(id);
}

export async function archiveActivity(id: number): Promise<void> {
  await init();
  await pool.query(`UPDATE activities SET archived = 1 WHERE id = $1`, [id]);
}

// ─── Checkins ─────────────────────────────────────────────────────────────────

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
  activityId: number,
  weekStart: string,
  weekEnd: string
): Promise<boolean> {
  await init();
  const res = await pool.query(
    `SELECT COUNT(*) as cnt FROM checkins
     WHERE activity_id = $1
       AND LEFT(checked_at, 10) >= $2
       AND LEFT(checked_at, 10) <= $3`,
    [activityId, weekStart, weekEnd]
  );
  return parseInt(res.rows[0].cnt) > 0;
}

export async function createCheckin(
  activityId: number,
  xpEarned: number,
  at?: Date
): Promise<Checkin> {
  await init();
  const res = await pool.query(
    `INSERT INTO checkins (activity_id, checked_at, xp_earned) VALUES ($1, $2, $3) RETURNING *`,
    [activityId, localISOString(at), xpEarned]
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

export async function getAllCheckinDatesFlat(): Promise<string[]> {
  await init();
  const res = await pool.query(
    `SELECT LEFT(checked_at, 10) as d FROM checkins ORDER BY d DESC`
  );
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

// ─── User Stats ───────────────────────────────────────────────────────────────

export async function getUserStats(): Promise<UserStats> {
  await init();
  const res = await pool.query(`SELECT * FROM user_stats WHERE id = 1`);
  return res.rows[0];
}

export async function addXP(amount: number): Promise<UserStats> {
  await init();
  await pool.query(
    `UPDATE user_stats SET total_xp = total_xp + $1, last_seen = $2 WHERE id = 1`,
    [amount, localISOString()]
  );
  return getUserStats();
}

export async function updateLevel(level: number): Promise<void> {
  await init();
  await pool.query(`UPDATE user_stats SET level = $1 WHERE id = 1`, [level]);
}

// ─── Achievements ─────────────────────────────────────────────────────────────

export async function getAchievements(): Promise<Achievement[]> {
  await init();
  const res = await pool.query(`SELECT * FROM achievements ORDER BY unlocked_at ASC`);
  return res.rows;
}

export async function hasAchievement(key: string): Promise<boolean> {
  await init();
  const res = await pool.query(`SELECT COUNT(*) as cnt FROM achievements WHERE key = $1`, [key]);
  return parseInt(res.rows[0].cnt) > 0;
}

export async function unlockAchievement(key: string): Promise<Achievement | null> {
  await init();
  if (await hasAchievement(key)) return null;
  const now = localISOString();
  const res = await pool.query(
    `INSERT INTO achievements (key, unlocked_at) VALUES ($1, $2) RETURNING *`,
    [key, now]
  );
  return res.rows[0];
}
