import express from "express";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { createStore } from "./store.mjs";
import { demoConfig, rateLimit, visitorMiddleware } from "./demo.mjs";
const root = fileURLToPath(new URL("../", import.meta.url));
const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
export function createApp(options = {}) {
  const env = options.env || process.env;
  const dataDir = env.DATA_DIR || resolve(root, "data");
  const store = createStore({
    dbPath: options.dbPath || resolve(dataDir, "app.sqlite"),
    dataPath:
      options.dataPath ||
      env.QUESTIONS_PATH ||
      resolve(dataDir, "questions.json"),
  });
  const demo = "demo" in options ? options.demo : demoConfig(env);
  const app = express();
  app.disable("x-powered-by");
  if (env.TRUST_PROXY) app.set("trust proxy", Number(env.TRUST_PROXY) || 1);
  app.use(express.json({ limit: "100kb" }));
  app.locals.store = store;
  app.locals.demo = demo;
  const timers = [];
  app.locals.close = () => {
    timers.forEach(clearInterval);
    store.close();
  };
  app.get("/api/health", (_req, res) => {
    // Public status checks (e.g. the portfolio site) read this from another origin.
    // Only this route opens CORS; everything else stays same-origin.
    res.set("Access-Control-Allow-Origin", "*");
    try {
      const questions = store.health();
      res.status(questions > 0 ? 200 : 503).json({
        status: questions > 0 ? "ok" : "empty",
        questions,
        version: pkg.version,
        demo: Boolean(demo),
      });
    } catch (error) {
      console.error(error);
      res.status(503).json({ status: "error", version: pkg.version });
    }
  });
  app.get("/api/stats", (_req, res) => res.json(store.stats()));
  app.get("/api/questions", (req, res) => res.json(store.questions(req.query)));
  app.get("/api/questions/:id", (req, res) => {
    const item = store.question(req.params.id);
    return item
      ? res.json(item)
      : res.status(404).json({ error: "Questão não encontrada." });
  });
  // In demo mode every visitor gets their own lists; otherwise owner is undefined
  // and the original single-user behavior is kept.
  const owner = (req) => (demo ? req.visitor : undefined);
  if (demo) {
    app.use("/api/lists", visitorMiddleware(demo));
    const limiter = rateLimit({
      max: demo.rateLimit,
      windowMs: demo.rateWindowMs,
    });
    app.use("/api/lists", (req, res, next) =>
      req.method === "GET" ? next() : limiter(req, res, next),
    );
    const purge = () =>
      store.purgeListsBefore(
        new Date(Date.now() - demo.ttlHours * 3600 * 1000).toISOString(),
      );
    purge();
    const timer = setInterval(purge, 3600 * 1000);
    timer.unref();
    timers.push(timer);
  }
  app.get("/api/lists", (req, res) => res.json(store.lists(owner(req))));
  app.get("/api/lists/:id", (req, res) => {
    const list = store.list(req.params.id, owner(req));
    return list
      ? res.json(list)
      : res.status(404).json({ error: "Lista não encontrada." });
  });
  app.post("/api/lists", (req, res) => {
    if (demo && store.countLists(req.visitor) >= demo.maxLists)
      return res.status(409).json({
        error: `Limite de ${demo.maxLists} listas na demonstração. Exclua uma para criar outra.`,
      });
    try {
      res.status(201).json(store.saveList(req.body, undefined, owner(req)));
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  app.put("/api/lists/:id", (req, res) => {
    try {
      const list = store.saveList(req.body, req.params.id, owner(req));
      return list
        ? res.json(list)
        : res.status(404).json({ error: "Lista não encontrada." });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  app.delete("/api/lists/:id", (req, res) =>
    store.deleteList(req.params.id, owner(req))
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
