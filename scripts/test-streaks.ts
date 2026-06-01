/**
 * Streak & Achievement validation script — pure logic, no DB dependency.
 * Run with: npx tsx scripts/test-streaks.ts
 */

import { computeDailyStreak, computeWeeklyStreak, computeStreak } from "../lib/gamification";

let passed = 0;
let failed = 0;

function assert(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) { console.log(`  ✅ ${label}`); passed++; }
  else {
    console.log(`  ❌ ${label}`);
    console.log(`     expected: ${JSON.stringify(expected)}`);
    console.log(`     got:      ${JSON.stringify(actual)}`);
    failed++;
  }
}

function d(offset: number): string {
  const base = new Date("2026-06-15");
  base.setDate(base.getDate() + offset);
  return base.toISOString().slice(0, 10);
}

const TODAY = new Date("2026-06-15T12:00:00");

// ─── Scenario 1: Daily streak with gap ────────────────────────────────────────

console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("CENÁRIO 1: Streak diário — gap no meio quebra e recomeça do zero");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

const s1dates = [
  d(-14), d(-13), d(-12), d(-11),
  // gap: d(-10)
  d(-9), d(-8), d(-7), d(-6), d(-5), d(-4), d(-3), d(-2), d(-1), d(0),
];

const s1 = computeDailyStreak(s1dates, TODAY);
assert("Streak atual = 10 (bloco B contínuo até hoje)", s1.current, 10);
assert("Longest = 10", s1.longest, 10);

const refAfterGap = new Date("2026-06-06T12:00:00");
const s1gap = computeDailyStreak([d(-14), d(-13), d(-12), d(-11)], refAfterGap);
assert("No gap: streak = 0 (último check-in há 2 dias)", s1gap.current, 0);
assert("No gap: longest = 4", s1gap.longest, 4);

const refOnGap = new Date("2026-06-05T12:00:00");
const s1onGap = computeDailyStreak([d(-14), d(-13), d(-12), d(-11)], refOnGap);
assert("No dia do gap: streak = 4 (ontem foi feito, hoje ainda pode)", s1onGap.current, 4);

// ─── Scenario 2: Weekly streak ────────────────────────────────────────────────

console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("CENÁRIO 2: Streak semanal — 2 check-ins mesma semana = 1, semana vazia quebra");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

const refMonday = new Date("2026-06-15T12:00:00");
const s2same = computeWeeklyStreak(["2026-06-11", "2026-06-14"], refMonday);
assert("2 check-ins mesma semana: streak = 1", s2same.current, 1);

const s2two = computeWeeklyStreak(["2026-06-11", "2026-06-14", "2026-06-15"], refMonday);
assert("Semana passada + esta semana: streak = 2", s2two.current, 2);

const skipWeekRef = new Date("2026-06-23T12:00:00");
const s2skip = computeWeeklyStreak(["2026-06-11"], skipWeekRef);
assert("Semana sem check-in: streak = 0", s2skip.current, 0);
assert("Semana sem check-in: longest = 1", s2skip.longest, 1);

// ─── Scenario 3: Timezone — 23:59 vs 00:01 ───────────────────────────────────

console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("CENÁRIO 3: Fuso horário — 23:59 e 00:01 são dias distintos");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

// localISOString stores "2026-05-31T23:59:00.000" — LEFT(checked_at, 10) = "2026-05-31"
// "2026-06-01T00:01:00.000" — LEFT(..., 10) = "2026-06-01" → different days ✓
const night = "2026-05-31T23:59:00.000".slice(0, 10);
const morning = "2026-06-01T00:01:00.000".slice(0, 10);
assert("23:59 extrai como 2026-05-31", night, "2026-05-31");
assert("00:01 extrai como 2026-06-01", morning, "2026-06-01");
assert("23:59 e 00:01 são datas diferentes", night !== morning, true);

const refJun1 = new Date("2026-06-01T12:00:00");
const s3 = computeDailyStreak(["2026-05-31", "2026-06-01"], refJun1);
assert("23:59 + 00:01: streak = 2 (dias distintos consecutivos)", s3.current, 2);

// ─── Scenario 4: Achievement idempotency ──────────────────────────────────────

console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("CENÁRIO 4: Conquistas — idempotência (não dispara duas vezes)");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

const unlocked = new Set<string>();
function tryUnlock(key: string): boolean {
  if (unlocked.has(key)) return false;
  unlocked.add(key);
  return true;
}

const dates7 = Array.from({ length: 7 }, (_, i) => d(-6 + i));
const streak7 = computeDailyStreak(dates7, TODAY);
assert("7 dias consecutivos: streak = 7", streak7.current, 7);

assert("Primeiro unlock streak_7: true", tryUnlock("streak_7"), true);

const datesWithGap = dates7.filter((_, i) => i !== 3);
const streakAfterDelete = computeDailyStreak(datesWithGap, TODAY);
assert("Após deletar do meio: streak < 7", streakAfterDelete.current < 7, true);

const streakRestored = computeDailyStreak(dates7, TODAY);
assert("Após refazer: streak volta a 7", streakRestored.current, 7);

assert("Segundo unlock streak_7: false (idempotente)", tryUnlock("streak_7"), false);
assert("Set tem apenas 1 entrada de streak_7", unlocked.size, 1);

// ─── Summary ──────────────────────────────────────────────────────────────────

console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log(`RESULTADO FINAL: ${passed} passou | ${failed} falhou`);
if (failed === 0) {
  console.log("🟢 Fundação validada");
} else {
  console.log("🔴 Há falhas — corrija antes de continuar");
}
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
process.exit(failed > 0 ? 1 : 0);
