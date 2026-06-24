import { pool, init, localISOString } from "./client";

export interface Perfume {
  id: number;
  name: string;
  brand: string | null;
  photo: string | null;
  photo_thumbnail: string | null;
  description: string | null;
  status: "owned" | "wishlist";
  notes_top: string | null;
  notes_heart: string | null;
  notes_base: string | null;
  rating: number | null;
  tags: string | null;
  price: number | null;
  created_at: string;
}

const PERFUME_ALLOWED_KEYS = new Set([
  "name", "brand", "photo", "photo_thumbnail", "description",
  "status", "notes_top", "notes_heart", "notes_base",
  "rating", "tags", "price",
]);

export async function getPerfumes(status?: Perfume["status"]): Promise<Omit<Perfume, "photo">[]> {
  await init();
  const sql = status
    ? `SELECT id, name, brand, photo_thumbnail, description, status, notes_top, notes_heart, notes_base, rating, tags, price, created_at FROM perfumes WHERE status = $1 ORDER BY created_at DESC`
    : `SELECT id, name, brand, photo_thumbnail, description, status, notes_top, notes_heart, notes_base, rating, tags, price, created_at FROM perfumes ORDER BY created_at DESC`;
  const res = status ? await pool.query(sql, [status]) : await pool.query(sql);
  return res.rows;
}

export async function getPerfume(id: number): Promise<Perfume | null> {
  await init();
  const res = await pool.query(`SELECT * FROM perfumes WHERE id = $1`, [id]);
  return res.rows[0] ?? null;
}

export async function createPerfume(
  data: Omit<Perfume, "id" | "created_at">
): Promise<Perfume> {
  await init();
  const res = await pool.query(
    `INSERT INTO perfumes (name, brand, photo, photo_thumbnail, description, status, notes_top, notes_heart, notes_base, rating, tags, price, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING id`,
    [
      data.name, data.brand ?? null, data.photo ?? null, data.photo_thumbnail ?? null,
      data.description ?? null, data.status ?? "owned",
      data.notes_top ?? null, data.notes_heart ?? null, data.notes_base ?? null,
      data.rating ?? null, data.tags ?? null, data.price ?? null, localISOString(),
    ]
  );
  return (await getPerfume(res.rows[0].id))!;
}

export async function updatePerfume(
  id: number,
  data: Partial<Omit<Perfume, "id" | "created_at">>
): Promise<Perfume | null> {
  await init();
  const keys = Object.keys(data).filter((k) => PERFUME_ALLOWED_KEYS.has(k)) as (keyof typeof data)[];
  if (keys.length === 0) return getPerfume(id);
  const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(", ");
  const values = keys.map((k) => data[k]);
  await pool.query(`UPDATE perfumes SET ${setClause} WHERE id = $${keys.length + 1}`, [...values, id]);
  return getPerfume(id);
}

export async function deletePerfume(id: number): Promise<void> {
  await init();
  await pool.query(`DELETE FROM perfumes WHERE id = $1`, [id]);
}
