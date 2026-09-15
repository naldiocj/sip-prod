# Dia 5 — Secretaria e peças processuais

## Objetivo

Registar entradas de processos vindos da PGR e gerar peças processuais em PDF.

## Tarefas

- Criar `EntradaProcesso`, `PecaProcessual` e `TemplateDocumento`.
- Implementar `RegistarEntradaPGR`.
- Guardar o número da procuradoria e gerar o número interno.
- Implementar `GeradorPecaPDF` com Puppeteer.
- Renderizar templates HTML com os dados da peça.
- Calcular e guardar o hash SHA-256 do PDF.
- Criar e seedar `AUTO_NOTICIA_V1`.
- Criar `POST /entradas-pgr` e `POST /processos/:id/pecas`.

## Critério de conclusão

- Entrada PGR cria um processo e guarda o número de origem.
- Uma peça processual gera PDF.
- O PDF possui hash SHA-256 guardado.
- O template seedado funciona.
- Entradas e peças validam os dados obrigatórios antes de serem persistidas.
- O hash guardado corresponde ao conteúdo final do PDF gerado.
- Templates inexistentes ou inativos produzem um erro controlado.
- Apenas utilizadores com as permissões adequadas podem registar entradas ou gerar peças.
- Realizar um commit significativo com a mensagem `feat(secretaria): register pgr entries and generate pdf`.
