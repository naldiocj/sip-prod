# Dia 3 — RBAC e autenticação

## Objetivo

Implementar os perfis funcionais, herança hierárquica de permissões e autenticação JWT.

## Perfis

`diretor_geral`, `diretor_nacional`, `chefe_departamento`, `chefe_seccao`, `instrutor`, `oficial_secretaria`, `agente_piquete` e `procurador`.

O perfil `procurador` é externo e não participa na herança interna.

## Tarefas

- Criar os modelos `Role`, `Permission` e `UserRole`.
- Implementar herança de permissões entre roles.
- Criar permissões para actos, processos, entradas PGR, peças, despachos, relatórios e auditoria.
- Criar `PermissionsGuard` e o decorator `@RequirePermissions`.
- Implementar access token de 15 minutos.
- Implementar refresh token de 7 dias com rotação.
- Criar seed dos 8 perfis e permissões.

## Critério de conclusão

- Login devolve JWT com roles e permissões efetivas.
- Endpoints protegidos rejeitam utilizadores sem permissão.
- `diretor_nacional` herda permissões dos níveis inferiores.
- Testes de herança passam.
- As palavras-passe são guardadas apenas com hash seguro e nunca em texto simples.
- Refresh tokens usados ou revogados não podem ser reutilizados.
- Respostas `401` e `403` são diferenciadas corretamente.
- Os testes cobrem login inválido, token expirado, refresh rotation e acesso sem permissão.
- Realizar um commit significativo com a mensagem `feat(auth): implement hierarchical rbac and jwt`.
