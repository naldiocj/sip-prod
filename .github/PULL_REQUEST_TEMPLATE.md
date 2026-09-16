## Checklist de Nomenclatura

- [ ] Todos os modelos novos têm `@@map("nome_snake_case_plural")`
- [ ] Todos os campos novos têm `@map("nome_snake_case")` quando necessário
- [ ] Índices seguem `idx_tabela_coluna`
- [ ] Foreign keys seguem `fk_tabela_referencia`
- [ ] Constraints únicas seguem `uq_tabela_coluna`
- [ ] A migração foi executada localmente sem perda de dados
- [ ] `pnpm ci` passa