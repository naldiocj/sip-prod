# Dia 4 — Fluxo Piquete

## Objetivo

Registar um acto no Piquete e criar automaticamente um processo com numeração sequencial.

## Tarefas

- Criar `TipoActo`, `ActoPiquete` e `SequenciaNumeracao`.
- Implementar numeração sequencial com lock transacional.
- Criar o caso de uso `RegistarActoPiquete`.
- Publicar o evento `ActoPiqueteRegistado`.
- Criar o handler que instaura o processo.
- Criar `POST /actos-piquete`.
- Usar o formato `SIC/PIQ/LU/2026/000123`.
- Adicionar testes de integração e concorrência.

## Critério de conclusão

- O endpoint cria o acto e o processo.
- Não existem colisões com dois pedidos simultâneos.
- O processo fica associado ao acto.
- Dados obrigatórios e tipos de acto inválidos são rejeitados com erro de validação.
- Uma falha na criação do processo não deixa um acto parcialmente gravado.
- Repetir o mesmo pedido não cria associações duplicadas.
- O acesso ao endpoint exige a permissão `acto_piquete:criar`.
- Realizar um commit significativo com a mensagem `feat(piquete): create process from registered act`.
