export type AttrKey = "FOR" | "VIT" | "AGI" | "INT" | "PER";
export type Atributos = Record<AttrKey, number>;

export const ATTR_LABELS: Record<AttrKey, string> = {
  FOR: "Força",
  VIT: "Vitalidade",
  AGI: "Agilidade",
  INT: "Inteligência",
  PER: "Percepção",
};

export const CATEGORIA_ATRIBUTO: Record<string, AttrKey> = {
  saude:      "VIT",
  treino:     "FOR",
  estudo:     "INT",
  disciplina: "AGI",
  foco:       "PER",
};

export const CATEGORIA_LABELS: Record<string, string> = {
  saude:      "Saúde",
  treino:     "Treino",
  estudo:     "Estudo",
  disciplina: "Disciplina",
  foco:       "Foco",
};

export const CLASSES: Record<AttrKey, { nome: string; cor: string }> = {
  FOR: { nome: "Guerreiro", cor: "#e24b4a" },
  VIT: { nome: "Sentinela", cor: "#1d9e75" },
  AGI: { nome: "Veloz",     cor: "#efa527" },
  INT: { nome: "Mago",      cor: "#9b8bff" },
  PER: { nome: "Vidente",   cor: "#3b82f6" },
};

export interface ClasseInfo {
  nome: string;
  cor: string;
  attr: AttrKey | "—";
}

export const CLASSE_VERSATIL: ClasseInfo = { nome: "Versátil", cor: "#0096c7", attr: "—" };

export function derivarClasse(atributos: Atributos): ClasseInfo {
  const entries = Object.entries(atributos) as [AttrKey, number][];
  const max = Math.max(...entries.map(([, v]) => v));
  const lideres = entries.filter(([, v]) => v === max);
  if (max === 0 || lideres.length !== 1) return CLASSE_VERSATIL;
  const [attr] = lideres[0];
  return { ...CLASSES[attr], attr };
}

export function xpComBonus(
  xpBase: number,
  categoria: string | null | undefined,
  atributos: Atributos
): number {
  if (!categoria) return xpBase;
  const attr = CATEGORIA_ATRIBUTO[categoria];
  const pontos = attr ? (atributos[attr] ?? 0) : 0;
  return Math.round(xpBase * (1 + pontos * 0.02));
}

export const ATTR_ORDER: AttrKey[] = ["FOR", "VIT", "AGI", "INT", "PER"];
