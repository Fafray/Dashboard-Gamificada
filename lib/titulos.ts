import { nivelDoXp } from "./gamification";

// ─── Raridades ────────────────────────────────────────────────────────────────
export const RARIDADES = {
  comum:    { nome: "Comum",    cor: "#7e8da0" },
  raro:     { nome: "Raro",     cor: "#3ddbd9" },
  epico:    { nome: "Épico",    cor: "#9b8bff" },
  lendario: { nome: "Lendário", cor: "#efa527" },
} as const;

export type Raridade = keyof typeof RARIDADES;

export interface Bonus {
  tipo: "xp_global" | "xp_categoria" | "reduz_decay" | "streak_shield";
  mult?: number;
  categoria?: string;
}

export interface Titulo {
  id: string;
  nome: string;
  desc: string;
  emoji: string;
  raridade: Raridade;
  equipavel?: boolean;
  bonus?: Bonus;
  recompensa?: { xp?: number; pontos?: number };
  condicao: (stats: TituloStats) => boolean;
}

export interface TituloStats {
  totalCheckins: number;
  maxStreak: number;
  level: number;
  checkinsToday: number;
  checkinHour: number;
  consecutiveDays: number;
  atributos?: Record<string, number>;
  recuperouNivelPerdido?: boolean;
}

export const TITULOS: Titulo[] = [
  // ── Comuns ──────────────────────────────────────────────────────────────────
  {
    id: "primeiro_passo",
    nome: "Primeiro Passo",
    desc: "Complete sua primeira atividade",
    emoji: "🌱",
    raridade: "comum",
    recompensa: { xp: 10 },
    condicao: (s) => s.totalCheckins >= 1,
  },
  {
    id: "engrenando",
    nome: "Engrenando",
    desc: "10 check-ins no total",
    emoji: "⚙️",
    raridade: "comum",
    condicao: (s) => s.totalCheckins >= 10,
  },
  {
    id: "multitarefa",
    nome: "Multitarefa",
    desc: "3 ou mais missões em um único dia",
    emoji: "🎪",
    raridade: "comum",
    condicao: (s) => s.checkinsToday >= 3,
  },
  // ── Raros ───────────────────────────────────────────────────────────────────
  {
    id: "despertado",
    nome: "Despertado",
    desc: "Escape do E-RANK e alcance o D-RANK",
    emoji: "⭐",
    raridade: "raro",
    recompensa: { pontos: 2 },
    condicao: (s) => s.level >= 6,
  },
  {
    id: "streak_7",
    nome: "Uma Semana",
    desc: "7 dias seguidos em qualquer missão",
    emoji: "🔥",
    raridade: "raro",
    condicao: (s) => s.maxStreak >= 7,
  },
  {
    id: "madrugador",
    nome: "Madrugador",
    desc: "Faça check-in antes das 7h",
    emoji: "🌅",
    raridade: "raro",
    equipavel: true,
    bonus: { tipo: "xp_categoria", categoria: "saude", mult: 0.05 },
    condicao: (s) => s.checkinHour < 7,
  },
  {
    id: "coruja",
    nome: "Coruja",
    desc: "Check-in após as 22h",
    emoji: "🦉",
    raridade: "raro",
    condicao: (s) => s.checkinHour >= 22,
  },
  {
    id: "consistencia",
    nome: "Consistência",
    desc: "Pelo menos 1 missão por dia durante 7 dias seguidos",
    emoji: "🎖️",
    raridade: "raro",
    equipavel: true,
    bonus: { tipo: "xp_categoria", categoria: "disciplina", mult: 0.05 },
    condicao: (s) => s.consecutiveDays >= 7,
  },
  {
    id: "meio_centenario",
    nome: "Meio Centenário",
    desc: "50 check-ins no total",
    emoji: "🎯",
    raridade: "raro",
    condicao: (s) => s.totalCheckins >= 50,
  },
  {
    id: "especialista",
    nome: "Especialista",
    desc: "Leve um atributo até 15",
    emoji: "💡",
    raridade: "raro",
    equipavel: true,
    bonus: { tipo: "xp_global", mult: 0.05 },
    condicao: (s) => Object.values(s.atributos ?? {}).some((v) => v >= 15),
  },
  // ── Épicos ──────────────────────────────────────────────────────────────────
  {
    id: "streak_14",
    nome: "Duas Semanas",
    desc: "14 dias seguidos em qualquer missão",
    emoji: "⚡",
    raridade: "epico",
    condicao: (s) => s.maxStreak >= 14,
  },
  {
    id: "streak_30",
    nome: "Um Mês",
    desc: "30 dias seguidos em qualquer missão",
    emoji: "💎",
    raridade: "epico",
    recompensa: { pontos: 3 },
    condicao: (s) => s.maxStreak >= 30,
  },
  {
    id: "disciplina_ferro",
    nome: "Disciplina de Ferro",
    desc: "30 dias consecutivos sem falhar",
    emoji: "⛓️",
    raridade: "epico",
    recompensa: { pontos: 5 },
    condicao: (s) => s.consecutiveDays >= 30,
  },
  {
    id: "veterano",
    nome: "Veterano",
    desc: "Atingir nível 10",
    emoji: "🌟",
    raridade: "epico",
    condicao: (s) => s.level >= 10,
  },
  {
    id: "centenario",
    nome: "Centenário",
    desc: "100 check-ins no total",
    emoji: "💯",
    raridade: "epico",
    condicao: (s) => s.totalCheckins >= 100,
  },
  // ── Lendários ───────────────────────────────────────────────────────────────
  {
    id: "streak_100",
    nome: "Centurião",
    desc: "100 dias seguidos em qualquer missão",
    emoji: "👑",
    raridade: "lendario",
    equipavel: true,
    bonus: { tipo: "xp_global", mult: 0.1 },
    condicao: (s) => s.maxStreak >= 100,
  },
  {
    id: "mestre",
    nome: "Mestre",
    desc: "Atingir nível 20",
    emoji: "🔮",
    raridade: "lendario",
    equipavel: true,
    bonus: { tipo: "xp_global", mult: 0.05 },
    condicao: (s) => s.level >= 20,
  },
  {
    id: "renascido",
    nome: "Renascido das Cinzas",
    desc: "Recupere um nível que havia perdido",
    emoji: "🔱",
    raridade: "lendario",
    equipavel: true,
    bonus: { tipo: "reduz_decay", mult: 0.5 },
    condicao: (s) => s.recuperouNivelPerdido === true,
  },
  {
    id: "ano_habitos",
    nome: "Um Ano de Hábitos",
    desc: "365 check-ins no total",
    emoji: "🏆",
    raridade: "lendario",
    condicao: (s) => s.totalCheckins >= 365,
  },
];

export function getTituloDef(id: string): Titulo | undefined {
  return TITULOS.find((t) => t.id === id);
}

export function verificarTitulos(
  desbloqueados: string[],
  stats: TituloStats
): string[] {
  return TITULOS
    .filter((t) => !desbloqueados.includes(t.id) && t.condicao(stats))
    .map((t) => t.id);
}

export function bonusXpDoTitulo(tituloAtivoId: string | null | undefined, categoria: string | null | undefined): number {
  if (!tituloAtivoId) return 0;
  const t = getTituloDef(tituloAtivoId);
  if (!t?.bonus) return 0;
  if (t.bonus.tipo === "xp_global") return t.bonus.mult ?? 0;
  if (t.bonus.tipo === "xp_categoria" && t.bonus.categoria === categoria) return t.bonus.mult ?? 0;
  return 0;
}
