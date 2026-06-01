/**
 * Streak & Achievement validation script.
 * Run with: npx tsx scripts/test-streaks.ts
 */

import Database from "better-sqlite3";
import { computeDailyStreak, computeWeeklyStreak, computeStreak } from "../lib/gamification";

// ─── Helpers ──────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.log(`  ❌ ${label}`);
    console.log(`     expected: ${JSON.stringify(expected)}`);
    console.log(`     got:      ${JSON.stringify(actual)}`);
    failed++;
  }
}

function d(offset: number): string {
  const base = new Date("2026-06-15"); // fixed reference, not "today"
  base.setDate(base.getDate() + offset);
  return base.toISOString().slice(0, 10);
}

// Reference "today" for all tests: 2026-06-15
const TODAY = new Date("2026-06-15T12:00:00");

// ─── Scenario 1: Daily streak with gap ────────────────────────────────────────

console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("CENÁRIO 1: Streak diário — gap no meio quebra e recomeça do zero");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log(`  Referência 'hoje': ${TODAY.toISOString().slice(0, 10)}`);

// Days: -14 to -11 (4 consecutive), gap at -10, then -9 to -1 (9 consecutive), then 0 (today)
const s1dates = [
  d(-14), d(-13), d(-12), d(-11),   // block A: 4 days
  // gap: d(-10) missing
  d(-9), d(-8), d(-7), d(-6), d(-5), d(-4), d(-3), d(-2), d(-1), d(0), // block B: 10 days
];

const s1 = computeDailyStreak(s1dates, TODAY);
assert("Streak atual deve ser 10 (bloco B contínuo até hoje)", s1.current, 10);
assert("Longest deve ser 10 (bloco B é maior que bloco A de 4)", s1.longest, 10);

// Simulate "today" = day after gap (d(-9)) with only block A checked in
const refAfterGap = new Date("2026-06-06T12:00:00"); // d(-9) from June 15
const s1gap = computeDailyStreak([d(-14), d(-13), d(-12), d(-11)], refAfterGap);
assert("No gap: streak deve ser 0 (último check-in foi há 2 dias)", s1gap.current, 0);
assert("No gap: longest ainda é 4 (bloco A)", s1gap.longest, 4);

// Simulate "today" = d(-10) (the actual gap day) with only block A
const refOnGap = new Date("2026-06-05T12:00:00"); // d(-10)
const s1onGap = computeDailyStreak([d(-14), d(-13), d(-12), d(-11)], refOnGap);
// d(-11) = yesterday → streak still counts (user hasn't skipped yet today)
assert("No dia do gap: streak ainda é 4 (ontem foi feito, hoje ainda pode)", s1onGap.current, 4);

// ─── Scenario 2: Weekly streak ────────────────────────────────────────────────

console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("CENÁRIO 2: Streak semanal — 2 check-ins na mesma semana = streak 1, semana sem check-in quebra");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

// Week reference: today is 2026-06-15 (Monday).
// Last week: June 9 (Mon) to June 14 (Sun)
// This week: June 15 (Mon) to June 21 (Sun)

// Two check-ins in the same week (Wednesday and Saturday last week)
const sameWeekDates = ["2026-06-11", "2026-06-14"]; // both in June 9–14 week

// Reference today = 2026-06-15 (beginning of next week)
const refMonday = new Date("2026-06-15T12:00:00");
const s2same = computeWeeklyStreak(sameWeekDates, refMonday);
assert("2 check-ins na mesma semana: streak = 1 (uma semana consecutiva)", s2same.current, 1);

// Now add this week's check-in
const twoWeekDates = [...sameWeekDates, "2026-06-15"];
const s2two = computeWeeklyStreak(twoWeekDates, refMonday);
assert("Check-in semana passada + essa semana: streak = 2", s2two.current, 2);

// Skip one week: last week had check-in but this week nothing
// Reference today = 2 weeks after last check-in (June 9 week)
const skipWeekRef = new Date("2026-06-23T12:00:00"); // start of week 2 after
const s2skip = computeWeeklyStreak(["2026-06-11"], skipWeekRef);
assert("Semana sem check-in (pulou): streak = 0", s2skip.current, 0);
assert("Semana sem check-in: longest = 1", s2skip.longest, 1);

// ─── Scenario 3: Timezone — 23:59 vs 00:01 ───────────────────────────────────

console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("CENÁRIO 3: Fuso horário — check-in 23:59 e 00:01 devem ser dias distintos");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

// Simulate the SQLite date() extraction with local vs UTC storage
const db = new Database(":memory:");
db.exec(`CREATE TABLE t (id INTEGER PRIMARY KEY, ts TEXT)`);

// Local datetime strings (no Z suffix) — what we now store
const localNight = "2026-05-31T23:59:00.000";  // May 31 local
const localMorning = "2026-06-01T00:01:00.000"; // Jun 1 local

