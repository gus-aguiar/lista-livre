import { createApp } from "./app.mjs";
const app = createApp();
const port = Number(process.env.PORT) || 3000;
const host = process.env.HOST || "127.0.0.1";
const server = app.listen(port, host, () =>
  console.log(
    `Lista Livre: http://${host}:${port} (${app.locals.store.stats().total} questões${app.locals.demo ? ", demo mode" : ""})`,
  ),
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () =>
    server.close(() => {
      app.locals.close();
      process.exit(0);
    }),
  );
