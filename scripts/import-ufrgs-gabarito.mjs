// Prova de conceito: índice de procedência do Concurso Vestibular UFRGS.
// Importa só fatos do gabarito oficial (número, matéria, letra) e os links
// dos cadernos oficiais. Não importa enunciado: ver docs/FONTES-VESTIBULARES-CONCURSOS.md.
import { mkdir, writeFile, rename } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const slug = (text) =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
const decode = (text) =>
  text
    .replace(/&#8211;/g, "–")
    .replace(/&amp;/g, "&")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();

// Página da edição no site da COPERSE: o slug não segue padrão entre anos,
// então só entram edições conferidas à mão.
export const EDITIONS = {
  2024: {
    editionPage: "https://www.ufrgs.br/coperse/cv-2024/",
    gabaritoPage: "https://vestibular.ufrgs.br/cv2024/gabaritos/",
  },
};
const LANGUAGES = ["ingles", "espanhol", "italiano", "frances", "alemao"];
const DAY_ONE = [
  "lingua-portuguesa",
  "literatura-em-lingua-portuguesa",
  "historia",
  "matematica",
];

export function parseGabarito(html) {
  const sections = html.split(/<h3\b/i).slice(1);
  const items = [];
  for (const section of sections) {
    const heading = section.match(/^[^>]*>([\s\S]*?)<\/h3>/i);
    if (!heading) continue;
    const subject = decode(heading[1]);
    const cells = [...section.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(
      (m) => decode(m[1]),
    );
    if (cells.length % 2)
      throw new Error(`Tabela de gabarito ímpar em ${subject}`);
    for (let i = 0; i < cells.length; i += 2) {
      const number = Number(cells[i]);
      const answer = cells[i + 1].toUpperCase();
      if (!Number.isInteger(number) || number < 1)
        throw new Error(
          `Número de questão inválido em ${subject}: ${cells[i]}`,
        );
      items.push({
        number,
        subject,
        subjectSlug: slug(subject),
        answer: /^[A-E]$/.test(answer) ? answer : null,
        annulled: !/^[A-E]$/.test(answer),
        rawAnswer: cells[i + 1],
      });
    }
  }
  if (!items.length) throw new Error("Nenhum gabarito encontrado na página.");
  return items;
}

export function parseCadernos(html) {
  const seen = new Map();
  for (const m of html.matchAll(/href="([^"]+\.pdf)"[^>]*>([\s\S]*?)<\/a>/gi)) {
    // A página divide o rótulo de um mesmo PDF em vários links.
    const label = decode(m[2]);
    const previous = seen.get(m[1]);
    seen.set(m[1], previous ? `${previous} ${label}`.trim() : label);
  }
  return [...seen].map(([url, label]) => ({ url, label }));
}

// Liga cada questão aos cadernos onde ela aparece, sem adivinhar página.
export function cadernosFor(subjectSlug, cadernos) {
  const name = (c) => slug(decodeURIComponent(c.url.split("/").pop()));
  if (DAY_ONE.includes(subjectSlug))
    return cadernos.filter((c) => /^1o-dia/.test(name(c))).map((c) => c.url);
  const dayTwo = cadernos.filter((c) => /^2o-dia/.test(name(c)));
  if (LANGUAGES.includes(subjectSlug))
    return dayTwo
      .filter((c) => name(c).includes(subjectSlug))
      .map((c) => c.url);
  return dayTwo.map((c) => c.url);
}

export function buildIndex({
  year,
  gabaritoHtml,
  editionHtml,
  hashes = {},
  retrievedAt,
}) {
  const edition = EDITIONS[year];
  const cadernos = parseCadernos(editionHtml).map((c) => ({
    ...c,
    sha256: hashes[c.url] || null,
  }));
  const items = parseGabarito(gabaritoHtml).map((item) => ({
    id: `ufrgs-cv-${year}-${item.subjectSlug}-${item.number}`,
    source: "ufrgs-cv",
    exam: {
      kind: "vestibular",
      banca: "COPERSE/UFRGS",
      orgao: "Universidade Federal do Rio Grande do Sul",
      nome: "Concurso Vestibular UFRGS",
      edicao: year,
      curso: null,
      cargo: null,
    },
    number: item.number,
    subject: item.subject,
    answer: item.answer,
    annulled: item.annulled,
    text: null,
    status: "somente-gabarito",
    provenance: {
      gabaritoUrl: edition.gabaritoPage,
      cadernoUrls: cadernosFor(item.subjectSlug, cadernos),
      retrievedAt,
      method: "parse-html-gabarito-oficial",
    },
  }));
  const ids = new Set(items.map((i) => i.id));
  if (ids.size !== items.length) throw new Error("IDs duplicados no gabarito.");
  return {
    source: "ufrgs-cv",
    year,
    retrievedAt,
    editionPage: edition.editionPage,
    gabaritoPage: edition.gabaritoPage,
    cadernos,
    count: items.length,
    annulled: items.filter((i) => i.annulled).length,
    rights:
      "Sem licença aberta declarada pela UFRGS. Só fatos do gabarito e links; nenhum enunciado é copiado.",
    items,
  };
}

async function fetchBytes(url) {
  for (let attempt = 0; attempt < 4; attempt++) {
    await sleep(1500);
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(90000),
        headers: {
          "user-agent":
            "lista-livre (+https://github.com/gus-aguiar/lista-livre)",
        },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);
      return Buffer.from(await response.arrayBuffer());
    } catch (error) {
      if (attempt === 3) throw error;
      await sleep(3000 * (attempt + 1));
    }
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const year = Number(process.argv[2] || 2024);
  if (!EDITIONS[year])
    throw new Error(
      `Edição ${year} não conferida. Disponíveis: ${Object.keys(EDITIONS).join(", ")}`,
    );
  const retrievedAt = new Date().toISOString();
  const gabaritoHtml = (await fetchBytes(EDITIONS[year].gabaritoPage)).toString(
    "utf8",
  );
  const editionHtml = (await fetchBytes(EDITIONS[year].editionPage)).toString(
    "utf8",
  );
  // O hash prova qual versão do caderno oficial foi consultada; o PDF não é guardado.
  const hashes = {};
  if (!process.argv.includes("--sem-hash"))
    for (const { url } of parseCadernos(editionHtml))
      hashes[url] = createHash("sha256")
        .update(await fetchBytes(url))
        .digest("hex");
  const index = buildIndex({
    year,
    gabaritoHtml,
    editionHtml,
    hashes,
    retrievedAt,
  });
  const dir = path.join(root, "data/sources");
  await mkdir(dir, { recursive: true });
  const target = path.join(dir, `ufrgs-cv-${year}.json`);
  await writeFile(`${target}.tmp`, JSON.stringify(index, null, 2));
  await rename(`${target}.tmp`, target);
  const { items, ...summary } = index;
  console.log(JSON.stringify(summary, null, 2));
}
