import { pool, init, localISOString } from "./client";

export interface ScheduledTask {
  id: number;
  name: string;
  emoji: string | null;
  due_date: string;
  due_time: string | null;
  category: string | null;
  notes: string | null;
  notify_enabled: boolean;
  notify_date: string | null;
  notify_time: string | null;
  notify_repeat: boolean;
  notify_sent_count: number;
  notified_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export async function getScheduledTasks(includeCompleted = false): Promise<ScheduledTask[]> {
  await init();
  const sql = includeCompleted
    ? `SELECT * FROM scheduled_tasks ORDER BY due_date ASC, due_time ASC NULLS LAST, created_at ASC`
    : `SELECT * FROM scheduled_tasks WHERE completed_at IS NULL ORDER BY due_date ASC, due_time ASC NULLS LAST, created_at ASC`;
  const res = await pool.query(sql);
  return res.rows;
}

export async function getScheduledTask(id: number): Promise<ScheduledTask | null> {
  await init();
  const res = await pool.query(`SELECT * FROM scheduled_tasks WHERE id = $1`, [id]);
  return res.rows[0] ?? null;
}

export async function createScheduledTask(
  data: Omit<ScheduledTask, "id" | "completed_at" | "created_at" | "notified_at" | "notify_sent_count">
): Promise<ScheduledTask> {
  await init();
  const res = await pool.query(
    `INSERT INTO scheduled_tasks (name, emoji, due_date, due_time, category, notes, notify_enabled, notify_date, notify_time, notify_repeat, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
    [data.name, data.emoji ?? null, data.due_date, data.due_time ?? null,
     data.category ?? null, data.notes ?? null, data.notify_enabled ?? false,
     data.notify_date ?? null, data.notify_time ?? null, data.notify_repeat ?? false, localISOString()]
  );
  return (await getScheduledTask(res.rows[0].id))!;
}

export async function updateScheduledTask(
  id: number,
  data: Partial<Pick<ScheduledTask, "name" | "emoji" | "due_date" | "due_time" | "category" | "notes" | "notify_enabled" | "notify_date" | "notify_time" | "notify_repeat" | "notify_sent_count" | "notified_at" | "completed_at">>
): Promise<ScheduledTask | null> {
  await init();
  const allowed = ["name", "emoji", "due_date", "due_time", "category", "notes", "notify_enabled", "notify_date", "notify_time", "notify_repeat", "notify_sent_count", "notified_at", "completed_at"];
  const keys = Object.keys(data).filter((k) => allowed.includes(k));
  if (keys.length === 0) return getScheduledTask(id);
  const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(", ");
  const values = keys.map((k) => (data as Record<string, unknown>)[k]);
  await pool.query(`UPDATE scheduled_tasks SET ${setClause} WHERE id = $${keys.length + 1}`, [...values, id]);
  return getScheduledTask(id);
}

export async function getAgendaTasksForNotification(nowISO: string): Promise<ScheduledTask[]> {
  await init();
  const res = await pool.query(
    `SELECT * FROM scheduled_tasks
     WHERE notify_enabled = TRUE
       AND completed_at IS NULL
       AND (
         (notify_sent_count = 0
           AND CONCAT(COALESCE(notify_date, due_date), 'T', COALESCE(notify_time, due_time), ':00')::timestamp
               BETWEEN ($1::timestamp - INTERVAL '2 minutes') AND $1::timestamp)
         OR
         (notify_repeat = TRUE AND notify_sent_count = 1
           AND CONCAT(COALESCE(notify_date, due_date), 'T', COALESCE(notify_time, due_time), ':00')::timestamp + INTERVAL '5 minutes'
               BETWEEN ($1::timestamp - INTERVAL '2 minutes') AND $1::timestamp)
         OR
         (notify_repeat = TRUE AND notify_sent_count = 2
           AND CONCAT(COALESCE(notify_date, due_date), 'T', COALESCE(notify_time, due_time), ':00')::timestamp + INTERVAL '10 minutes'
               BETWEEN ($1::timestamp - INTERVAL '2 minutes') AND $1::timestamp)
       )`,
    [nowISO]
  );
  return res.rows;
}

export async function getNotifyDiagnostics(): Promise<{
  subscriptions_count: number;
  notify_tasks: { id: number; name: string; notify_date: string | null; notify_time: string | null; due_date: string; due_time: string | null; notified_at: string | null; completed_at: string | null }[];
}> {
  await init();
  const [subRes, taskRes] = await Promise.all([
    pool.query(`SELECT COUNT(*) as cnt FROM push_subscriptions`),
    pool.query(`SELECT id, name, notify_date, notify_time, due_date, due_time, notified_at, completed_at FROM scheduled_tasks WHERE notify_enabled = TRUE ORDER BY due_date`),
  ]);
  return { subscriptions_count: parseInt(subRes.rows[0].cnt), notify_tasks: taskRes.rows };
}

export async function markAgendaTaskNotified(id: number): Promise<void> {
  await init();
  await pool.query(
    `UPDATE scheduled_tasks SET notify_sent_count = notify_sent_count + 1, notified_at = COALESCE(notified_at, $1) WHERE id = $2`,
    [localISOString(), id]
  );
}

export async function deleteScheduledTask(id: number): Promise<void> {
  await init();
  await pool.query(`DELETE FROM scheduled_tasks WHERE id = $1`, [id]);
}

export async function countTodayPendingTasks(todayStr: string): Promise<number> {
  await init();
  const res = await pool.query(
    `SELECT COUNT(*) as cnt FROM scheduled_tasks WHERE due_date <= $1 AND completed_at IS NULL`,
    [todayStr]
  );
  return parseInt(res.rows[0].cnt);
}
