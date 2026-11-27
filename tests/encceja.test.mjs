import test from "node:test";
import assert from "node:assert/strict";
import {
  splitQuestions,
  splitAlternatives,
  toParagraphs,
  parseGabarito,
  fidelity,
  containsRun,
  buildQuestion,
  lineHash,
} from "../scripts/import-encceja.mjs";

// Synthetic text shaped like a pdftotext column; no INEP content.
const column = `*ABC123*
QUESTÃO 1
A cidade fictícia de Vale Azul
cresceu ao redor do rio.
SILVA, A. Cidades inventadas. São Paulo: Exemplo, 2020 (adaptado).

A expansão descrita no texto
está associada à
A presença de água
para abastecimento.
B chegada da ferrovia.
C criação de feiras.
D mudança do clima.
QUESTÃO 2
Rótulo da figura
Lua cheia
Sol posto
Disponível em: www.exemplo.org. Acesso em: 1 jan. 2020.

Qual verso fala do mar?
A Primeiro.
B Segundo.
C Terceiro.
D Quarto.
`;
const config = {
  idPrefix: "teste-2020",
  edicao: 2020,
  aplicacao: "regular-nacional",
  nivel: "ensino-medio",
  discipline: "ciencias-humanas",
  caderno: {
    nome: "Caderno de teste",
    url: "https://x.test/c.pdf",
    sha256: "c",
  },
  gabarito: { url: "https://x.test/g.pdf", sha256: "g" },
  questions: {
    2: { figure: true, dropLineHashes: [lineHash("Rótulo da figura")] },
  },
};
const answers = { 1: "A", 2: null };
const raws = splitQuestions([{ page: 4, text: column }]);

test("splitQuestions skips barcodes and keeps the page", () => {
  assert.deepEqual(
    raws.map((q) => [q.number, q.page]),
    [
      [1, 4],
      [2, 4],
    ],
  );
  assert.ok(!raws[0].lines.some((l) => l.includes("ABC123")));
});

test("splitAlternatives reads markers from the end", () => {
  // "A cidade..." starts with "A " but is not an alternative.
  const { body, alternatives } = splitAlternatives(raws[0].lines);
  assert.equal(body[0], "A cidade fictícia de Vale Azul");
  assert.deepEqual(alternatives[0], {
    letter: "A",
    text: "presença de água para abastecimento.",
  });
  assert.equal(alternatives[3].text, "mudança do clima.");
  assert.throws(() => splitAlternatives(["A só uma"]), /Alternativa D/);
});

test("toParagraphs separates credits, titles and keeps verse breaks", () => {
  const lines = [
    "Título",
    "Verso um",
    "Verso dois",
    "AUTOR, B. Livro. 2001.",
    "",
    "Comando",
    "longo",
  ];
  assert.deepEqual(toParagraphs(lines, { verse: true, titleLines: 1 }), [
    { kind: "text", text: "Título" },
    { kind: "text", text: "Verso um  \nVerso dois" },
    { kind: "credit", text: "AUTOR, B. Livro. 2001." },
    { kind: "text", text: "Comando longo" },
  ]);
});

test("parseGabarito reads answers and annulled items", () => {
  assert.deepEqual(parseGabarito("  QUESTÕES GABARITO\n  31   B\n  32   *\n"), {
    31: "B",
    32: null,
  });
  assert.throws(() => parseGabarito("nada"), /vazio/);
});

test("fidelity accepts only the same tokens in the same order", () => {
  const source = ["O rio", "corre.", "", "A mar."];
  assert.equal(fidelity("O rio corre.\nA mar.", source).ok, true);
  assert.equal(fidelity("O rio corre muito.\nA mar.", source).ok, false);
  assert.equal(fidelity("O corre rio.\nA mar.", source).ok, false);
  assert.equal(fidelity("O rio corre.", source).ok, false);
  assert.equal(fidelity("O rio corre!\nA mar.", source).ok, false);
});

test("containsRun ignores spacing but not characters", () => {
  assert.ok(containsRun("x asformasde dominação y", "as formas de dominação"));
  assert.ok(!containsRun("as formas de denominação", "as formas de dominação"));
});

test("buildQuestion is literal, attributed and licensed", () => {
  const q = buildQuestion(raws[0], {
    config,
    answers,
    retrievedAt: "2026-11-27T00:00:00Z",
  });
  assert.equal(q.id, "teste-2020-1");
  assert.equal(q.status, "revisado");
  assert.equal(
    q.context,
    "A cidade fictícia de Vale Azul cresceu ao redor do rio.\n\nSILVA, A. Cidades inventadas. São Paulo: Exemplo, 2020 (adaptado).",
  );
  assert.equal(
    q.alternativesIntroduction,
    "A expansão descrita no texto está associada à",
  );
  assert.equal(q.alternatives.find((a) => a.isCorrect).letter, "A");
  assert.equal(q.rights.basis, "licenca:CC-BY-ND-3.0");
  assert.match(
    q.rights.attribution,
    /^INEP\. ENCCEJA 2020, Caderno de teste, questão 1\. https:\/\/x\.test\/c\.pdf$/,
  );
  assert.deepEqual(q.rights.thirdPartyExcerpts, [
    {
      credito:
        "SILVA, A. Cidades inventadas. São Paulo: Exemplo, 2020 (adaptado).",
    },
  ]);
  assert.equal(q.sourceUrl, "https://x.test/c.pdf#page=4");
  assert.equal(q.exam.banca, "INEP");
  assert.deepEqual(q.qualityWarnings, []);
});

test("buildQuestion drops only reviewed figure lines and flags the figure", () => {
  const q = buildQuestion(raws[1], { config, answers, retrievedAt: "x" });
  assert.equal(q.status, "requer-figura");
  assert.ok(!q.context.includes("Rótulo da figura"));
  assert.ok(q.context.startsWith("Lua cheia Sol posto"));
  assert.equal(q.answer.annulled, true);
  assert.equal(q.alternatives.filter((a) => a.isCorrect).length, 0);
  assert.equal(q.qualityWarnings.length, 2);
  const wrong = {
    ...config,
    questions: { 2: { dropLineHashes: [lineHash("linha que não existe")] } },
  };
  assert.throws(
    () => buildQuestion(raws[1], { config: wrong, answers, retrievedAt: "x" }),
    /0 linhas de figura removidas, esperado 1/,
  );
});
