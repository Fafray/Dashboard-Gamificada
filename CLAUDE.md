# Daily Quest — Sistema Nervoso do Ecossistema

## O que é este projeto
Dashboard gamificada de hábitos pessoais. Stack: Next.js 16 + TypeScript + Tailwind v4 + PostgreSQL. Deploy: Railway automático via push no `master`. Repo: github.com/Fafray/Dashboard-Gamificada. Código em `app/`.

## Mapa do ecossistema

| Pasta | O que cobre | Quando consultar |
|-------|-------------|-----------------|
| `produto/` | Visão, roadmap, direção do produto | Priorização, "o que construir agora" |
| `features/` | Especificações de features individuais | Antes de implementar qualquer coisa nova |
| `ux/` | Design de interação, princípios visuais | Decisões de interface, feedback, motivação |
| `tecnico/` | Arquitetura, banco de dados, deploy | Mudanças estruturais no código |
| `analise/` | Métricas, uso, performance | Avaliar o que está funcionando |
| `agente/` | Comportamento do orquestrador | Sempre — define como este agente opera |

## Estado atual do app (v1 — em produção)
- Dashboard do dia: check-in binário, XP bar, streaks
- Gerenciamento de atividades: criar, editar, arquivar
- Conquistas: 16 badges com progresso
- Navegação entre 4 telas (hoje, atividades, conquistas, histórico)
- Frequências disponíveis: `daily`, `weekly`, `free`
- Streak calculado dinamicamente do histórico
- Redesign de UI aplicado: design system completo com tokens CSS Aurora

## O que está faltando (identificado na entrevista de fundação)
- Rastreio de valor numérico (ex: 2L de água, 8h de sono) → `features/rastreio-numerico.md`
- Frequência "Nx por semana" (ex: fisioterapia 3x) → `features/frequencia-nx-semana.md`
- Histórico analítico por hábito (resumo com valores reais)
- Mais itens a descobrir nas próximas sessões

## Regra de sessão
1. Ler `STATUS.md` — estado atual e próximo passo acordado
2. Ler este `CLAUDE.md` — carregar mapa completo
3. Ler `agente/SISTEMA.md` — carregar comportamento
4. Aguardar input do usuário — não despejar contexto

## Detecção de lacunas
Se o usuário mencionar algo sem estrutura correspondente, criar proativamente:
- Notificações / lembretes → seção em `ux/` ou `features/notificacoes.md`
- Integrações externas → criar `integracoes/`
- Múltiplos usuários / social → `produto/expansao.md`
- App mobile → criar `mobile/` com decisões de plataforma
- Qualquer outro escopo novo → avaliar se merece pasta própria ou arquivo em pasta existente
