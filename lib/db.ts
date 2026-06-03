import { Pool } from "pg";

function localISOString(d = new Date()): string {
  const p = (n: number, len = 2) => String(n).padStart(len, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}.${p(d.getMilliseconds(), 3)}`;
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
});

let schemaReady: Promise<void> | null = null;

function init(): Promise<void> {
  if (schemaReady) return schemaReady;
  schemaReady = (async () => {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS activities (
        id           SERIAL  PRIMARY KEY,
        name         TEXT    NOT NULL,
        frequency    TEXT    NOT NULL DEFAULT 'daily',
        xp_base      INTEGER NOT NULL DEFAULT 10,
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
        checked_at  TEXT    NOT NULL,
        xp_earned   INTEGER NOT NULL
      )
    `);
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_checkin_day
        ON checkins (activity_id, LEFT(checked_at, 10))
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

    // ── Migrations ────────────────────────────────────────────────────────────
    // Rastreio numérico
    await pool.query(`ALTER TABLE activities ADD COLUMN IF NOT EXISTS target_value NUMERIC`);
    await pool.query(`ALTER TABLE activities ADD COLUMN IF NOT EXISTS target_unit  VARCHAR(20)`);
    await pool.query(`ALTER TABLE checkins   ADD COLUMN IF NOT EXISTS actual_value NUMERIC`);
    // Frequência Nx por semana
    await pool.query(`ALTER TABLE activities ADD COLUMN IF NOT EXISTS weekly_target INTEGER`);
    // Expand frequency constraint to include nx_week
    await pool.query(`ALTER TABLE activities DROP CONSTRAINT IF EXISTS activities_frequency_check`);
    await pool.query(`
      ALTER TABLE activities ADD CONSTRAINT activities_frequency_check
        CHECK(frequency IN ('daily', 'weekly', 'free', 'nx_week'))
    `);
    // Atributos + Classe
    await pool.query(`ALTER TABLE activities ADD COLUMN IF NOT EXISTS categoria TEXT`);
    await pool.query(`
      ALTER TABLE user_stats
        ADD COLUMN IF NOT EXISTS atributos JSONB NOT NULL DEFAULT '{"FOR":0,"VIT":0,"AGI":0,"INT":0,"PER":0}'
    `);
    await pool.query(`
      ALTER TABLE user_stats
        ADD COLUMN IF NOT EXISTS pontos_disponiveis INTEGER NOT NULL DEFAULT 0
    `);
    // Hardcore / Títulos
    await pool.query(`ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS nivel_maximo_atingido INTEGER NOT NULL DEFAULT 1`);
    await pool.query(`ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS titulo_ativo_id TEXT`);
    await pool.query(`ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS ultima_atividade TEXT`);
    await pool.query(`ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS ultimo_fechamento TEXT`);
    // Sistema de eventos (timeline / gráfico de nível)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS events (
        id    SERIAL  PRIMARY KEY,
        tipo  TEXT    NOT NULL,
        texto TEXT    NOT NULL,
        data  TEXT    NOT NULL,
        extra JSONB
      )
    `);
  })();
  return schemaReady;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type Frequency = "daily" | "weekly" | "free" | "nx_week";

export interface Activity {
  id: number;
  name: string;
  frequency: Frequency;
  xp_base: number;
  emoji: string | null;
  color: string;
  archived: number;
  created_at: string;
  target_value: number | null;
  target_unit: string | null;
  weekly_target: number | null;
  categoria: string | null;
}

export interface Checkin {
  id: number;
  activity_id: number;
  checked_at: string;
  xp_earned: number;
  actual_value: number | null;
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
  atributos: { FOR: number; VIT: number; AGI: number; INT: number; PER: number };
  pontos_disponiveis: number;
  nivel_maximo_atingido: number;
  titulo_ativo_id: string | null;
  ultima_atividade: string | null;
  ultimo_fechamento: string | null;
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
    `INSERT INTO activities (name, frequency, xp_base, emoji, color, target_value, target_unit, weekly_target, categoria, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
    [data.name, data.frequency, data.xp_base, data.emoji, data.color,
     data.target_value ?? null, data.target_unit ?? null, data.weekly_target ?? null,
     data.categoria ?? null, localISOString()]
  );
  return (await getActivity(res.rows[0].id))!;
}

const ACTIVITY_ALLOWED_KEYS = new Set([
  "name", "frequency", "xp_base", "emoji", "color", "archived",
  "target_value", "target_unit", "weekly_target", "categoria",
]);

