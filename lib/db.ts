import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

// Store local datetime (no Z suffix) so SQLite date() extracts local date correctly.
// Using toISOString() would store UTC, causing date extraction bugs in UTC- timezones.
function localISOString(d = new Date()): string {
  const p = (n: number, len = 2) => String(n).padStart(len, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}.${p(d.getMilliseconds(), 3)}`;
}

// In production (Railway), set DATA_DIR env var and mount a persistent volume there.
// Locally falls back to ./data/ relative to cwd.
const DATA_DIR = process.env.DATA_DIR ?? path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, "activities.db");

let _db: Database.Database | null = null;

function getDb(): Database.Database {
  if (_db) return _db;
  _db = new Database(DB_PATH);
  _db.pragma("journal_mode = WAL");
  _db.pragma("foreign_keys = ON");
  initSchema(_db);
  return _db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS activities (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT    NOT NULL,
      frequency  TEXT    NOT NULL CHECK(frequency IN ('daily', 'weekly', 'free')),
      xp_base    INTEGER NOT NULL DEFAULT 10,
      emoji      TEXT,
      color      TEXT    NOT NULL DEFAULT '#7c3aed',
      archived   INTEGER NOT NULL DEFAULT 0,
      created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );

    CREATE TABLE IF NOT EXISTS checkins (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      activity_id INTEGER NOT NULL REFERENCES activities(id),
      checked_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      xp_earned   INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS achievements (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      key         TEXT    NOT NULL UNIQUE,
      unlocked_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );

    CREATE TABLE IF NOT EXISTS user_stats (
      id       INTEGER PRIMARY KEY DEFAULT 1,
      total_xp INTEGER NOT NULL DEFAULT 0,
      level    INTEGER NOT NULL DEFAULT 1,
      last_seen TEXT   NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );

    INSERT OR IGNORE INTO user_stats (id, total_xp, level) VALUES (1, 0, 1);
  `);
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

export function getActivities(includeArchived = false): Activity[] {
  const db = getDb();
  if (includeArchived) {
    return db.prepare("SELECT * FROM activities ORDER BY created_at ASC").all() as Activity[];
  }
  return db.prepare("SELECT * FROM activities WHERE archived = 0 ORDER BY created_at ASC").all() as Activity[];
}

export function getActivity(id: number): Activity | null {
  const db = getDb();
  return (db.prepare("SELECT * FROM activities WHERE id = ?").get(id) as Activity) ?? null;
}

export function createActivity(data: Omit<Activity, "id" | "archived" | "created_at">): Activity {
  const db = getDb();
  const result = db
    .prepare(
      "INSERT INTO activities (name, frequency, xp_base, emoji, color) VALUES (@name, @frequency, @xp_base, @emoji, @color)"
    )
    .run(data);
  return getActivity(result.lastInsertRowid as number)!;
}

export function updateActivity(id: number, data: Partial<Omit<Activity, "id" | "created_at">>): Activity | null {
  const db = getDb();
  const fields = Object.keys(data)
    .map((k) => `${k} = @${k}`)
    .join(", ");
  db.prepare(`UPDATE activities SET ${fields} WHERE id = @id`).run({ ...data, id });
  return getActivity(id);
}

export function archiveActivity(id: number): void {
  const db = getDb();
  db.prepare("UPDATE activities SET archived = 1 WHERE id = ?").run(id);
}

// ─── Checkins ─────────────────────────────────────────────────────────────────

export function getCheckins(activityId: number): Checkin[] {
  const db = getDb();
  return db
    .prepare("SELECT * FROM checkins WHERE activity_id = ? ORDER BY checked_at DESC")
    .all(activityId) as Checkin[];
}

export function getAllCheckins(): Checkin[] {
  const db = getDb();
  return db.prepare("SELECT * FROM checkins ORDER BY checked_at DESC").all() as Checkin[];
}

export function getCheckinsByDate(date: string): Checkin[] {
  const db = getDb();
  // date = 'YYYY-MM-DD'
  return db
    .prepare("SELECT * FROM checkins WHERE date(checked_at) = date(?) ORDER BY checked_at DESC")
    .all(date) as Checkin[];
}

