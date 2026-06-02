# Feature — Frequência Nx por Semana

> **O que é:** Tipo de frequência onde o usuário define quantas vezes por semana quer realizar a atividade
> **Status:** Especificada — aguardando implementação

## Problema que resolve
"Fisioterapia 3x por semana" não é diário nem semanal. É uma meta de contagem dentro da semana — pode ser segunda, quarta e sexta, ou qualquer combinação. O sistema atual não suporta isso.

## Como funciona

### Na criação/edição da atividade
- Nova opção de frequência: "Nx por semana"
- Campo adicional: "Quantas vezes por semana?" (número inteiro, ex: 3)

### No card do dia
- Contador semanal visível: "1/3 esta semana"
- Check-in disponível em qualquer dia da semana
- Card fica verde quando bate a meta (ex: 3/3)
- Após bater a meta, check-in adicional ainda é possível (bônus)

### Streak
- Streak conta por semana: semana que bateu a meta = +1
- Semana que não bateu = streak quebra

### No histórico
- Semanas completas vs. incompletas
- Total de check-ins por semana ao longo do tempo

## Mudanças no banco de dados
```sql
-- Na tabela activities
-- frequency continua como VARCHAR mas aceita novo valor: 'nx_week'
ALTER TABLE activities ADD COLUMN weekly_target INT;
-- weekly_target só é usado quando frequency = 'nx_week'
```

## Mudanças na UI
- `ActivityForm`: nova opção de frequência + campo de quantidade
- `ActivityCard`: contador semanal (X/N) em vez de streak diário
- `lib/gamification.ts`: adaptar `computeStreak` para frequência semanal com meta

## Dependências
Nenhuma — feature independente.

## Dúvidas em aberto
- [ ] Se fizer 4x numa semana com meta de 3x — conta como 1 ou aparece como bônus?
- [ ] Dois check-ins no mesmo dia para a mesma atividade — permitir ou bloquear?
