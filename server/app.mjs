import express from "express";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { existsSync } from "node:fs";
import { createStore } from "./store.mjs";
const root = fileURLToPath(new URL("../", import.meta.url));
export function createApp(options = {}) {
  const store = createStore({
    dbPath: options.dbPath || resolve(root, "data/app.sqlite"),
    dataPath: options.dataPath || resolve(root, "data/questions.json"),
  });
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "100kb" }));
  app.locals.store = store;
  app.get("/api/stats", (_req, res) => res.json(store.stats()));
  app.get("/api/questions", (req, res) => res.json(store.questions(req.query)));
  app.get("/api/questions/:id", (req, res) => {
    const item = store.question(req.params.id);
    return item
      ? res.json(item)
      : res.status(404).json({ error: "Questão não encontrada." });
  });
  app.get("/api/lists", (_req, res) => res.json(store.lists()));
  app.get("/api/lists/:id", (req, res) => {
    const list = store.list(req.params.id);
    return list
      ? res.json(list)
      : res.status(404).json({ error: "Lista não encontrada." });
  });
  app.post("/api/lists", (req, res) => {
    try {
      res.status(201).json(store.saveList(req.body));
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  app.put("/api/lists/:id", (req, res) => {
    try {
      const list = store.saveList(req.body, req.params.id);
      return list
        ? res.json(list)
        : res.status(404).json({ error: "Lista não encontrada." });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  app.delete("/api/lists/:id", (req, res) =>
    store.deleteList(req.params.id)
      ? res.status(204).end()
      : res.status(404).json({ error: "Lista não encontrada." }),
  );
  app.use("/api", (_req, res) =>
    res.status(404).json({ error: "Endpoint não encontrado." }),
  );
  const dist = resolve(root, "dist");
  if (existsSync(resolve(dist, "index.html"))) {
    app.use(express.static(dist));
    app.get("/{*path}", (_req, res) =>
      res.sendFile(resolve(dist, "index.html")),
    );
  }
  app.use((error, _req, res, _next) => {
    console.error(error);
    res.status(error.status || 500).json({
      error:
        error.status === 400
          ? "JSON inválido."
          : "Não foi possível concluir a solicitação.",
    });
  });
  return app;
}