export async function updateActivity(
  id: number,
  data: Partial<Omit<Activity, "id" | "created_at">>
): Promise<Activity | null> {
  await init();
  const keys = Object.keys(data).filter((k) => ACTIVITY_ALLOWED_KEYS.has(k)) as (keyof typeof data)[];
  if (keys.length === 0) return getActivity(id);
  const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(", ");
  const values = keys.map((k) => data[k]);
  await pool.query(`UPDATE activities SET ${setClause} WHERE id = $${keys.length + 1}`, [...values, id]);
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
  at?: Date
): Promise<Checkin> {
  await init();
  const res = await pool.query(
    `INSERT INTO checkins (activity_id, checked_at, xp_earned, actual_value) VALUES ($1, $2, $3, $4) RETURNING *`,
    [activityId, localISOString(at), xpEarned, actualValue ?? null]
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
): Promise<{ id: number; xp_earned: number } | null> {
  await init();
  const res = await pool.query(
    `SELECT id, xp_earned FROM checkins WHERE activity_id = $1 AND LEFT(checked_at, 10) = $2 ORDER BY checked_at DESC LIMIT 1`,
    [activityId, localDateStr]
  );
  return res.rows[0] ?? null;
}

export async function getLastCheckinThisWeek(
  activityId: number, weekStart: string, weekEnd: string
): Promise<{ id: number; xp_earned: number } | null> {
  await init();
  const res = await pool.query(
    `SELECT id, xp_earned FROM checkins
     WHERE activity_id = $1 AND LEFT(checked_at, 10) >= $2 AND LEFT(checked_at, 10) <= $3
     ORDER BY checked_at DESC LIMIT 1`,
    [activityId, weekStart, weekEnd]
  );
  return res.rows[0] ?? null;
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

// ─── Player Attributes ────────────────────────────────────────────────────────

export async function investirPonto(attr: string): Promise<UserStats> {
  await init();
  await pool.query(
    `UPDATE user_stats
     SET atributos = jsonb_set(atributos, $1, ((atributos->$2)::int + 1)::text::jsonb),
         pontos_disponiveis = GREATEST(0, pontos_disponiveis - 1)
     WHERE id = 1 AND pontos_disponiveis > 0`,
    [`{${attr}}`, attr]
  );
  return getUserStats();
}

export async function addPontosDisponiveis(count: number): Promise<void> {
  await init();
  await pool.query(
    `UPDATE user_stats SET pontos_disponiveis = pontos_disponiveis + $1 WHERE id = 1`,
    [count]
  );
}

// Sincroniza nivelMaximoAtingido e concede pontos por recordes (anti-farm)
export async function sincronizarNivelMaximo(nivelAtual: number): Promise<number> {
  await init();
  const stats = await getUserStats();
  const nivelMax = stats.nivel_maximo_atingido ?? 1;
  if (nivelAtual > nivelMax) {
    const ganhos = (nivelAtual - nivelMax) * 3;
    await pool.query(
      `UPDATE user_stats SET nivel_maximo_atingido = $1, pontos_disponiveis = pontos_disponiveis + $2 WHERE id = 1`,
      [nivelAtual, ganhos]
    );
    return ganhos;
  }
  return 0;
}

export async function setUltimaAtividade(isoStr: string): Promise<void> {
  await init();
  await pool.query(`UPDATE user_stats SET ultima_atividade = $1 WHERE id = 1`, [isoStr]);
}

// Aplica decay de XP por inatividade (3% por dia, mínimo 0)
export async function aplicarDecaySeNecessario(tituloAtivoId: string | null): Promise<number> {
  await init();
  const stats = await getUserStats();
  if (!stats.ultima_atividade) return 0;

  const ultima = new Date(stats.ultima_atividade);
  const agora  = new Date();
  const diasParado = Math.floor((agora.getTime() - ultima.getTime()) / 86400000);
  if (diasParado < 1) return 0;

  // Título "renascido" reduz decay pela metade
  const multiplicador = tituloAtivoId === "renascido" ? 0.5 : 1;
  const taxaPorDia    = 0.03 * multiplicador;
  const perda         = Math.round(stats.total_xp * taxaPorDia * diasParado);
  if (perda <= 0) return 0;

  const novoXP = Math.max(0, stats.total_xp - perda);
  await pool.query(
    `UPDATE user_stats SET total_xp = $1, ultima_atividade = $2 WHERE id = 1`,
    [novoXP, localISOString()]
  );
  return perda;
}

// Fecha dias passados sem checkin: aplica −xpPenalidade por dia perdido.
// Roda na abertura do app (Opção A). Cap de 7 dias para não punir demais quem volta
// de férias. Só age se o jogador já tem histórico (ultima_atividade preenchida).
export async function fecharDiasPassados(xpPenalidade = 24): Promise<number> {
  await init();
  const stats = await getUserStats();

  // Sem histórico → novo jogador, não pune
  if (!stats.ultima_atividade) return 0;

  // Só faz sentido se existem atividades obrigatórias (daily / nx_week)
  const actRes = await pool.query(
    `SELECT COUNT(*) as cnt FROM activities WHERE archived = 0 AND frequency IN ('daily','nx_week')`
  );
  if (parseInt(actRes.rows[0].cnt) === 0) return 0;

  const hojeStr  = localISOString().slice(0, 10);
  const refStr   = stats.ultimo_fechamento ?? stats.ultima_atividade.slice(0, 10);

  // Itera de refStr+1 até ontem (exclusive de hoje), limitado a 7 dias
  const diasParaVerificar: string[] = [];
  const cursor = new Date(refStr);
  cursor.setDate(cursor.getDate() + 1);

  while (cursor.toISOString().slice(0, 10) < hojeStr && diasParaVerificar.length < 7) {
    diasParaVerificar.push(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() + 1);
  }

  // Atualiza o marcador mesmo se não há dias a verificar
  if (diasParaVerificar.length === 0) {
    await pool.query(`UPDATE user_stats SET ultimo_fechamento = $1 WHERE id = 1`, [hojeStr]);
    return 0;
  }

  let diasPerdidos = 0;
  for (const dia of diasParaVerificar) {
    const res = await pool.query(
      `SELECT COUNT(*) as cnt FROM checkins WHERE LEFT(checked_at, 10) = $1`,
      [dia]
    );
    if (parseInt(res.rows[0].cnt) === 0) diasPerdidos++;
  }

  const penalidade = diasPerdidos * xpPenalidade;

  if (penalidade > 0) {
    const novoXP = Math.max(0, stats.total_xp - penalidade);
    await pool.query(
      `UPDATE user_stats SET total_xp = $1, ultimo_fechamento = $2 WHERE id = 1`,
      [novoXP, hojeStr]
    );
    await registrarEvento(
      "nivel_down",
      `Penalidade: ${diasPerdidos} dia${diasPerdidos > 1 ? "s" : ""} sem missões (−${penalidade} XP)`,
      { penalidade, dias_perdidos: diasPerdidos }
    );
  } else {
    await pool.query(`UPDATE user_stats SET ultimo_fechamento = $1 WHERE id = 1`, [hojeStr]);
  }

  return penalidade;
}

export async function equiparTitulo(id: string | null): Promise<void> {
  await init();
  await pool.query(`UPDATE user_stats SET titulo_ativo_id = $1 WHERE id = 1`, [id]);
}

export async function subtrairXP(amount: number): Promise<UserStats> {
  await init();
  await pool.query(
    `UPDATE user_stats SET total_xp = GREATEST(0, total_xp - $1), last_seen = $2 WHERE id = 1`,
    [amount, localISOString()]
  );
  return getUserStats();
}

// ─── Stats para Títulos ───────────────────────────────────────────────────────

export async function getMaxCheckinsOnDay(): Promise<number> {
  await init();
  const res = await pool.query(`
    SELECT COALESCE(MAX(cnt), 0) as max
    FROM (
      SELECT COUNT(*) as cnt FROM checkins GROUP BY LEFT(checked_at, 10)
    ) t
  `);
  return parseInt(res.rows[0].max);
}

export async function getMaxCategoriasOnDay(): Promise<number> {
  await init();
  const res = await pool.query(`
    SELECT COALESCE(MAX(cnt), 0) as max
    FROM (
      SELECT LEFT(c.checked_at, 10) as dia, COUNT(DISTINCT a.categoria) as cnt
      FROM checkins c
      JOIN activities a ON c.activity_id = a.id
      WHERE a.categoria IS NOT NULL
      GROUP BY LEFT(c.checked_at, 10)
    ) t
  `);
  return parseInt(res.rows[0].max);
}

// Verifica se o usuário teve algum dia com checkins em TODAS as atividades diárias
export async function getTeveDiaPerfeito(): Promise<boolean> {
  await init();
  const totalDiarias = await pool.query(
    `SELECT COUNT(*) as cnt FROM activities WHERE archived = 0 AND frequency = 'daily'`
  );
  const total = parseInt(totalDiarias.rows[0].cnt);
  if (total === 0) return false;

  const res = await pool.query(`
    SELECT COUNT(*) as cnt
    FROM (
      SELECT LEFT(checked_at, 10) as dia, COUNT(DISTINCT activity_id) as n
      FROM checkins
      GROUP BY LEFT(checked_at, 10)
      HAVING COUNT(DISTINCT activity_id) >= $1
    ) t
  `, [total]);
  return parseInt(res.rows[0].cnt) > 0;
}

// ─── Events ───────────────────────────────────────────────────────────────────

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

// Returns level-per-day history built from nivel_up/nivel_down events.
// Falls back to [{ date: today, nivel: currentLevel }] if no history yet.
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
