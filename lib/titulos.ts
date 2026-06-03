import { nivelDoXp } from "./gamification";

// ─── Raridades ────────────────────────────────────────────────────────────────
export const RARIDADES = {
  comum:    { nome: "Comum",    cor: "#7e8da0" },
  raro:     { nome: "Raro",     cor: "#3ddbd9" },
  epico:    { nome: "Épico",    cor: "#9b8bff" },
  lendario: { nome: "Lendário", cor: "#efa527" },
  mitico:   { nome: "Mítico",   cor: "#ff5277" },
} as const;

export type Raridade = keyof typeof RARIDADES;

// ─── Trilhas ──────────────────────────────────────────────────────────────────
export const TRILHAS = {
  sequencia:  { nome: "Sequência",  icone: "🔥" },
  dedicacao:  { nome: "Dedicação",  icone: "⚙️" },
  ascensao:   { nome: "Ascensão",   icone: "⬆️" },
  disciplina: { nome: "Disciplina", icone: "🎯" },
  maestria:   { nome: "Maestria",   icone: "🔮" },
  habitos:    { nome: "Hábitos",    icone: "⏰" },
  lendas:     { nome: "Lendas",     icone: "⚠️" },
  vocacao:    { nome: "Vocação",    icone: "🛡️" },
} as const;

export type TrilhaKey = keyof typeof TRILHAS;

// ─── Tipos ────────────────────────────────────────────────────────────────────
export interface Bonus {
  tipo: "xp_global" | "xp_categoria" | "reduz_decay" | "streak_shield";
  mult?: number;
  categoria?: string;
}

export interface PlayerEstado {
  streak: number;
  xpTotal: number;
  atributos: Record<string, number>;
}

export interface TituloStats {
  totalCheckins: number;
  maxMissoesNumDia: number;
  maxCategoriasNumDia: number;
  checkinAntesDas7: boolean;
  checkinApos22h: boolean;
  teveDiaPerfeito: boolean;
  diasComMissaoSeguidos: number;
  diasPerfeitosSeguidos: number;
  diasSemFalhar: number;
  sobreviveuAoRebaixamento: boolean;
  recuperouNivelPerdido: boolean;
  recuperouRankPerdido: boolean;
  vezesRenasceu: number;
  diasNaMesmaClasse: number;
}

export interface Titulo {
  id: string;
  trilha: TrilhaKey;
  nome: string;
  raridade: Raridade;
  desc: string;
  emoji: string;
  equipavel?: boolean;
  bonus?: Bonus;
  recompensa?: { xp?: number; pontos?: number };
  progresso: (p: PlayerEstado, s: TituloStats) => [number, number];
}

// Helpers usados nas funções de progresso
const cap  = (v: number, alvo: number): [number, number] => [Math.min(v, alvo), alvo];
const bool = (b: boolean): [number, number] => [b ? 1 : 0, 1];

