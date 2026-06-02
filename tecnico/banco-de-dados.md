# Banco de Dados — Daily Quest

## Ambiente
PostgreSQL no Railway. `DATABASE_URL` injetado automaticamente como variável de ambiente. Sem ORM — queries diretas via `pg` em `lib/db.ts`.

## Schema atual

### `users`
| Coluna | Tipo | Notas |
|--------|------|-------|
| id | SERIAL PK | |
| total_xp | INT | XP acumulado total |
| created_at | TIMESTAMP | |

### `activities`
| Coluna | Tipo | Notas |
|--------|------|-------|
| id | SERIAL PK | |
| name | VARCHAR | Nome da atividade |
| frequency | VARCHAR | `'daily'`, `'weekly'`, `'free'` |
| xp_base | INT | XP por check-in |
| emoji | VARCHAR | Emoji identificador |
| color | VARCHAR | Cor hex |
| archived | BOOLEAN | Se está arquivada |
| created_at | TIMESTAMP | |

### `checkins`
| Coluna | Tipo | Notas |
|--------|------|-------|
| id | SERIAL PK | |
| activity_id | INT | FK → activities |
| checked_at | TIMESTAMP | Local datetime sem timezone |
| xp_earned | INT | XP ganho neste check-in |

## Mudanças planejadas

### Rastreio numérico (`features/rastreio-numerico.md`)
```sql
ALTER TABLE activities ADD COLUMN target_value NUMERIC;
ALTER TABLE activities ADD COLUMN target_unit VARCHAR(20);
ALTER TABLE checkins ADD COLUMN actual_value NUMERIC;
```

### Frequência Nx por semana (`features/frequencia-nx-semana.md`)
```sql
-- frequency passa a aceitar 'nx_week' como valor
ALTER TABLE activities ADD COLUMN weekly_target INT;
-- weekly_target só relevante quando frequency = 'nx_week'
```

## Regras e convenções
- `checked_at` sempre sem timezone — evita problemas de fuso horário
- Streak não é armazenado — calculado dinamicamente em `lib/gamification.ts`
- Sem migrations automáticas — alterações de schema são SQL manual
- Sempre rodar ALTER TABLE no Railway antes de deployar código que depende da nova coluna
