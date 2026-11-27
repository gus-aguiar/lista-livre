// Prova de conceito: transcrição literal de um caderno do ENCCEJA (INEP).
// Licença do INEP: CC BY-ND 3.0, então o texto não pode ser alterado e exige
// atribuição. O resultado fica fora do Git (data/sources/) e não é carregado
// pelo app. Ver docs/FONTES-PUBLICAS-GOVERNO.md.
//
// Requer pdftotext (poppler-utils). Uso:
//   node scripts/import-encceja.mjs scripts/encceja/2022-em-ciencias-humanas.json
//   node scripts/import-encceja.mjs <config> --hashes   # imprime hashes para revisar
import { execFileSync } from "node:child_process";
import https from "node:https";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sha256 = (data) => createHash("sha256").update(data).digest("hex");
export const lineHash = (line) => sha256(line.trim()).slice(0, 16);
const BARCODE = /^\*[A-Za-z0-9]+\*$/;
const HEADER = /^QUESTÃO (\d+)$/;
// Fim de enunciado de apoio: referência bibliográfica ou de site.
const CREDIT_START =
  /^(?:[A-ZÀ-Ý][A-ZÀ-Ý'’-]+(?: [A-ZÀ-Ý][A-ZÀ-Ý'’-]+)*[,.] |Disponível em|Fonte:)|(?:Acesso em:|\((?:adaptado|fragmento)\)\.)/;

export const tokens = (text) =>
  text.normalize("NFC").split(/\s+/).filter(Boolean);

// Separa o texto extraído em questões; cada linha guarda a página de origem.
export function splitQuestions(pages) {
  const questions = [];
  let current = null;
  for (const { page, text } of pages)
    for (const raw of text.split("\n")) {
      const line = raw.trimEnd();
      if (BARCODE.test(line.trim())) continue;
      const header = line.trim().match(HEADER);
      if (header) {
        current = { number: Number(header[1]), page, lines: [] };
        questions.push(current);
      } else if (current) current.lines.push(line.trim());
    }
  return questions;
}

// As alternativas são os últimos marcadores A, B, C, D no início de linha.
// Procurar de trás para frente evita confundir "A distribuição..." no enunciado.
export function splitAlternatives(lines, letters = ["A", "B", "C", "D"]) {
  const starts = [];
  let cursor = lines.length;
  for (const letter of [...letters].reverse()) {
    let i = cursor - 1;
    while (i >= 0 && !lines[i].startsWith(`${letter} `)) i--;
    if (i < 0) throw new Error(`Alternativa ${letter} não encontrada.`);
    starts.unshift(i);
    cursor = i;
  }
  const alternatives = letters.map((letter, k) => {
    const block = lines.slice(starts[k], starts[k + 1] ?? lines.length);
    const text = block
      .join(" ")
      .slice(letter.length + 1)
      .trim();
    if (!text) throw new Error(`Alternativa ${letter} vazia.`);
    return { letter, text };
  });
  return { body: lines.slice(0, starts[0]), alternatives };
}

// Blocos separados por linha em branco viram parágrafos. Prosa é unida com
// espaço (só quebra de linha do diagramador); verso mantém as quebras.
export function toParagraphs(lines, { verse = false, titleLines = 0 } = {}) {
  const blocks = [];
  let block = [];
  for (const line of [...lines, ""]) {
    if (line) block.push(line);
    else if (block.length) {
      blocks.push(block);
      block = [];
    }
  }
  // Título do texto de apoio (negrito centralizado no caderno) vira parágrafo.
  if (titleLines && blocks[0]?.length > titleLines)
    blocks.splice(
      0,
      1,
      blocks[0].slice(0, titleLines),
      blocks[0].slice(titleLines),
    );
  const paragraphs = [];
  blocks.forEach((lines, b) => {
    const command = b === blocks.length - 1;
    const creditAt = command
      ? -1
      : lines.findIndex((l) => CREDIT_START.test(l));
    const main = creditAt >= 0 ? lines.slice(0, creditAt) : lines;
    const credit = creditAt >= 0 ? lines.slice(creditAt) : [];
    // O comando da questão é sempre prosa, mesmo depois de um poema.
    if (main.length)
      paragraphs.push({
        kind: "text",
        text: verse && !command ? main.join("  \n") : main.join(" "),
      });
    if (credit.length)
      paragraphs.push({ kind: "credit", text: credit.join(" ") });
  });
  return paragraphs;
}

export function parseGabarito(text) {
  const answers = {};
  for (const m of text.matchAll(/^\s*(\d{1,3})\s+([A-E]|\*|X|Anulada)\s*$/gim))
    answers[Number(m[1])] = /^[A-E]$/.test(m[2]) ? m[2] : null;
  if (!Object.keys(answers).length) throw new Error("Gabarito vazio.");
  return answers;
}

