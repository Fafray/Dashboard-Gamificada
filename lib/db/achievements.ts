import { pool, init, localISOString } from "./client";

export interface Achievement {
  id: number;
  key: string;
  unlocked_at: string;
}

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
