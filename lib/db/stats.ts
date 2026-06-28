import { BALANCE } from "../config/balance";
import { pool, init, localISOString } from "./client";
import { registrarEvento } from "./events";

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
  vit_shield_used_at: string | null;
}

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

export async function subtrairXP(amount: number): Promise<UserStats> {
  await init();
  await pool.query(
    `UPDATE user_stats SET total_xp = GREATEST(0, total_xp - $1), last_seen = $2 WHERE id = 1`,
    [amount, localISOString()]
  );
  return getUserStats();
}

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

export async function aplicarDecaySeNecessario(tituloAtivoId: string | null): Promise<number> {
  await init();
  const stats = await getUserStats();
  if (!stats.ultima_atividade) return 0;

  const ultima = new Date(stats.ultima_atividade);
  const agora  = new Date();
  const diasParado = Math.floor((agora.getTime() - ultima.getTime()) / 86400000);
  if (diasParado < 1) return 0;

  const multiplicador = tituloAtivoId === "renascido" ? BALANCE.decay.renascidoReduction : 1;
  const taxaPorDia    = BALANCE.decay.ratePerDay * multiplicador;
  const perda         = Math.round(stats.total_xp * taxaPorDia * diasParado);
  if (perda <= 0) return 0;

  const novoXP = Math.max(0, stats.total_xp - perda);
  await pool.query(
    `UPDATE user_stats SET total_xp = $1, ultima_atividade = $2 WHERE id = 1`,
    [novoXP, localISOString()]
  );
  return perda;
}

export async function fecharDiasPassados(): Promise<number> {
  await init();
  const stats = await getUserStats();
  if (!stats.ultima_atividade) return 0;

  // Atividades diárias ativas (penalizadas individualmente)
  const dailyRes = await pool.query(
    `SELECT id, xp_base FROM activities WHERE archived = 0 AND frequency = 'daily'`
  );
  // Atividades nx_week ativas (usam penalidade flat por dia sem check-in)
  const nxRes = await pool.query(
    `SELECT COUNT(*) as cnt FROM activities WHERE archived = 0 AND frequency = 'nx_week'`
  );

  const dailyActs: { id: number; xp_base: number }[] = dailyRes.rows;
  const temNxWeek = parseInt(nxRes.rows[0].cnt) > 0;

  if (dailyActs.length === 0 && !temNxWeek) return 0;

  const hojeStr = localISOString().slice(0, 10);
  const refStr  = stats.ultimo_fechamento ?? stats.ultima_atividade.slice(0, 10);

  const diasParaVerificar: string[] = [];
  const cursor = new Date(refStr);
  cursor.setDate(cursor.getDate() + 1);
  while (cursor.toISOString().slice(0, 10) < hojeStr && diasParaVerificar.length < BALANCE.penalty.maxMissedDays) {
    diasParaVerificar.push(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() + 1);
  }

  if (diasParaVerificar.length === 0) {
    await pool.query(`UPDATE user_stats SET ultimo_fechamento = $1 WHERE id = 1`, [hojeStr]);
    return 0;
  }

  const { multiplier, min } = BALANCE.penalty.perMissedActivity;
  let totalPenalidade = 0;
  let atividadesPerdidas = 0;

  for (const dia of diasParaVerificar) {
    // Penalidade por atividade daily não feita
    for (const act of dailyActs) {
      const res = await pool.query(
        `SELECT COUNT(*) as cnt FROM checkins WHERE activity_id = $1 AND LEFT(checked_at, 10) = $2`,
        [act.id, dia]
      );
      if (parseInt(res.rows[0].cnt) === 0) {
        totalPenalidade += Math.max(min, Math.round(act.xp_base * multiplier));
        atividadesPerdidas++;
      }
    }

    // Para nx_week: penalidade flat por dia sem nenhum check-in
    if (temNxWeek) {
      const anyRes = await pool.query(
        `SELECT COUNT(*) as cnt FROM checkins WHERE LEFT(checked_at, 10) = $1`,
        [dia]
      );
      if (parseInt(anyRes.rows[0].cnt) === 0) {
        totalPenalidade += BALANCE.penalty.perMissedDay;
      }
    }
  }

  if (totalPenalidade > 0) {
    const novoXP = Math.max(0, stats.total_xp - totalPenalidade);
    await pool.query(
      `UPDATE user_stats SET total_xp = $1, ultimo_fechamento = $2 WHERE id = 1`,
      [novoXP, hojeStr]
    );
    await registrarEvento(
      "nivel_down",
      `Penalidade: ${atividadesPerdidas} missão${atividadesPerdidas !== 1 ? "ões" : ""} perdida${atividadesPerdidas !== 1 ? "s" : ""} em ${diasParaVerificar.length} dia${diasParaVerificar.length > 1 ? "s" : ""} (−${totalPenalidade} XP)`,
      { penalidade: totalPenalidade, atividades_perdidas: atividadesPerdidas, dias_verificados: diasParaVerificar.length }
    );
  } else {
    await pool.query(`UPDATE user_stats SET ultimo_fechamento = $1 WHERE id = 1`, [hojeStr]);
  }

  return totalPenalidade;
}

export async function equiparTitulo(id: string | null): Promise<void> {
  await init();
  await pool.query(`UPDATE user_stats SET titulo_ativo_id = $1 WHERE id = 1`, [id]);
}

export async function useVitShield(dateStr: string): Promise<void> {
  await init();
  await pool.query(`UPDATE user_stats SET vit_shield_used_at = $1 WHERE id = 1`, [dateStr]);
}

export function vitShieldAvailable(stats: UserStats, todayStr: string): boolean {
  if (!stats.vit_shield_used_at) return true;
  const used = new Date(stats.vit_shield_used_at);
  const today = new Date(todayStr);
  const diffDays = Math.floor((today.getTime() - used.getTime()) / 86400000);
  return diffDays >= BALANCE.perks.vit.shieldCooldownDays;
}

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
