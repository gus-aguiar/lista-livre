import { createApp } from "./app.mjs";
const app = createApp();
const port = Number(process.env.PORT) || 3000;
const server = app.listen(port, "127.0.0.1", () =>
  console.log(
    `Lista Livre: http://localhost:${port} (${app.locals.store.stats().total} questões)`,
  ),
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () =>
    server.close(() => {
      app.locals.store.close();
      process.exit(0);
    }),
  );
