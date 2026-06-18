// Balanceamento do jogo — todos os parâmetros em um lugar
export const BALANCE = {
  streak: {
    tier1Min:  3,   tier1Mult: 1.25,
    tier2Min:  7,   tier2Mult: 1.50,
    tier3Min: 14,   tier3Mult: 2.00,
  },
  decay: {
    ratePerDay:        0.03,  // 3% do XP total por dia parado
    renascidoReduction: 0.5,  // título "renascido" reduz pela metade
  },
  penalty: {
    perMissedDay:  24,  // XP perdido por dia sem check-in
    maxMissedDays:  7,  // cap de dias verificados no fechamento
    once: {
      min:              30,  // penalidade mínima de missão única falhada
      xpBaseMultiplier:  3,  // = xp_base * 3
    },
  },
  perks: {
    threshold: 5,  // pontos mínimos para ativar qualquer perk
    agi: {
      hourLimit: 9,     // antes das Xh da manhã
      bonus:     0.15,  // +15% XP
    },
    int: {
      bonus: 0.10,  // +10% XP em estudo
    },
    per: {
      bonus: 0.20,  // +20% XP na missão bônus
    },
    vit: {
      shieldCooldownDays: 30,  // 1 falta perdoada a cada X dias
    },
    for: {
      tier0To1: 3,   // streak 0-2 → sobe para tier1 (1.25x)
      tier1To2: 7,   // streak 3-6 → sobe para tier2 (1.5x)
      tier2Max: 14,  // streak 7-13 → sobe para tier3 (2.0x), acima já é max
    },
  },
  graduation: {
    thresholds: [21, 42, 66] as const,  // dias para sugerir evoluir o mínimo
  },
  checkin: {
    beyondMultiplier: 1.25,  // bônus ao fazer "além" do mínimo
    keystoneBonus:    0.10,  // hábito-âncora: +10% do XP das outras atividades
  },
  combo: {
    base:        15,  // XP base ao completar todas as diárias
    agiPerPoints: 3,  // +1 XP combo por cada N pontos em AGI
  },
  attributes: {
    pointsPerLevel: 3,  // pontos de atributo ganhos por nível acima do recorde
  },
} as const;
