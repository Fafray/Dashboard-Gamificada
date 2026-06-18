export interface Portrait {
  minLevel: number;
  maxLevel: number;
  src: string;
  rank: string;
  label: string;
  glowColor: string;
}

export const PORTRAITS: Portrait[] = [
  { minLevel:  1, maxLevel:  4,  src: "/characters/e-rank.jpg",          rank: "E-RANK",          label: "Iniciante",       glowColor: "rgba(0,150,200,.6)"  },
  { minLevel:  5, maxLevel:  9,  src: "/characters/d-rank.jpg",          rank: "D-RANK",          label: "Aprendiz",        glowColor: "rgba(0,180,232,.7)"  },
  { minLevel: 10, maxLevel: 14,  src: "/characters/c-rank.jpg",          rank: "C-RANK",          label: "Caçador",         glowColor: "rgba(0,200,255,.7)"  },
  { minLevel: 15, maxLevel: 19,  src: "/characters/b-rank.jpg",          rank: "B-RANK",          label: "Elite",           glowColor: "rgba(80,150,255,.7)" },
  { minLevel: 20, maxLevel: 29,  src: "/characters/a-rank.jpg",          rank: "A-RANK",          label: "Especial",        glowColor: "rgba(120,80,255,.8)" },
  { minLevel: 30, maxLevel: 49,  src: "/characters/s-rank.jpg",          rank: "S-RANK",          label: "S-Class",         glowColor: "rgba(180,80,255,.9)" },
  { minLevel: 50, maxLevel: 79,  src: "/characters/nacional.jpg",        rank: "NACIONAL",        label: "Nacional",        glowColor: "rgba(255,180,0,.9)"  },
  { minLevel: 80, maxLevel: 99,  src: "/characters/monarca.jpg",         rank: "MONARCA",         label: "Monarca",         glowColor: "rgba(180,0,255,1)"   },
  { minLevel: 100, maxLevel: 999, src: "/characters/rei-das-sombras.jpg", rank: "REI DAS SOMBRAS", label: "Rei das Sombras", glowColor: "rgba(100,0,200,1)"   },
];

export function getPortrait(level: number): Portrait {
  return PORTRAITS.find(p => level >= p.minLevel && level <= p.maxLevel) ?? PORTRAITS[0];
}
