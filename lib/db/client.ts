import { Pool } from "pg";

export function localISOString(d = new Date()): string {
  const p = (n: number, len = 2) => String(n).padStart(len, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}.${p(d.getMilliseconds(), 3)}`;
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
});

let schemaReady: Promise<void> | null = null;

export function init(): Promise<void> {
  if (schemaReady) return schemaReady;
  schemaReady = (async () => {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS activities (
        id           SERIAL  PRIMARY KEY,
        name         TEXT    NOT NULL,
        frequency    TEXT    NOT NULL DEFAULT 'daily',
        emoji        TEXT,
        color        TEXT    NOT NULL DEFAULT '#7c3aed',
        archived     INTEGER NOT NULL DEFAULT 0,
        created_at   TEXT    NOT NULL
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS checkins (
        id          SERIAL  PRIMARY KEY,
        activity_id INTEGER NOT NULL REFERENCES activities(id),
        checked_at  TEXT    NOT NULL
      )
    `);
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_checkin_day
        ON checkins (activity_id, LEFT(checked_at, 10))
    `);

    // ── Migrations ────────────────────────────────────────────────────────────
    // Rastreio numérico
    await pool.query(`ALTER TABLE activities ADD COLUMN IF NOT EXISTS target_value NUMERIC`);
    await pool.query(`ALTER TABLE activities ADD COLUMN IF NOT EXISTS target_unit  VARCHAR(20)`);
    await pool.query(`ALTER TABLE checkins   ADD COLUMN IF NOT EXISTS actual_value NUMERIC`);
    // Frequência Nx por semana
    await pool.query(`ALTER TABLE activities ADD COLUMN IF NOT EXISTS weekly_target INTEGER`);
    // Categoria (tag livre de organização)
    await pool.query(`ALTER TABLE activities ADD COLUMN IF NOT EXISTS categoria TEXT`);
    // Dias específicos da semana para atividades semanais
    await pool.query(`ALTER TABLE activities ADD COLUMN IF NOT EXISTS scheduled_days TEXT`);
    // Missão única com deadline
    await pool.query(`ALTER TABLE activities ADD COLUMN IF NOT EXISTS due_date TEXT`);
    await pool.query(`ALTER TABLE activities DROP CONSTRAINT IF EXISTS activities_frequency_check`);
    await pool.query(`
      ALTER TABLE activities ADD CONSTRAINT activities_frequency_check
        CHECK(frequency IN ('daily', 'weekly', 'free', 'nx_week', 'once'))
    `);
    // Agenda — tarefas pontuais com data futura
    await pool.query(`
      CREATE TABLE IF NOT EXISTS scheduled_tasks (
        id           SERIAL PRIMARY KEY,
        name         TEXT NOT NULL,
        emoji        TEXT,
        due_date     TEXT NOT NULL,
        due_time     TEXT,
        category     TEXT,
        notes        TEXT,
        completed_at TEXT,
        created_at   TEXT NOT NULL
      )
    `);
    // PWA — lembretes por atividade e assinaturas push
    await pool.query(`ALTER TABLE activities ADD COLUMN IF NOT EXISTS notify_at TEXT`);
    await pool.query(`ALTER TABLE scheduled_tasks ADD COLUMN IF NOT EXISTS notify_enabled BOOLEAN DEFAULT FALSE`);
    await pool.query(`ALTER TABLE scheduled_tasks ADD COLUMN IF NOT EXISTS notify_date TEXT`);
    await pool.query(`ALTER TABLE scheduled_tasks ADD COLUMN IF NOT EXISTS notify_time TEXT`);
    await pool.query(`ALTER TABLE scheduled_tasks ADD COLUMN IF NOT EXISTS notified_at TEXT`);
    await pool.query(`ALTER TABLE scheduled_tasks ADD COLUMN IF NOT EXISTS notify_repeat BOOLEAN DEFAULT FALSE`);
    await pool.query(`ALTER TABLE scheduled_tasks ADD COLUMN IF NOT EXISTS notify_sent_count INT DEFAULT 0`);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id         SERIAL PRIMARY KEY,
        endpoint   TEXT NOT NULL UNIQUE,
        p256dh     TEXT NOT NULL,
        auth       TEXT NOT NULL,
        created_at TEXT NOT NULL
      )
    `);
    // Retratos de rank trocáveis pela UI
    await pool.query(`
      CREATE TABLE IF NOT EXISTS portrait_overrides (
        rank       TEXT PRIMARY KEY,
        image      TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);
    // Biblioteca
    await pool.query(`
      CREATE TABLE IF NOT EXISTS books (
        id              SERIAL PRIMARY KEY,
        title           TEXT NOT NULL,
        author          TEXT,
        cover_image     TEXT,
        cover_thumbnail TEXT,
        description     TEXT,
        status          TEXT NOT NULL DEFAULT 'want',
        total_pages     INTEGER,
        current_page    INTEGER NOT NULL DEFAULT 0,
        rating          INTEGER,
        summary         TEXT,
        started_at      TEXT,
        finished_at     TEXT,
        created_at      TEXT NOT NULL,
        CONSTRAINT books_status_check CHECK (status IN ('want','reading','read'))
      )
    `);
    // Acervo de perfumes
    await pool.query(`
      CREATE TABLE IF NOT EXISTS perfumes (
        id                SERIAL PRIMARY KEY,
        name              TEXT NOT NULL,
        brand             TEXT,
        photo             TEXT,
        photo_thumbnail   TEXT,
        description       TEXT,
        status            TEXT NOT NULL DEFAULT 'owned',
        notes_top         TEXT,
        notes_heart       TEXT,
        notes_base        TEXT,
        rating            INTEGER,
        tags              TEXT,
        price             NUMERIC,
        created_at        TEXT NOT NULL,
        CONSTRAINT perfumes_status_check CHECK (status IN ('owned','wishlist'))
      )
    `);
    await pool.query(`ALTER TABLE perfumes ADD COLUMN IF NOT EXISTS pyramid_image     TEXT`);
    await pool.query(`ALTER TABLE perfumes ADD COLUMN IF NOT EXISTS pyramid_thumbnail TEXT`);
    await pool.query(`ALTER TABLE perfumes ADD COLUMN IF NOT EXISTS inspiration       TEXT`);

    // ── Remoção do sistema RPG (XP, níveis, atributos, títulos, conquistas) ────
    await pool.query(`DROP TABLE IF EXISTS achievements`);
    await pool.query(`DROP TABLE IF EXISTS user_stats`);
    await pool.query(`DROP TABLE IF EXISTS events`);
    await pool.query(`DROP TABLE IF EXISTS portrait_overrides`);
    await pool.query(`ALTER TABLE checkins   DROP COLUMN IF EXISTS xp_earned`);
    await pool.query(`ALTER TABLE checkins   DROP COLUMN IF EXISTS checkin_level`);
    await pool.query(`ALTER TABLE activities DROP COLUMN IF EXISTS xp_base`);
    await pool.query(`ALTER TABLE activities DROP COLUMN IF EXISTS is_keystone`);
    await pool.query(`ALTER TABLE activities DROP COLUMN IF EXISTS graduation_count`);
    await pool.query(`ALTER TABLE activities DROP COLUMN IF EXISTS micro_version`);
    await pool.query(`ALTER TABLE activities DROP COLUMN IF EXISTS anchor_context`);

    // Planner por horário — uma linha de texto livre por hora do dia
    await pool.query(`
      CREATE TABLE IF NOT EXISTS hourly_plans (
        id         SERIAL PRIMARY KEY,
        plan_date  TEXT    NOT NULL,
        hour       INTEGER NOT NULL,
        text       TEXT    NOT NULL,
        created_at TEXT    NOT NULL,
        updated_at TEXT    NOT NULL,
        UNIQUE(plan_date, hour)
      )
    `);
    // Planner — blocos com duração e conclusão
    await pool.query(`ALTER TABLE hourly_plans ADD COLUMN IF NOT EXISTS duration INTEGER NOT NULL DEFAULT 1`);
    await pool.query(`ALTER TABLE hourly_plans ADD COLUMN IF NOT EXISTS done BOOLEAN NOT NULL DEFAULT FALSE`);
    // Planner — lembrete push no início do bloco
    await pool.query(`ALTER TABLE hourly_plans ADD COLUMN IF NOT EXISTS notified_at TEXT`);
  })();
  return schemaReady;
}
