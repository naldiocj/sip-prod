# Dia 6 — Frontend e middleware RBAC

## Objetivo

Criar os ecrãs essenciais e proteger as rotas por perfil.

## Tarefas

- Criar `/login`.
- Criar `/piquete/novo-acto` com formulário dinâmico baseado em `schemaCampos`.
- Criar `/piquete/actos`, `/processos`, `/processos/[id]`, `/secretaria/entradas` e `/procuradoria/despachos`.
- Redirecionar utilizadores sem autenticação para `/login`.
- Redirecionar utilizadores sem role adequado para `/403`.
- Guardar o JWT em cookie `httpOnly`.
- Criar o componente condicional `Can`.

## Regras de acesso

| Rota            | Roles                            |
| --------------- | -------------------------------- |
| `/piquete`      | `agente_piquete`, `chefe_seccao` |
| `/secretaria`   | `oficial_secretaria`             |
| `/instrucao`    | `instrutor`, `chefe_seccao`      |
| `/procuradoria` | `procurador`                     |

## Critério de conclusão

- Login funciona e guarda o token em cookie seguro.
- Middleware bloqueia rotas por role.
- Formulário dinâmico renderiza os campos de `schemaCampos`.
- Fluxo Piquete → Processo → Peça funciona no browser.
- Estados de carregamento, sucesso e erro são apresentados nos formulários principais.
- O utilizador não consegue aceder a dados ou ações apenas removendo elementos da interface.
- As rotas principais funcionam em desktop e mobile sem sobreposição de conteúdo.
- Formulários validam campos obrigatórios e apresentam mensagens claras ao utilizador.
- Realizar um commit significativo com a mensagem `feat(web): add rbac screens and process workflow`.
