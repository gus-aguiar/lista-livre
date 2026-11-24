import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp } from "../server/app.mjs";
test("API consulta questões e mantém ciclo de criação, edição e exclusão de lista", async (t) => {
  const dir = mkdtempSync(join(tmpdir(), "lista-api-"));
  const dataPath = join(dir, "questions.json");
  writeFileSync(
    dataPath,
    JSON.stringify([
      {
        id: "2024-1",
        year: 2024,
        discipline: "Biologia",
        context: "Ecologia da população",
        tags: ["ambiente"],
        alternatives: [],
      },
    ]),
  );
  const app = createApp({ dataPath, dbPath: join(dir, "app.sqlite") });
  const server = await new Promise((resolve) => {
    const server = app.listen(0, "127.0.0.1", () => resolve(server));
  });
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    app.locals.store.close();
    rmSync(dir, { recursive: true, force: true });
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  const request = (path, method = "GET", body) =>
    fetch(`${base}${path}`, {
      method,
      ...(body
        ? {
            headers: { "content-type": "application/json" },
            body: JSON.stringify(body),
          }
        : {}),
    });
  const result = await (
    await request("/api/questions?q=populacao%20%23ambiente")
  ).json();
  assert.equal(result.total, 1);
  assert.equal((await request("/api/questions/missing")).status, 404);
  const created = await request("/api/lists", "POST", {
    title: "Minha lista",
    questionIds: ["2024-1"],
  });
  assert.equal(created.status, 201);
  const list = await created.json();
  assert.equal((await (await request("/api/lists")).json()).length, 1);
  const updated = await request(`/api/lists/${list.id}`, "PUT", {
    title: "Título revisado",
  });
  assert.equal((await updated.json()).title, "Título revisado");
  assert.equal(
    (await request("/api/lists", "POST", { title: "", questionIds: [] }))
      .status,
    400,
  );
  assert.equal((await request(`/api/lists/${list.id}`, "DELETE")).status, 204);
  assert.equal((await (await request("/api/lists")).json()).length, 0);
});
