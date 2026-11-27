import test from "node:test";
import assert from "node:assert/strict";
import {
  parseGabarito,
  parseCadernos,
  buildIndex,
} from "../scripts/import-ufrgs-gabarito.mjs";

// Synthetic markup shaped like the official page; no COPERSE content.
const gabaritoHtml = `
  <h3 id="matematica" class="col s12">Matemática</h3>
  <table><tr><td>01</td><td>A</td></tr><tr><td>02</td><td>*</td></tr></table>
  <h3 id="ingles">Inglês</h3>
  <table><tr><td>76</td><td>C</td></tr></table>
  <h3 id="espanhol">Espanhol</h3>
  <table><tr><td>76</td><td>e</td></tr></table>
  <h3 id="fisica">Física</h3>
  <table><tr><td>26</td><td>B</td></tr></table>`;
const editionHtml = `
  <a href="https://x.test/1o-DIA-PROVA-2024.pdf">CADERNO DE PROVA DO</a>
  <a href="https://x.test/1o-DIA-PROVA-2024.pdf"> 1º dia &#8211; Matemática</a>
  <a href="https://x.test/2o-DIA-2024-INGLES.pdf">2º dia &#8211; Inglês</a>
  <a href="https://x.test/2o-DIA-2024-ESPANHOL.pdf">2º dia &#8211; Espanhol</a>`;

test("parseGabarito keeps facts and flags annulled answers", () => {
  const items = parseGabarito(gabaritoHtml);
  assert.equal(items.length, 5);
  assert.deepEqual(
    items.map((i) => [i.subjectSlug, i.number, i.answer, i.annulled]),
    [
      ["matematica", 1, "A", false],
      ["matematica", 2, null, true],
      ["ingles", 76, "C", false],
      ["espanhol", 76, "E", false],
      ["fisica", 26, "B", false],
    ],
  );
});

test("parseGabarito rejects pages without answers", () => {
  assert.throws(() => parseGabarito("<p>manutenção</p>"), /Nenhum gabarito/);
});

test("parseCadernos deduplicates links and joins split labels", () => {
  const cadernos = parseCadernos(editionHtml);
  assert.equal(cadernos.length, 3);
  assert.equal(cadernos[0].label, "CADERNO DE PROVA DO 1º dia – Matemática");
});

test("buildIndex records provenance and never copies question text", () => {
  const index = buildIndex({
    year: 2024,
    gabaritoHtml,
    editionHtml,
    retrievedAt: "2026-11-26T00:00:00.000Z",
  });
  assert.equal(index.count, 5);
  assert.equal(index.annulled, 1);
  const byId = Object.fromEntries(index.items.map((i) => [i.id, i]));
  // Language blocks reuse numbers, so the subject is part of the id.
  assert.ok(byId["ufrgs-cv-2024-ingles-76"]);
  assert.ok(byId["ufrgs-cv-2024-espanhol-76"]);
  assert.deepEqual(byId["ufrgs-cv-2024-matematica-1"].provenance.cadernoUrls, [
    "https://x.test/1o-DIA-PROVA-2024.pdf",
  ]);
  assert.deepEqual(byId["ufrgs-cv-2024-ingles-76"].provenance.cadernoUrls, [
    "https://x.test/2o-DIA-2024-INGLES.pdf",
  ]);
  assert.equal(
    byId["ufrgs-cv-2024-fisica-26"].provenance.cadernoUrls.length,
    2,
  );
  for (const item of index.items) {
    assert.equal(item.text, null);
    assert.equal(item.status, "somente-gabarito");
    assert.equal(item.exam.banca, "COPERSE/UFRGS");
    assert.equal(
      item.provenance.gabaritoUrl,
      "https://vestibular.ufrgs.br/cv2024/gabaritos/",
    );
  }
});
