import { pool, init, localISOString } from "./client";

export interface SystemEvent {
  id: number;
  tipo: string;
  texto: string;
  data: string;
  extra: Record<string, unknown> | null;
}

export async function registrarEvento(
  tipo: string,
  texto: string,
  extra?: Record<string, unknown>
): Promise<void> {
  await init();
  await pool.query(
    `INSERT INTO events (tipo, texto, data, extra) VALUES ($1, $2, $3, $4)`,
    [tipo, texto, localISOString(), extra ? JSON.stringify(extra) : null]
  );
}

export async function getEvents(limit = 60): Promise<SystemEvent[]> {
  await init();
  const res = await pool.query(
    `SELECT * FROM events ORDER BY data DESC LIMIT $1`,
    [limit]
  );
  return res.rows;
}

export async function getLevelHistory(currentLevel: number): Promise<{ date: string; nivel: number }[]> {
  await init();
  const res = await pool.query(`
    SELECT LEFT(data, 10) as date, (extra->>'nivel')::int as nivel
    FROM events
    WHERE tipo IN ('nivel_up', 'nivel_down') AND extra->>'nivel' IS NOT NULL
    ORDER BY data ASC
  `);
  if (res.rows.length === 0) {
    const today = new Date().toISOString().slice(0, 10);
    return [{ date: today, nivel: currentLevel }];
  }
  return res.rows;
}
