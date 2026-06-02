# Status — Daily Quest

**Última atualização:** 2026-06-02

## Estado atual
- App em produção no Railway, commit `c7b36dc`
- Redesign completo: estética "Sistema" (Solo Leveling)
- Imagens de personagem por rank em `public/characters/`

## O que foi feito nas sessões anteriores

### Gamificação
- Bônus de milestone de streak (+15% 7d / +25% 14d / +50% 30d / +100% 100d)
- Bônus de conclusão diária (+10 XP por atividade ao fechar o dia)
- XP bar dourada + indicador "⚡ Faltam X XP" ao aproximar do level-up
- Bounce animation nos cards ao bater marcos de streak

### Feature: Rastreio Numérico
- `target_value` + `target_unit` em atividades
- `actual_value` em check-ins
- HUD input com barra de progresso teal → verde → dourado
- Formulário com toggle "Meta diária"

### Feature: Frequência Nx por Semana
- Tipo `nx_week` com `weekly_target`
- Pips circulares: vazio → teal → verde com pulse
- `computeNxWeekStreak()` para streak semanal

## O que foi feito nesta sessão

### Redesign Visual — Estética "Sistema" (Solo Leveling)
- **Paleta**: violeta/aurora → azul elétrico (`#0096c7`) + void-black
- **Fontes**: Manrope/Space Grotesk → Exo 2 (corpo) + Rajdhani (HUD/números)
- **Background**: dot grid (pontinhos 38px) + energy clouds, sem aurora
- **Corner brackets**: cantos em L nos cards (técnica CSS background-image)
- **Estado done**: verde → azul elétrico em tudo (cards, botões, banner, pips)
- **Rank system**: E-RANK → D → C → B → A → S → NACIONAL → MONARCA → REI DAS SOMBRAS

### Nav e Vocabulário
- Marca: "Daily Quest" → `[ SISTEMA ]` · RPG · Vida Real
- Navegação: Hoje/Atividades/Conquistas/Histórico → Sistema/Missões/Títulos/Registros
- Botões: "Fazer check-in" → COMPLETAR MISSÃO / MISSÃO CONCLUÍDA
- Labels: DIÁRIA / SEMANAL / LIVRE / ESTA SEM. / DIAS CONSECUTIVOS

### Painel do Jogador
- Portrait de personagem com imagem full-bleed por rank
- Nome "FABRICIO" em overlay com glow dinâmico por rank
- Fallback CSS (fundo escuro com LV.X) quando não há imagem
- Glow de cor diferente por rank (azul → roxo → dourado → violeta)

### Imagens de personagem adicionadas
- `public/characters/e-rank.jpg`
- `public/characters/d-rank.jpg`
- `public/characters/s-rank.jpg`
- `public/characters/monarca.jpg`
- `public/characters/rei-das-sombras.jpg`
- Faltando (mostram fallback): `c-rank.jpg`, `b-rank.jpg`, `a-rank.jpg`, `nacional.jpg`

## Próximo passo
Aguardando input do usuário.

## Backlog
- [ ] Adicionar imagens para C-RANK, B-RANK, A-RANK, NACIONAL
- [ ] Resumo mensal por hábito (valores reais no histórico)
- [ ] Melhorias de UX com uso real
- [ ] App mobile (longo prazo)
