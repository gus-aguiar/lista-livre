import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp } from "../server/app.mjs";

async function start(t, { demo, questions = true } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "lista-demo-"));
  const dataPath = join(dir, "questions.json");
  writeFileSync(
    dataPath,
    JSON.stringify(
      questions
        ? [{ id: "q1", year: 2024, discipline: "Física", alternatives: [] }]
        : [],
    ),
  );
  const app = createApp({
    dataPath,
    dbPath: join(dir, "app.sqlite"),
    demo,
    env: {},
  });
  const server = await new Promise((resolve) => {
    const s = app.listen(0, "127.0.0.1", () => resolve(s));
  });
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    app.locals.close();
    rmSync(dir, { recursive: true, force: true });
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  // Minimal cookie-jar per visitor.
  const visitor = () => {
    let cookie = "";
    return async (path, method = "GET", body) => {
      const res = await fetch(base + path, {
        method,
        headers: {
          ...(cookie ? { cookie } : {}),
          ...(body ? { "content-type": "application/json" } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      const set = res.headers.get("set-cookie");
      if (set) cookie = set.split(";")[0];
      return res;
    };
  };
  return { visitor, app };
}

const demo = (overrides = {}) => ({
  secret: "test-secret",
  maxLists: 3,
  rateLimit: 100,
  rateWindowMs: 60_000,
  ttlHours: 24,
  ...overrides,
});

test("health reporta questões, versão e status", async (t) => {
  const { visitor } = await start(t);
  const res = await visitor()("/api/health");
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.status, "ok");
  assert.equal(body.questions, 1);
  assert.match(body.version, /^\d+\.\d+\.\d+/);
  assert.equal(body.demo, false);
});

test("health falha (503) com acervo vazio", async (t) => {
  const { visitor } = await start(t, { questions: false });
  const res = await visitor()("/api/health");
  assert.equal(res.status, 503);
  assert.equal((await res.json()).status, "empty");
});

test("stats informa se a instância está em modo demo", async (t) => {
  const local = await start(t);
  assert.equal(
    (await (await local.visitor()("/api/stats")).json()).demo,
    false,
  );
  const pub = await start(t, { demo: demo() });
  assert.equal((await (await pub.visitor()("/api/stats")).json()).demo, true);
});

test("CORS aberto só em GET /api/health", async (t) => {
  const { visitor } = await start(t);
  const get = visitor();
  const health = await get("/api/health");
  assert.equal(health.headers.get("access-control-allow-origin"), "*");
  for (const path of ["/api/stats", "/api/questions", "/api/lists"]) {
    const res = await get(path);
    assert.equal(res.headers.get("access-control-allow-origin"), null, path);
  }
  const empty = await start(t, { questions: false });
  const down = await empty.visitor()("/api/health");
  assert.equal(down.status, 503);
  assert.equal(down.headers.get("access-control-allow-origin"), "*");
});

test("modo demo isola listas por visitante", async (t) => {
  const { visitor } = await start(t, { demo: demo() });
  const alice = visitor();
  const bob = visitor();
  const created = await alice("/api/lists", "POST", {
    title: "Lista da Alice",
    questionIds: ["q1"],
  });
  assert.equal(created.status, 201);
  const list = await created.json();
  assert.equal((await (await alice("/api/lists")).json()).length, 1);
  assert.equal((await alice(`/api/lists/${list.id}`)).status, 200);
  assert.deepEqual(await (await bob("/api/lists")).json(), []);
  assert.equal((await bob(`/api/lists/${list.id}`)).status, 404);
  assert.equal(
    (await bob(`/api/lists/${list.id}`, "PUT", { title: "x" })).status,
    404,
  );
  assert.equal((await bob(`/api/lists/${list.id}`, "DELETE")).status, 404);
  assert.equal(
    (await (await alice(`/api/lists/${list.id}`)).json()).title,
    "Lista da Alice",
  );
  // Forged cookie is rejected and treated as a new visitor.
  const forged = await fetch(
    (await alice("/api/health")).url.replace("/api/health", "/api/lists"),
    { headers: { cookie: "ll_visitor=" + list.id + ".forged" } },
  );
  assert.deepEqual(await forged.json(), []);
});

test("modo demo limita quantidade de listas e taxa de escrita", async (t) => {
  const { visitor } = await start(t, { demo: demo({ rateLimit: 5 }) });
  const alice = visitor();
  const body = { title: "L", questionIds: [] };
  for (let i = 0; i < 3; i++)
    assert.equal((await alice("/api/lists", "POST", body)).status, 201);
  assert.equal((await alice("/api/lists", "POST", body)).status, 409);
  assert.equal((await alice("/api/lists", "POST", body)).status, 409);
  assert.equal((await alice("/api/lists", "POST", body)).status, 429);
  assert.equal((await alice("/api/lists")).status, 200);
});

test("modo demo remove listas expiradas, sem tocar nas listas locais", async (t) => {
  const { app } = await start(t, { demo: demo() });
  const store = app.locals.store;
  const local = store.saveList({ title: "Local", questionIds: [] });
  store.saveList({ title: "Visitante", questionIds: [] }, undefined, "v1");
  assert.equal(
    store.purgeListsBefore(new Date(Date.now() + 1000).toISOString()),
    1,
  );
  assert.deepEqual(
    store.lists().map((l) => l.id),
    [local.id],
  );
});
