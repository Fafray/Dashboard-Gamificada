import type { Atributos } from "./attributes";

const THRESHOLD = 5;

// AGI: +15% XP em qualquer check-in antes das 9h
export function agiMorningBonus(atributos: Atributos, hour: number): number {
  if (atributos.AGI < THRESHOLD || hour >= 9) return 0;
  return 0.15;
}

// FOR: sobe um tier de multiplier de streak em atividades de treino
export function forStreakBoosted(streak: number, atributos: Atributos, categoria: string | null): number {
  if (atributos.FOR < THRESHOLD || categoria !== "treino") return streak;
  if (streak >= 14) return streak; // já no máximo
  if (streak >= 7)  return 14;    // 1.5x → 2.0x
  if (streak >= 3)  return 7;     // 1.25x → 1.5x
  return 3;                        // 1.0x → 1.25x
}

// INT: +10% XP em atividades de estudo
export function intStudyBonus(atributos: Atributos, categoria: string | null): number {
  if (atributos.INT < THRESHOLD || categoria !== "estudo") return 0;
  return 0.10;
}

// PER: missão bônus do dia — ID determinístico baseado na data
export function getDailyBonusMissionId(activityIds: number[], date: Date): number | null {
  if (activityIds.length === 0) return null;
  const start = new Date(date.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((date.getTime() - start.getTime()) / 86400000);
  const idx = (date.getFullYear() * 366 + dayOfYear) % activityIds.length;
  return activityIds[idx];
}

// PER: +20% XP se a atividade for a missão bônus do dia
export function perBonusMissionBonus(atributos: Atributos, activityId: number, bonusMissionId: number | null): number {
  if (atributos.PER < THRESHOLD || activityId !== bonusMissionId) return 0;
  return 0.20;
}

// Descreve quais perks estão ativos (para tooltip / log)
export function describePerksAtivos(
  atributos: Atributos,
  hora: number,
  categoria: string | null,
  isBonusMission: boolean,
  shieldActivated: boolean
): string[] {
  const ativos: string[] = [];
  if (agiMorningBonus(atributos, hora) > 0)                         ativos.push("☀️ Manhã (AGI)");
  if (forStreakBoosted(0, atributos, categoria) !== 0)              ativos.push("💪 Treino (FOR)");
  if (intStudyBonus(atributos, categoria) > 0)                      ativos.push("📚 Estudo (INT)");
  if (perBonusMissionBonus(atributos, 1, isBonusMission ? 1 : 0) > 0) ativos.push("🎯 Missão (PER)");
  if (shieldActivated)                                               ativos.push("🛡️ Escudo (VIT)");
  return ativos;
}
