# Feature — Rastreio Numérico

> **O que é:** Check-in com valor real registrado e comparado contra uma meta definida na atividade
> **Status:** Especificada — aguardando implementação

## Problema que resolve
Hábitos como "beber 2L de água" ou "dormir 8h" não são binários. O usuário quer registrar o valor real do dia e acompanhar a evolução ao longo do tempo — saber, por exemplo, que em média bebeu 1.8L por dia no mês.

## Como funciona

### Na criação/edição da atividade
- Campo opcional: "Meta diária" (valor numérico + unidade)
- Exemplos: `2 L`, `8 h`, `30 min`, `10 páginas`
- Se preenchido, o check-in desse hábito vira numérico

### No check-in do dia
- Input: "Quanto você fez hoje?" com campo numérico
- Feedback imediato: "2.3L / meta 2L ✓" ou "1.5L / meta 2L — faltou pouco"
- XP: cheio se atingiu a meta, parcial se ficou abaixo *(regra a definir)*

### No histórico
- Gráfico de linha por atividade: valor real por dia
- Resumo mensal: média diária, dias que bateu a meta, melhor dia registrado

## Mudanças no banco de dados
```sql
-- Na tabela activities
ALTER TABLE activities ADD COLUMN target_value NUMERIC;
ALTER TABLE activities ADD COLUMN target_unit VARCHAR(20);

-- Na tabela checkins
ALTER TABLE checkins ADD COLUMN actual_value NUMERIC;
```

## Mudanças na UI
- `ActivityForm`: campos opcionais de meta (valor + unidade)
- `ActivityCard`: input numérico no lugar do botão de check-in quando a atividade tem meta
- `history/page.tsx`: gráfico por atividade com valor real (além do XP)

## Dependências
Nenhuma — feature independente.

## Dúvidas em aberto
- [ ] XP parcial quando não bate a meta: sim ou não? Qual proporção?
- [ ] Unidades: lista predefinida (L, h, min, km, páginas) ou texto livre?
- [ ] O que acontece se o usuário registrar mais que o dobro da meta? (ex: meta 2L, registrou 5L)
