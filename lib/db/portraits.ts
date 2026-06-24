import { pool, init, localISOString } from "./client";

export async function getPortraitOverrides(): Promise<Record<string, string>> {
  await init();
  const res = await pool.query(`SELECT rank, image FROM portrait_overrides`);
  const map: Record<string, string> = {};
  for (const row of res.rows) {
    map[row.rank] = row.image;
  }
  return map;
}

export async function setPortraitOverride(rank: string, image: string): Promise<void> {
  await init();
  await pool.query(
    `INSERT INTO portrait_overrides (rank, image, updated_at)
     VALUES ($1, $2, $3)
     ON CONFLICT (rank) DO UPDATE SET image = $2, updated_at = $3`,
    [rank, image, localISOString()]
  );
}

export async function deletePortraitOverride(rank: string): Promise<void> {
  await init();
  await pool.query(`DELETE FROM portrait_overrides WHERE rank = $1`, [rank]);
}
