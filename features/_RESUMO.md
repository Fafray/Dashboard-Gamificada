# Resumo — Features

## O que esta pasta cobre
Especificações completas de features novas do Daily Quest. Uma feature por arquivo — comportamento, mudanças no banco, mudanças na UI, dúvidas em aberto.

## Quando consultar esta pasta
Sempre antes de implementar qualquer funcionalidade nova. O arquivo da feature é a fonte da verdade: o que faz, como funciona, o que muda.

## Mapa de arquivos
| Arquivo | Quando usar | Sinal de busca |
|---------|-------------|----------------|
| `rastreio-numerico.md` | Implementar input de valor em check-ins | água, litros, horas, sono, meta, valor real, numérico |
| `frequencia-nx-semana.md` | Implementar novo tipo de frequência | 3x, fisioterapia, Nx, contador semanal, meta semanal |

## Conexões com outras pastas
| Se o contexto for... | Consulte também... | Motivo |
|----------------------|--------------------|--------|
| Priorizar qual feature implementar | `produto/roadmap.md` | Roadmap define a ordem |
| Decisão de UI da feature | `ux/` | Princípios definem como apresentar |
| Mudança no schema do banco | `tecnico/banco-de-dados.md` | Atualizar após implementar |

## Quando criar novo arquivo aqui
Sempre que uma feature nova tiver escopo suficientemente definido para ser implementada. Não criar spec sem entender o comportamento completo — perguntar antes.
