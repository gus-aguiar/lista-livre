import { mkdir, writeFile, rename } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const base = "https://api.enem.dev/v1";
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const normalize = (text) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
// Editorial search hints, not official INEP subject classification.
const rules = {
  "meio-ambiente":
    /ambienta|ecologi|poluic|biodiversidade|sustentab|desmatamento/,
  energia: /energia|energetic|combustiv|eletricidade/,
  geometria:
    /geometri|triangulo|circunferencia|cilindro|retangulo|poligono|diametro/,
  estatistica:
    /estatistic|media aritmetica|mediana|desvio padrao|frequencia relativa/,
  probabilidade: /probabilidade|aleatori|sorteio/,
  porcentagem: /porcentagem|percentual|juros|desconto/,
  funcoes: /funcao|funcoes|equacao|logaritm|exponencial/,
  saude: /saude|doenca|vacina|epidemia|virus|bacteria/,
  genetica: /genetic|hereditar|cromossom|\bdna\b|\brna\b/,
  quimica: /quimic|molecula|reacao|solucao aquosa|mol\/|oxidacao/,
  fisica: /velocidade|aceleracao|newton|circuito|resistor|optica|termic/,
  historia: /historico|historia|seculo|imperio|revolucao|colonial|escrav/,
  geografia: /geografic|territorio|urbaniz|migracao|cartograf|clima/,
  cidadania: /cidadania|direitos humanos|democracia|desigualdade|racismo/,
  filosofia: /filosof|aristoteles|platao|socrates|kant|nietzsche/,
  sociologia: /sociolog|durkheim|weber|marx|classes sociais/,
  literatura: /poema|poeta|literari|romance|modernismo|soneto/,
  "interpretacao-de-texto": /texto|narrador|discurso|sentido|linguagem/,
  "arte-e-cultura": /artist|cultura|pintura|musica|teatro|cinema/,
  tecnologia: /tecnolog|internet|digital|computador/,
};

async function request(url) {
  for (let attempt = 0; attempt < 5; attempt++) {
    await sleep(1100);
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);
      return await response.json();
    } catch (error) {
      if (attempt === 4) throw error;
      await sleep(2000 * (attempt + 1));
    }
  }
}

function transform(q) {
  const text = normalize(
    [
      q.context,
      q.alternativesIntroduction,
      ...q.alternatives.map((a) => a.text),
    ]
      .filter(Boolean)
      .join(" "),
  );
  const tags = [
    q.discipline,
    ...(q.language ? [q.language] : []),
    ...Object.entries(rules)
      .filter(([, pattern]) => pattern.test(text))
      .map(([tag]) => tag),
  ];
  const warnings = [];
  if (JSON.stringify(q).includes("broken-image.svg"))
    warnings.push(
      "A fonte sinaliza imagem indisponível. Confira o caderno original.",
    );
  if (q.alternatives.filter((a) => a.isCorrect).length !== 1)
    warnings.push("Gabarito ausente ou inconsistente na fonte.");
  if (q.alternatives.length !== 5)
    warnings.push(
      "A fonte não fornece as cinco alternativas. Confira o caderno original.",
    );
  return {
    id: `enem-${q.year}-${q.index}-${q.language || "pt"}`,
    title: q.title,
    year: q.year,
    index: q.index,
    discipline: q.discipline,
    context: q.context || "",
    alternativesIntroduction: q.alternativesIntroduction || "",
    alternatives: q.alternatives.map((a) => ({
      letter: a.letter,
      text: a.text || "",
      file: a.file || null,
      isCorrect: a.isCorrect === true,
    })),
    files: q.files || [],
    tags: [...new Set(tags)],
    sourceUrl: `${base}/exams/${q.year}/questions/${q.index}${q.language ? `?language=${q.language}` : ""}`,
    language: q.language || null,
    qualityWarnings: warnings,
  };
}

await mkdir(path.join(root, "data"), { recursive: true });
const exams = await request(`${base}/exams`);
const requestedYears = process.argv.slice(2).map(Number);
const selected = exams.filter(
  (e) => !requestedYears.length || requestedYears.includes(e.year),
);
if (!selected.length)
  throw new Error("Nenhuma edição encontrada para os anos informados.");
let questions = [];
for (const exam of selected) {
  const startCount = questions.length;
  let offset = 0;
  let hasMore = true;
  while (hasMore) {
    const page = await request(
      `${base}/exams/${exam.year}/questions?limit=50&offset=${offset}`,
    );
    if (!Array.isArray(page.questions) || !page.questions.length)
      throw new Error(`Página vazia inesperada: ${exam.year}/${offset}`);
    questions.push(...page.questions.map(transform));
    // This API uses inclusive question-number ranges, not row offsets.
    offset = Math.max(...page.questions.map((q) => q.index)) + 1;
    hasMore = page.metadata.hasMore;
  }
  // The default listing selects Spanish. Include the alternative English block.
  if (exam.languages?.some((language) => language.value === "ingles")) {
    const english = await request(
      `${base}/exams/${exam.year}/questions?limit=5&offset=0&language=ingles`,
    );
    questions.push(
      ...english.questions
        .filter((q) => q.language === "ingles")
        .map(transform),
    );
  }
  console.log(`${exam.year}: ${questions.length - startCount} questões`);
}
const unique = new Map();
for (const question of questions) {
  const existing = unique.get(question.id);
  if (existing && JSON.stringify(existing) !== JSON.stringify(question))
    throw new Error(`ID duplicado com dados divergentes: ${question.id}`);
  unique.set(question.id, question);
}
const repeatedRecords = questions.length - unique.size;
questions = [...unique.values()];
const manifest = {
  importedAt: new Date().toISOString(),
  source: "https://enem.dev",
  api: base,
  officialSource:
    "https://www.gov.br/inep/pt-br/areas-de-atuacao/avaliacao-e-exames-educacionais/enem/provas-e-gabaritos",
  count: questions.length,
  repeatedRecords,
  years: selected.map((e) => e.year),
  tagsMethod:
    "Regras por palavras-chave; classificação automática não revisada, não oficial do INEP.",
  questionsWithWarnings: questions.filter((q) => q.qualityWarnings.length)
    .length,
  disciplines: Object.fromEntries(
    [...new Set(questions.map((q) => q.discipline))].map((d) => [
      d,
      questions.filter((q) => q.discipline === d).length,
    ]),
  ),
};
await writeFile(
  path.join(root, "data/questions.json.tmp"),
  JSON.stringify(questions),
);
await rename(
  path.join(root, "data/questions.json.tmp"),
  path.join(root, "data/questions.json"),
);
await writeFile(
  path.join(root, "data/manifest.json"),
  JSON.stringify(manifest, null, 2),
);
console.log(JSON.stringify(manifest, null, 2));
