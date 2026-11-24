# Lista Livre

**An open-source exercise-list builder for teachers.** Search real Brazilian ENEM exam questions, drag them into a worksheet, reorder, save and print with an optional separate answer key.

[Português](README.md) · [Contributing](CONTRIBUTING.md) · [MIT license](LICENSE)

![Lista Livre interface](docs/images/app.png)

Light and dark purple themes follow the system preference on first visit. Use the header toggle to save your preferred appearance; printed worksheets stay white.

## Quick start

Requires Node.js **24.x**, npm and internet for the initial data import. No API keys, accounts or external database required.

```sh
git clone https://github.com/gus-aguiar/lista-livre.git
cd lista-livre
npm ci
npm run import
npm run build
npm start
```

Open http://localhost:3000. Importing takes a few minutes. Use `npm run import -- 2023` for a faster, single-year import. This replaces the local question snapshot rather than appending to it.

The initial full import validated 2,722 real questions from 2009–2023 on September 18, 2026. Future imports depend on the upstream catalog. Imported content and personal lists are not committed to this repository.

## Development

```sh
npm run dev              # Vite :5173 + Express :3000
npm test                 # Independent API/search/persistence tests
npm run build
npm run format:check
npx playwright install chromium
npm run test:browser      # Requires imported questions; uses a temporary database
```

The browser test uses `CHROME_PATH`, an installed `/usr/bin/google-chrome`, or Playwright's Chromium. No existing lists are modified. CI runs tests, formatting and build without downloading third-party questions.

## Architecture and scope

React + Vite, Express, Node's built-in SQLite with FTS5. Fonts are bundled locally. See [API documentation](docs/API.md), [data provenance](docs/SOURCES.md), and [contribution guide](CONTRIBUTING.md).

This is a local-first, single-user MVP. There is no authentication or account isolation. The server binds to loopback only; publishing the source does not deploy a public application. Question images remain remote. Subject tags are automatic keyword-based suggestions, not official classifications. Review questions before distributing worksheets.

After importing, restart the server to reindex. Preserve the question years referenced by saved lists. Back up `data/` with the server stopped.

## License

Original application code is **MIT**. Imported exam text and images retain their own provenance and terms; the application license does not relicense them. Data is fetched from the community [ENEM API](https://enem.dev), whose repository declares GPL-2.0. This project is not affiliated with INEP or MEC.
