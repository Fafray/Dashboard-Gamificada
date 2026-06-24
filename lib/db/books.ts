import { pool, init, localISOString } from "./client";

export interface Book {
  id: number;
  title: string;
  author: string | null;
  cover_image: string | null;
  cover_thumbnail: string | null;
  description: string | null;
  status: "want" | "reading" | "read";
  total_pages: number | null;
  current_page: number;
  rating: number | null;
  summary: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
}

const BOOK_ALLOWED_KEYS = new Set([
  "title", "author", "cover_image", "cover_thumbnail", "description",
  "status", "total_pages", "current_page", "rating", "summary",
  "started_at", "finished_at",
]);

export async function getBooks(status?: Book["status"]): Promise<Omit<Book, "cover_image">[]> {
  await init();
  const sql = status
    ? `SELECT id, title, author, cover_thumbnail, description, status, total_pages, current_page, rating, summary, started_at, finished_at, created_at FROM books WHERE status = $1 ORDER BY created_at DESC`
    : `SELECT id, title, author, cover_thumbnail, description, status, total_pages, current_page, rating, summary, started_at, finished_at, created_at FROM books ORDER BY created_at DESC`;
  const res = status ? await pool.query(sql, [status]) : await pool.query(sql);
  return res.rows;
}

export async function getBook(id: number): Promise<Book | null> {
  await init();
  const res = await pool.query(`SELECT * FROM books WHERE id = $1`, [id]);
  return res.rows[0] ?? null;
}

export async function createBook(
  data: Omit<Book, "id" | "created_at">
): Promise<Book> {
  await init();
  const res = await pool.query(
    `INSERT INTO books (title, author, cover_image, cover_thumbnail, description, status, total_pages, current_page, rating, summary, started_at, finished_at, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING id`,
    [
      data.title, data.author ?? null, data.cover_image ?? null, data.cover_thumbnail ?? null,
      data.description ?? null, data.status ?? "want", data.total_pages ?? null,
      data.current_page ?? 0, data.rating ?? null, data.summary ?? null,
      data.started_at ?? null, data.finished_at ?? null, localISOString(),
    ]
  );
  return (await getBook(res.rows[0].id))!;
}

export async function updateBook(
  id: number,
  data: Partial<Omit<Book, "id" | "created_at">>
): Promise<Book | null> {
  await init();
  const patch = { ...data };

  // Auto-fill started_at when moving to reading
  if (patch.status === "reading") {
    const current = await getBook(id);
    if (current && !current.started_at && !patch.started_at) {
      patch.started_at = localISOString().slice(0, 10);
    }
  }

  // Auto-fill finished_at and current_page when moving to read
  if (patch.status === "read") {
    const current = await getBook(id);
    if (current) {
      if (!current.finished_at && !patch.finished_at) {
        patch.finished_at = localISOString().slice(0, 10);
      }
      if (current.total_pages && patch.current_page === undefined) {
        patch.current_page = current.total_pages;
      }
    }
  }

  const keys = Object.keys(patch).filter((k) => BOOK_ALLOWED_KEYS.has(k)) as (keyof typeof patch)[];
  if (keys.length === 0) return getBook(id);
  const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(", ");
  const values = keys.map((k) => patch[k]);
  await pool.query(`UPDATE books SET ${setClause} WHERE id = $${keys.length + 1}`, [...values, id]);
  return getBook(id);
}

export async function deleteBook(id: number): Promise<void> {
  await init();
  await pool.query(`DELETE FROM books WHERE id = $1`, [id]);
}