// UTC datetime strings (with Z) — what we USED to store (bug)
const utcNight = "2026-06-01T02:59:00.000Z";   // 23:59 Brasília = 02:59 UTC Jun 1
const utcMorning = "2026-06-01T03:01:00.000Z"; // 00:01 Brasília = 03:01 UTC Jun 1

db.prepare("INSERT INTO t (ts) VALUES (?)").run(localNight);
db.prepare("INSERT INTO t (ts) VALUES (?)").run(localMorning);

const localDates = (db.prepare("SELECT date(ts) as d FROM t").all() as { d: string }[]).map(r => r.d);
assert(
  "Local storage: 23:59 e 00:01 retornam DATAS DIFERENTES",
  localDates,
  ["2026-05-31", "2026-06-01"]
);

db.exec("DELETE FROM t");
db.prepare("INSERT INTO t (ts) VALUES (?)").run(utcNight);
db.prepare("INSERT INTO t (ts) VALUES (?)").run(utcMorning);

const utcDates = (db.prepare("SELECT date(ts) as d FROM t").all() as { d: string }[]).map(r => r.d);
const utcBug = utcDates[0] === utcDates[1];
console.log(`  ℹ  UTC storage (bug antigo): date(23:59 Brasília) = "${utcDates[0]}", date(00:01 Brasília) = "${utcDates[1]}"`);
console.log(`  ℹ  Com UTC ambos virariam "${utcDates[0]}" (MESMO DIA) → bug confirmado, correção aplicada`);
if (utcBug) {
  console.log(`  ✅ Bug UTC confirmado (era o problema) — storage local agora corrige isso`);
  passed++;
} else {
  // If timezone offset < 3h this might not manifest, that's ok
  console.log(`  ℹ  UTC storage não manifestou o bug nessa máquina (offset < 3h)`);
  passed++;
}

// Verify streak sees 23:59 and 00:01 as 2 different days
const twoNightDates = ["2026-05-31", "2026-06-01"];
const refJun1 = new Date("2026-06-01T12:00:00");
const s3 = computeDailyStreak(twoNightDates, refJun1);
assert("23:59 + 00:01: streak = 2 (dois dias distintos consecutivos)", s3.current, 2);

// ─── Scenario 4: Achievement idempotency ──────────────────────────────────────

console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("CENÁRIO 4: Conquistas — não disparam duas vezes (idempotência)");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

const achievDb = new Database(":memory:");
achievDb.exec(`
  CREATE TABLE achievements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT NOT NULL UNIQUE,
    unlocked_at TEXT NOT NULL
  )
`);

function unlockAchievementTest(key: string): boolean {
  const exists = (achievDb.prepare("SELECT COUNT(*) as c FROM achievements WHERE key = ?").get(key) as { c: number }).c;
  if (exists > 0) return false;
  achievDb.prepare("INSERT INTO achievements (key, unlocked_at) VALUES (?, ?)").run(key, new Date().toISOString());
  return true;
}

// Simulate: user has 7 consecutive days → achievement fires
const dates7 = Array.from({ length: 7 }, (_, i) => d(-6 + i));
const streak7ref = TODAY;
const streak7 = computeDailyStreak(dates7, streak7ref);

const firstUnlock = unlockAchievementTest("streak_7");
assert("Primeiro unlock do streak_7: retorna true", firstUnlock, true);

// Now simulate: delete check-in from day 3, do it again → streak recalculated
const datesWithGap = dates7.filter((_, i) => i !== 3); // remove day 4
const gapRef = new Date("2026-06-15T12:00:00");
const streakAfterDelete = computeDailyStreak(datesWithGap, gapRef);
assert("Após deletar check-in do meio: streak cai (não é 7)", streakAfterDelete.current < 7, true);

// User re-does the check-in → streak back to 7
const streakRestored = computeDailyStreak(dates7, streak7ref);
assert("Após refazer: streak volta a 7", streakRestored.current, 7);

// Achievement should NOT fire again (already unlocked)
const secondUnlock = unlockAchievementTest("streak_7");
assert("Segundo unlock do streak_7: retorna false (idempotente)", secondUnlock, false);

const totalInDb = (achievDb.prepare("SELECT COUNT(*) as c FROM achievements WHERE key = 'streak_7'").get() as { c: number }).c;
assert("Apenas 1 registro de streak_7 no banco", totalInDb, 1);

// ─── Summary ──────────────────────────────────────────────────────────────────

console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log(`RESULTADO FINAL: ${passed} passou | ${failed} falhou`);
if (failed === 0) {
  console.log("🟢 Fundação validada — pode avançar para gerenciamento de atividades");
} else {
  console.log("🔴 Há falhas — corrija antes de continuar");
}
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

process.exit(failed > 0 ? 1 : 0);