export function hasCheckinToday(activityId: number, localDateStr: string): boolean {
  const db = getDb();
  const row = db
    .prepare("SELECT COUNT(*) as cnt FROM checkins WHERE activity_id = ? AND date(checked_at) = date(?)")
    .get(activityId, localDateStr) as { cnt: number };
  return row.cnt > 0;
}

export function hasCheckinThisWeek(activityId: number, weekStart: string, weekEnd: string): boolean {
  const db = getDb();
  const row = db
    .prepare(
      "SELECT COUNT(*) as cnt FROM checkins WHERE activity_id = ? AND date(checked_at) >= date(?) AND date(checked_at) <= date(?)"
    )
    .get(activityId, weekStart, weekEnd) as { cnt: number };
  return row.cnt > 0;
}

export function createCheckin(activityId: number, xpEarned: number, at?: Date): Checkin {
  const db = getDb();
  const ts = localISOString(at);
  const result = db
    .prepare("INSERT INTO checkins (activity_id, checked_at, xp_earned) VALUES (?, ?, ?)")
    .run(activityId, ts, xpEarned);
  return db.prepare("SELECT * FROM checkins WHERE id = ?").get(result.lastInsertRowid) as Checkin;
}

export function getCheckinDatesForActivity(activityId: number): string[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT date(checked_at) as d FROM checkins WHERE activity_id = ? ORDER BY d DESC")
    .all(activityId) as { d: string }[];
  return rows.map((r) => r.d);
}

export function getTotalCheckinsCount(): number {
  const db = getDb();
  const row = db.prepare("SELECT COUNT(*) as cnt FROM checkins").get() as { cnt: number };
  return row.cnt;
}

export function getAllCheckinDatesFlat(): string[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT date(checked_at) as d FROM checkins ORDER BY d DESC")
    .all() as { d: string }[];
  return rows.map((r) => r.d);
}

export function getCheckinsCountToday(localDateStr: string): number {
  const db = getDb();
  // Count distinct activities checked today (for multitask achievement)
  const row = db
    .prepare("SELECT COUNT(DISTINCT activity_id) as cnt FROM checkins WHERE date(checked_at) = date(?)")
    .get(localDateStr) as { cnt: number };
  return row.cnt;
}

// ─── User Stats ───────────────────────────────────────────────────────────────

export function getUserStats(): UserStats {
  const db = getDb();
  return db.prepare("SELECT * FROM user_stats WHERE id = 1").get() as UserStats;
}

export function addXP(amount: number): UserStats {
  const db = getDb();
  db.prepare("UPDATE user_stats SET total_xp = total_xp + ?, last_seen = ? WHERE id = 1").run(
    amount,
    localISOString()
  );
  return getUserStats();
}

export function updateLevel(level: number): void {
  const db = getDb();
  db.prepare("UPDATE user_stats SET level = ? WHERE id = 1").run(level);
}

// ─── Achievements ─────────────────────────────────────────────────────────────

export function getAchievements(): Achievement[] {
  const db = getDb();
  return db.prepare("SELECT * FROM achievements ORDER BY unlocked_at ASC").all() as Achievement[];
}

export function hasAchievement(key: string): boolean {
  const db = getDb();
  const row = db.prepare("SELECT COUNT(*) as cnt FROM achievements WHERE key = ?").get(key) as { cnt: number };
  return row.cnt > 0;
}

export function unlockAchievement(key: string): Achievement | null {
  const db = getDb();
  if (hasAchievement(key)) return null;
  const now = new Date().toISOString();
  const result = db.prepare("INSERT INTO achievements (key, unlocked_at) VALUES (?, ?)").run(key, now);
  return db.prepare("SELECT * FROM achievements WHERE id = ?").get(result.lastInsertRowid) as Achievement;
}

export function getXpEarnedToday(localDateStr: string): number {
  const db = getDb();
  const row = db
    .prepare("SELECT COALESCE(SUM(xp_earned), 0) as total FROM checkins WHERE date(checked_at) = date(?)")
    .get(localDateStr) as { total: number };
  return row.total;
}