// ─── Catálogo ─────────────────────────────────────────────────────────────────
export const TITULOS: Titulo[] = [

  // 🔥 SEQUÊNCIA
  { id: "uma_semana",    trilha: "sequencia", emoji: "🔥", nome: "Uma Semana",    raridade: "raro",     desc: "7 dias seguidos",   progresso: (p) => cap(p.streak, 7)   },
  { id: "duas_semanas",  trilha: "sequencia", emoji: "🔥", nome: "Duas Semanas",  raridade: "raro",     desc: "14 dias seguidos",  progresso: (p) => cap(p.streak, 14)  },
  { id: "um_mes",        trilha: "sequencia", emoji: "🔥", nome: "Um Mês",        raridade: "epico",    desc: "30 dias seguidos",  progresso: (p) => cap(p.streak, 30)  },
  { id: "centuriao",     trilha: "sequencia", emoji: "👑", nome: "Centurião",     raridade: "lendario", desc: "100 dias seguidos", progresso: (p) => cap(p.streak, 100),
    equipavel: true, bonus: { tipo: "xp_global", mult: 0.05 } },
  { id: "ano_de_chamas", trilha: "sequencia", emoji: "🌋", nome: "Ano de Chamas", raridade: "mitico",   desc: "365 dias seguidos", progresso: (p) => cap(p.streak, 365) },

  // ⚙️ DEDICAÇÃO
  { id: "primeiro_passo",  trilha: "dedicacao", emoji: "🌱", nome: "Primeiro Passo",    raridade: "comum",    desc: "Complete sua primeira atividade", progresso: (p, s) => cap(s.totalCheckins, 1),    recompensa: { xp: 10 } },
  { id: "engrenando",      trilha: "dedicacao", emoji: "⚙️", nome: "Engrenando",        raridade: "comum",    desc: "10 check-ins no total",           progresso: (p, s) => cap(s.totalCheckins, 10)   },
  { id: "meio_centenario", trilha: "dedicacao", emoji: "🎯", nome: "Meio Centenário",   raridade: "raro",     desc: "50 check-ins no total",           progresso: (p, s) => cap(s.totalCheckins, 50)   },
  { id: "centenario",      trilha: "dedicacao", emoji: "💯", nome: "Centenário",        raridade: "epico",    desc: "100 check-ins no total",          progresso: (p, s) => cap(s.totalCheckins, 100)  },
  { id: "um_ano_habitos",  trilha: "dedicacao", emoji: "🏆", nome: "Um Ano de Hábitos", raridade: "lendario", desc: "365 check-ins no total",          progresso: (p, s) => cap(s.totalCheckins, 365)  },
  { id: "lendario_vivo",   trilha: "dedicacao", emoji: "🌟", nome: "Lendário Vivo",     raridade: "mitico",   desc: "1000 check-ins no total",         progresso: (p, s) => cap(s.totalCheckins, 1000) },

  // ⬆️ ASCENSÃO
  { id: "despertado", trilha: "ascensao", emoji: "⭐", nome: "Despertado", raridade: "raro",     desc: "Alcance o D-RANK",   progresso: (p) => cap(nivelDoXp(p.xpTotal), 6),  recompensa: { pontos: 3 } },
  { id: "veterano",   trilha: "ascensao", emoji: "🌟", nome: "Veterano",   raridade: "epico",    desc: "Alcance o nível 10", progresso: (p) => cap(nivelDoXp(p.xpTotal), 10) },
  { id: "ascendente", trilha: "ascensao", emoji: "⚡", nome: "Ascendente", raridade: "epico",    desc: "Alcance o C-RANK",   progresso: (p) => cap(nivelDoXp(p.xpTotal), 11) },
  { id: "mestre",     trilha: "ascensao", emoji: "🔮", nome: "Mestre",     raridade: "lendario", desc: "Alcance o nível 20", progresso: (p) => cap(nivelDoXp(p.xpTotal), 20) },
  { id: "soberano",   trilha: "ascensao", emoji: "👑", nome: "Soberano",   raridade: "mitico",   desc: "Alcance o S-RANK",   progresso: (p) => cap(nivelDoXp(p.xpTotal), 41),
    equipavel: true, bonus: { tipo: "xp_global", mult: 0.10 } },

  // 🎯 DISCIPLINA
  { id: "dia_perfeito",     trilha: "disciplina", emoji: "✅", nome: "Dia Perfeito",        raridade: "comum",    desc: "Complete todas as missões de um dia", progresso: (p, s) => bool(s.teveDiaPerfeito)              },
  { id: "consistencia",     trilha: "disciplina", emoji: "🎖️", nome: "Consistência",       raridade: "raro",     desc: "Pelo menos 1 missão/dia por 7 dias",  progresso: (p, s) => cap(s.diasComMissaoSeguidos, 7)       },
  { id: "semana_impecavel", trilha: "disciplina", emoji: "💎", nome: "Semana Impecável",    raridade: "epico",    desc: "7 dias perfeitos seguidos",           progresso: (p, s) => cap(s.diasPerfeitosSeguidos, 7)       },
  { id: "disciplina_ferro", trilha: "disciplina", emoji: "⛓️", nome: "Disciplina de Ferro", raridade: "epico",    desc: "30 dias sem falhar",                  progresso: (p, s) => cap(s.diasSemFalhar, 30), recompensa: { pontos: 5 } },
  { id: "inquebravel",      trilha: "disciplina", emoji: "🏛️", nome: "Inquebravél",         raridade: "lendario", desc: "90 dias sem falhar",                  progresso: (p, s) => cap(s.diasSemFalhar, 90),
    equipavel: true, bonus: { tipo: "xp_global", mult: 0.05 } },

  // 🔮 MAESTRIA
  { id: "especialista",    trilha: "maestria", emoji: "💡", nome: "Especialista",    raridade: "raro",     desc: "Leve um atributo até 15",      progresso: (p) => cap(Math.max(0, ...Object.values(p.atributos)), 15),
    equipavel: true, bonus: { tipo: "xp_global", mult: 0.05 } },
  { id: "mestre_de_armas", trilha: "maestria", emoji: "⚔️", nome: "Mestre de Armas", raridade: "epico",    desc: "Dois atributos no máximo",     progresso: (p) => cap(Object.values(p.atributos).filter((v) => v >= 15).length, 2) },
  { id: "equilibrio",      trilha: "maestria", emoji: "⚖️", nome: "Equilíbrio",      raridade: "epico",    desc: "Todos os atributos ≥ 10",      progresso: (p) => cap(Object.values(p.atributos).filter((v) => v >= 10).length, 5) },
  { id: "polimata",        trilha: "maestria", emoji: "🧠", nome: "Polímata",        raridade: "lendario", desc: "Todos os atributos no máximo", progresso: (p) => cap(Object.values(p.atributos).filter((v) => v >= 15).length, 5) },

  // ⏰ HÁBITOS
  { id: "multitarefa", trilha: "habitos", emoji: "🎪", nome: "Multitarefa", raridade: "comum", desc: "3+ missões em um único dia",                progresso: (p, s) => cap(s.maxMissoesNumDia, 3) },
  { id: "madrugador",  trilha: "habitos", emoji: "🌅", nome: "Madrugador",  raridade: "raro",  desc: "Check-in antes das 7h",                     progresso: (p, s) => bool(s.checkinAntesDas7),
    equipavel: true, bonus: { tipo: "xp_categoria", categoria: "saude", mult: 0.05 } },
  { id: "coruja",      trilha: "habitos", emoji: "🦉", nome: "Coruja",      raridade: "raro",  desc: "Check-in após as 22h",                      progresso: (p, s) => bool(s.checkinApos22h)     },
  { id: "maratonista", trilha: "habitos", emoji: "🏃", nome: "Maratonista", raridade: "raro",  desc: "5+ missões em um único dia",                progresso: (p, s) => cap(s.maxMissoesNumDia, 5) },
  { id: "pentatleta",  trilha: "habitos", emoji: "🏅", nome: "Pentatleta",  raridade: "epico", desc: "Uma missão de cada categoria no mesmo dia", progresso: (p, s) => cap(s.maxCategoriasNumDia, 5) },

  // ⚠️ LENDAS
  { id: "sobrevivente", trilha: "lendas", emoji: "🛡️", nome: "Sobrevivente",         raridade: "epico",    desc: "Chegue a 1 XP do rebaixamento e volte a subir", progresso: (p, s) => bool(s.sobreviveuAoRebaixamento) },
  { id: "renascido",    trilha: "lendas", emoji: "🔱", nome: "Renascido das Cinzas",  raridade: "lendario", desc: "Recupere um nível que havia perdido",           progresso: (p, s) => bool(s.recuperouNivelPerdido),
    equipavel: true, bonus: { tipo: "reduz_decay", mult: 0.5 } },
  { id: "fenix",        trilha: "lendas", emoji: "🦅", nome: "Fênix",                 raridade: "lendario", desc: "Recupere um rank inteiro perdido",              progresso: (p, s) => bool(s.recuperouRankPerdido) },
  { id: "imortal",      trilha: "lendas", emoji: "♾️", nome: "Imortal",               raridade: "mitico",   desc: "Renasça das cinzas 3 vezes",                    progresso: (p, s) => cap(s.vezesRenasceu, 3),
    equipavel: true, bonus: { tipo: "reduz_decay", mult: 0.75 } },

  // 🛡️ VOCAÇÃO
  { id: "devoto", trilha: "vocacao", emoji: "🛡️", nome: "Devoto", raridade: "epico", desc: "Mantenha a mesma classe por 30 dias", progresso: (p, s) => cap(s.diasNaMesmaClasse, 30),
    equipavel: true, bonus: { tipo: "xp_global", mult: 0.05 } },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getTituloDef(id: string): Titulo | undefined {
  return TITULOS.find((t) => t.id === id);
}

export function verificarTitulos(
  desbloqueados: string[],
  player: PlayerEstado,
  stats: TituloStats
): string[] {
  return TITULOS
    .filter((t) => {
      if (desbloqueados.includes(t.id)) return false;
      const [atual, alvo] = t.progresso(player, stats);
      return atual >= alvo;
    })
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
