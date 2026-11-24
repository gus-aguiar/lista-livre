import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createStore } from "../server/store.mjs";
function fixture(t) {
  const dir = mkdtempSync(join(tmpdir(), "lista-livre-"));
  const dataPath = join(dir, "questions.json"),
    dbPath = join(dir, "app.sqlite");
  writeFileSync(
    dataPath,
    JSON.stringify([
      {
        id: "q1",
        year: 2023,
        discipline: "Matemática",
        title: "Questão 1",
        context: "Uma função representa a população.",
        tags: ["exponencial"],
        alternatives: [{ letter: "A", text: "Crescimento", isCorrect: true }],
      },
      {
        id: "q2",
        year: 2024,
        discipline: "Biologia",
        title: "Questão 2",
        context: "A população de bactérias cresce.",
        tags: ["exponencial", "ecologia"],
        alternatives: [],
      },
      {
        id: "q3",
        year: 2024,
        discipline: "Matemática",
        title: "Questão 3",
        context: "Um triângulo retângulo.",
        tags: ["geometria"],
        alternatives: [],
      },
    ]),
  );
  const store = createStore({ dataPath, dbPath });
  t.after(() => {
    store.close();
    rmSync(dir, { recursive: true, force: true });
  });
  return { store, dataPath, dbPath };
}
test("busca por texto e hashtag cruza disciplinas e ignora acentos", (t) => {
  const { store } = fixture(t);
  assert.equal(store.questions({ q: "populacao #exponencial" }).total, 2);
  assert.equal(store.questions({ q: "funcao #exponencial" }).items[0].id, "q1");
  assert.equal(store.questions({ q: "funcao ecologia" }).total, 0);
  assert.equal(store.questions({ q: "crescimento" }).items[0].id, "q1");
  assert.equal(store.questions({ q: '" OR * -' }).total, 0);
});
test("filtros, paginação e estatísticas", (t) => {
  const { store } = fixture(t);
  assert.equal(
    store.questions({ discipline: "Matemática", year: "2024" }).items[0].id,
    "q3",
  );
  const first = store.questions({ limit: 1 });
  const second = store.questions({ limit: 1, page: 2 });
  assert.equal(first.pages, 3);
  assert.notEqual(first.items[0].id, second.items[0].id);
  assert.equal(store.questions({ q: "impossivel" }).total, 0);
  assert.deepEqual(store.stats(), {
    total: 3,
    years: [2024, 2023],
    disciplines: ["Biologia", "Matemática"],
  });
});
test("listas persistem após reabrir banco e mantêm ordem de questões", (t) => {
  const { store, dataPath, dbPath } = fixture(t);
  const list = store.saveList({
    title: "Prova",
    questionIds: ["q2", "q1"],
    teacher: "Ana",
  });
  const reopened = createStore({ dataPath, dbPath });
  try {
    assert.deepEqual(reopened.list(list.id).questionIds, ["q2", "q1"]);
    assert.equal(reopened.list(list.id).teacher, "Ana");
    const updated = reopened.saveList(
      { title: "Revisão", questionIds: ["q1", "q2"] },
      list.id,
    );
    assert.equal(updated.createdAt, list.createdAt);
    assert.deepEqual(store.list(list.id).questionIds, ["q1", "q2"]);
    assert.equal(reopened.deleteList(list.id), true);
    assert.equal(store.list(list.id), null);
  } finally {
    reopened.close();
  }
});
test("valida referências e títulos antes de gravar", (t) => {
  const { store } = fixture(t);
  assert.throws(() => store.saveList({ title: "", questionIds: [] }), /título/);
  assert.throws(
    () => store.saveList({ title: "Prova", questionIds: ["missing"] }),
    /inexistente/,
  );
  assert.throws(
    () => store.saveList({ title: "Prova", questionIds: ["q1", "q1"] }),
    /repetidas/,
  );
  assert.equal(store.lists().length, 0);
});
test("atualizar acervo reindexa pesquisa sem apagar listas já salvas", (t) => {
  const { store, dataPath, dbPath } = fixture(t);
  const list = store.saveList({
    title: "Revisão anterior",
    questionIds: ["q1"],
  });
  writeFileSync(
    dataPath,
    JSON.stringify([
      {
        id: "q1",
        year: 2025,
        discipline: "Matemática",
        context: "Conteúdo atualizado sobre logaritmos",
        tags: ["logaritmo"],
        alternatives: [],
      },
    ]),
  );
  const reopened = createStore({ dataPath, dbPath });
  try {
    assert.equal(reopened.questions({ q: "#logaritmo" }).total, 1);
    assert.equal(reopened.questions({ q: "populacao" }).total, 0);
    assert.equal(reopened.stats().total, 1);
    assert.deepEqual(reopened.list(list.id).questionIds, ["q1"]);
  } finally {
    reopened.close();
  }
});
