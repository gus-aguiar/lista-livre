# Contribuindo / Contributing

Obrigado por ajudar o Lista Livre! Aceitamos issues e pull requests em português ou inglês.

## Preparar o ambiente

1. Faça um fork e clone o projeto.
2. Use Node.js 24 (`nvm use`, se usar nvm) e execute `npm ci`.
3. Execute `npm run import -- 2023` para uma base inicial pequena, ou `npm run import` para todos os anos disponíveis.
4. Execute `npm run dev` e abra http://localhost:5173.
5. Crie uma branch para sua alteração: `git switch -c feat/minha-melhoria`.

## Antes de abrir um PR

```sh
npm run format
npm run format:check
npm test
npm run build
```

Para mudanças de interface ou no fluxo de listas, execute também `npm run test:browser` após importar os dados. Se não houver Chrome instalado, use `npx playwright install chromium`. Inclua uma captura da interface quando ajudar na revisão.

Descreva o problema, o comportamento resultante e como verificou a alteração. Prefira PRs focados. Para uma mudança grande, abra uma issue primeiro.

## Dados e testes

- Não inclua bancos SQLite, listas pessoais, credenciais ou arquivos `.env`.
- Não inclua o snapshot de provas no PR: mantenha a importação reproduzível e documente a fonte.
- Use questões próprias e claramente sintéticas nos testes automatizados. Elas não devem aparecer como provas reais no aplicativo.
- Não atribua assuntos sugeridos automaticamente ao INEP. Mantenha a distinção entre metadados de origem e classificação editorial.
- Para adicionar fontes, documente esquema, procedência, deduplicação e condições de uso em `docs/SOURCES.md`.
- Preserve controles por teclado, layout mobile e impressão legível.

## English

Fork and clone the repository, use Node.js 24, run `npm ci`, import questions, then start `npm run dev`. Use a focused branch and describe the problem, resulting behavior and validation in your pull request. Run formatting, tests and build before submitting; run the browser test for UI/list-flow changes.

Never commit personal databases, secrets or downloaded exam datasets. Use original synthetic test fixtures and document provenance for new data sources. Keep keyboard access, responsive layouts and print output working. Contributions to original project code are made under its MIT license.