// Fidelidade: a transcrição tem exatamente os tokens da fonte, na mesma ordem.
// Só espaços e quebras de linha podem mudar.
export function fidelity(transcribed, sourceLines) {
  const got = tokens(transcribed);
  const expected = tokens(sourceLines.join("\n"));
  const length = Math.max(got.length, expected.length);
  for (let i = 0; i < length; i++)
    if (got[i] !== expected[i])
      return { ok: false, at: i, got: got[i], expected: expected[i] };
  return { ok: true, tokens: got.length };
}

// Conferência independente: o trecho aparece na página com os mesmos
// caracteres, na mesma ordem. Espaços são ignorados porque o modo -raw do
// pdftotext cola palavras em linhas de espaçamento apertado.
const squash = (text) => text.normalize("NFC").replace(/\s+/g, "");
export const containsRun = (haystack, needle) =>
  squash(haystack).includes(squash(needle));

export function buildQuestion(raw, { config, answers, retrievedAt }) {
  const review = config.questions?.[raw.number] || {};
  const drop = new Set(review.dropLineHashes || []);
  const lines = raw.lines.filter((l) => !l || !drop.has(lineHash(l)));
  const dropped = raw.lines.length - lines.length;
  if (dropped !== drop.size)
    throw new Error(
      `Questão ${raw.number}: ${dropped} linhas de figura removidas, esperado ${drop.size}.`,
    );
  const { body, alternatives } = splitAlternatives(lines);
  const paragraphs = toParagraphs(body, {
    verse: review.verse,
    titleLines: review.titleLines,
  });
  const intro = paragraphs.at(-1);
  if (!intro || intro.kind !== "text")
    throw new Error(
      `Questão ${raw.number}: comando da questão não encontrado.`,
    );
  const context = paragraphs.slice(0, -1);
  const answer = answers[raw.number];
  const transcribed = [
    ...paragraphs.map((p) => p.text),
    ...alternatives.flatMap((a) => [a.letter, a.text]),
  ].join("\n");
  const check = fidelity(transcribed, lines);
  if (!check.ok)
    throw new Error(
      `Questão ${raw.number} não é literal no token ${check.at}: "${check.got}" ≠ "${check.expected}".`,
    );
  const warnings = [];
  if (review.figure)
    warnings.push(
      `Questão com figura não reproduzida. Consulte o caderno oficial, p. ${raw.page}.`,
    );
  if (answer === undefined)
    warnings.push("Questão ausente do gabarito oficial.");
  if (answer === null) warnings.push("Questão anulada no gabarito oficial.");
  const pdfUrl = `${config.caderno.url}#page=${raw.page}`;
  return {
    id: `${config.idPrefix}-${raw.number}`,
    title: `Questão ${raw.number} - ENCCEJA ${config.edicao}`,
    year: config.edicao,
    index: raw.number,
    discipline: config.discipline,
    context: context.map((p) => p.text).join("\n\n"),
    alternativesIntroduction: intro.text,
    alternatives: alternatives.map((a) => ({
      ...a,
      file: null,
      isCorrect: a.letter === answer,
    })),
    files: [],
    tags: [config.discipline, "encceja"],
    sourceUrl: pdfUrl,
    language: null,
    qualityWarnings: warnings,
    source: "inep-encceja",
    exam: {
      kind: "certificacao",
      banca: "INEP",
      orgao:
        "Instituto Nacional de Estudos e Pesquisas Educacionais Anísio Teixeira",
      nome: "ENCCEJA",
      edicao: config.edicao,
      aplicacao: config.aplicacao,
      nivel: config.nivel,
      caderno: config.caderno.nome,
      curso: null,
      cargo: null,
    },
    number: raw.number,
    answer: {
      letter: answer ?? null,
      annulled: answer === null,
      kind: "definitivo",
    },
    status: review.figure ? "requer-figura" : "revisado",
    provenance: {
      pdfUrl,
      page: raw.page,
      cadernoSha256: config.caderno.sha256,
      gabaritoUrl: config.gabarito.url,
      gabaritoSha256: config.gabarito.sha256,
      retrievedAt,
      method: "pdftotext-por-coluna+fidelidade-de-tokens+revisao-manual",
      textSha256: sha256(tokens(transcribed).join(" ")),
    },
    rights: {
      basis: "licenca:CC-BY-ND-3.0",
      licenseUrl: "https://creativecommons.org/licenses/by-nd/3.0/deed.pt_BR",
      attribution: `INEP. ENCCEJA ${config.edicao}, ${config.caderno.nome}, questão ${raw.number}. ${config.caderno.url}`,
      // Material de terceiros não é coberto pela licença do INEP.
      thirdPartyExcerpts: paragraphs
        .filter((p) => p.kind === "credit")
        .map((p) => ({ credito: p.text })),
    },
  };
}

