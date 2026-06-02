# Resumo — Técnico

## O que esta pasta cobre
Arquitetura do sistema, schema do banco de dados, decisões técnicas e configuração de deploy.

## Quando consultar esta pasta
Antes de qualquer mudança estrutural: nova tabela, nova rota de API, mudança de dependência, configuração de ambiente, decisão de arquitetura.

## Mapa de arquivos
| Arquivo | Quando usar | Sinal de busca |
|---------|-------------|----------------|
| `arquitetura.md` | Visão geral da stack e estrutura de código | Next.js, componentes, rotas, deploy, fontes |
| `banco-de-dados.md` | Schema atual, mudanças planejadas, migrations | tabelas, colunas, ALTER TABLE, PostgreSQL |

## Conexões com outras pastas
| Se o contexto for... | Consulte também... | Motivo |
|----------------------|--------------------|--------|
| Implementar feature nova | `features/` | Spec define o que muda no banco e na UI |
| Decisão de visual/animação | `ux/` | Stack CSS é parte da arquitetura |
| Priorização da implementação | `produto/roadmap.md` | Roadmap define a ordem |

## Quando criar novo arquivo aqui
- Nova integração externa → `integracoes/[nome].md`
- Decisão técnica importante com alternativas pesadas → `decisoes/[assunto].md`
- Configuração de ambiente ou CI/CD → `ambiente.md`
