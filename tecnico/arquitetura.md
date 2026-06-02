# Arquitetura — Daily Quest

## Stack
| Camada | Tecnologia |
|--------|-----------|
| Framework | Next.js 16 (App Router) |
| Linguagem | TypeScript |
| Estilo | Tailwind v4 + tokens CSS customizados |
| Banco | PostgreSQL via `pg` (sem ORM) |
| Deploy | Railway (Dockerfile) |
| Repo | github.com/Fafray/Dashboard-Gamificada |

## Estrutura de pastas (dentro de `app/`)
```
app/
├── app/                     ← rotas Next.js (App Router)
│   ├── page.tsx             ← dashboard principal (hoje)
│   ├── activities/          ← gerenciamento de atividades
│   ├── achievements/        ← conquistas
│   ├── history/             ← histórico e gráficos
│   └── api/                 ← endpoints REST
│       ├── activities/      ← CRUD de atividades
│       ├── checkins/        ← criar e deletar check-ins
│       └── stats/           ← estatísticas do usuário
├── components/              ← componentes React reutilizáveis
│   ├── DashboardClient.tsx  ← layout principal (client)
│   ├── ActivityCard.tsx     ← card de check-in
│   ├── HeroSection.tsx      ← nível + XP bar
│   ├── LevelUpOverlay.tsx   ← modal de level up
│   ├── AchievementToast.tsx ← toast de conquista
│   ├── AchievementsGrid.tsx ← grid de conquistas
│   ├── Heatmap.tsx          ← heatmap estilo GitHub
│   ├── XPChart.tsx          ← gráfico de XP (Recharts)
│   └── Nav.tsx              ← navegação + tema toggle
├── lib/
│   ├── db.ts                ← todas as queries PostgreSQL
│   └── gamification.ts      ← lógica de XP, nível, streak
└── public/
```

## Padrão de deploy
Push para `master` → Railway detecta → build via Dockerfile → deploy automático. Sem CI/CD adicional.

## Design system
- Tokens CSS em `app/globals.css` — dark/light via `data-theme` no `<html>`
- Variáveis: `--bg-base`, `--accent-violet`, `--accent-gold`, `--glow-teal`, etc.
- Fontes: Manrope (corpo) + Space Grotesk (números/títulos) via variáveis CSS
- Classes semânticas: `.act`, `.hero`, `.card`, `.panel`, `.ach-grid`, `.page`
- Animações: `sweep`, `bob`, `pulse-expand`, `xppop`, `flicker`, `spin`

## Convenções importantes
- Datas sem timezone: `checked_at` armazenado como local datetime (sem Z)
- Streak calculado dinamicamente — nunca armazenado no banco
- Queries diretas com `pg` — sem ORM, sem migrations automáticas
- Alterações de schema: rodar SQL manualmente no Railway ou via script