function pdftotext(file, args) {
  return execFileSync("pdftotext", [...args, file, "-"], {
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
}

export function extractPages(file, config) {
  const { top, height, width, columnSplit } = config.crop;
  const pages = [];
  for (const [page, mode] of Object.entries(config.layout)) {
    const p = ["-f", page, "-l", page];
    const boxes =
      mode === "duas-colunas"
        ? [
            [0, columnSplit],
            [columnSplit, width - columnSplit],
          ]
        : [[0, width]];
    for (const [x, w] of boxes)
      pages.push({
        page: Number(page),
        text: pdftotext(
          file,
          [...p, "-x", x, "-y", top, "-W", w, "-H", height].map(String),
        ),
      });
  }
  return pages;
}

// download.inep.gov.br não envia o certificado intermediário, e o Node recusa
// a cadeia. A integridade vem do SHA-256 fixado na configuração revisada:
// qualquer byte diferente interrompe a importação.
function get(url) {
  return new Promise((resolve, reject) => {
    const request = https.get(
      url,
      { rejectUnauthorized: false, timeout: 180000 },
      (response) => {
        if (response.statusCode !== 200) {
          response.resume();
          return reject(new Error(`HTTP ${response.statusCode}: ${url}`));
        }
        const chunks = [];
        response.on("data", (c) => chunks.push(c));
        response.on("end", () => resolve(Buffer.concat(chunks)));
        response.on("error", reject);
      },
    );
    request.on("timeout", () =>
      request.destroy(new Error(`Tempo esgotado: ${url}`)),
    );
    request.on("error", reject);
  });
}

async function download(url, expected) {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const bytes = await get(url);
      const digest = sha256(bytes);
      if (digest !== expected)
        throw new Error(
          `SHA-256 diferente do revisado para ${url}: ${digest}. O INEP pode ter trocado o arquivo; revise de novo.`,
        );
      return bytes;
    } catch (error) {
      if (attempt === 3 || /SHA-256/.test(error.message)) throw error;
      await new Promise((r) => setTimeout(r, 5000 * (attempt + 1)));
    }
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const configPath = process.argv[2];
  if (!configPath)
    throw new Error("Informe o arquivo de configuração da edição.");
  const printHashes = process.argv.includes("--hashes");
  const config = JSON.parse(await readFile(configPath, "utf8"));
  const tmp = path.join(root, "data/sources/.tmp");
  await mkdir(tmp, { recursive: true });
  const retrievedAt = new Date().toISOString();
  const files = {};
  for (const key of ["caderno", "gabarito"]) {
    files[key] = path.join(tmp, `${config.idPrefix}-${key}.pdf`);
    await writeFile(
      files[key],
      await download(config[key].url, config[key].sha256),
    );
  }
  const answers = parseGabarito(pdftotext(files.gabarito, ["-layout"]));
  const raws = splitQuestions(extractPages(files.caderno, config));
  const expected = config.expectedNumbers;
  const numbers = raws.map((q) => q.number);
  if (
    JSON.stringify(numbers) !==
    JSON.stringify(
      Array.from(
        { length: expected[1] - expected[0] + 1 },
        (_, i) => expected[0] + i,
      ),
    )
  )
    throw new Error(`Questões fora de ordem ou faltando: ${numbers.join(",")}`);
  const items = raws.map((raw) =>
    buildQuestion(raw, { config, answers, retrievedAt }),
  );
  // Conferência independente: cada trecho precisa existir na extração da
  // página inteira em modo -raw, sem recorte de coluna.
  for (const item of items) {
    const page = pdftotext(files.caderno, [
      "-raw",
      "-f",
      String(item.provenance.page),
      "-l",
      String(item.provenance.page),
    ]);
    const parts = [
      ...item.context.split("\n\n"),
      item.alternativesIntroduction,
      ...item.alternatives.map((a) => a.text),
    ];
    for (const part of parts)
      if (!containsRun(page, part))
        throw new Error(
          `Questão ${item.number}: trecho não confere com a página inteira: "${part.slice(0, 60)}…"`,
        );
  }
  if (printHashes) {
    for (const item of items)
      console.log(item.number, item.provenance.textSha256);
    process.exit(0);
  }
  for (const item of items) {
    const reviewed = config.questions?.[item.number]?.reviewedSha256;
    if (reviewed !== item.provenance.textSha256)
      throw new Error(
        `Questão ${item.number}: texto difere do revisado (${reviewed || "sem revisão"}). Revise contra o PDF e atualize reviewedSha256.`,
      );
  }
  const output = {
    source: "inep-encceja",
    edicao: config.edicao,
    caderno: config.caderno,
    gabarito: config.gabarito,
    retrievedAt,
    license: "CC BY-ND 3.0 (rodapé do portal do INEP, gov.br)",
    count: items.length,
    revisadas: items.filter((i) => i.status === "revisado").length,
    requerFigura: items
      .filter((i) => i.status === "requer-figura")
      .map((i) => i.number),
    items,
  };
  const target = path.join(root, "data/sources", `${config.idPrefix}.json`);
  await writeFile(`${target}.tmp`, JSON.stringify(output, null, 2));
  await rename(`${target}.tmp`, target);
  const { items: _, ...summary } = output;
  console.log(JSON.stringify(summary, null, 2));
}
