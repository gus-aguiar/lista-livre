// Independent smoke test: real snapshot, temporary database, isolated browser.
import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createApp } from "../server/app.mjs";
if (!existsSync(resolve("data/questions.json"))) {
  throw new Error("Importe as questões primeiro: npm run import -- 2023");
}
const dir = mkdtempSync(join(tmpdir(), "lista-livre-browser-"));
const app = createApp({
  dbPath: join(dir, "test.sqlite"),
  dataPath: resolve("data/questions.json"),
});
const server = await new Promise((resolve) => {
  const s = app.listen(0, "127.0.0.1", () => resolve(s));
});
const url = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({
  executablePath:
    process.env.CHROME_PATH ||
    (existsSync("/usr/bin/google-chrome")
      ? "/usr/bin/google-chrome"
      : undefined),
  headless: true,
  args: ["--no-sandbox"],
});
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    colorScheme: "dark",
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(url);
  await page.locator(".question-card").first().waitFor();
  assert.equal(await page.locator(".question-card").count(), 12);
  assert.equal(
    await page.locator("html").getAttribute("data-theme"),
    "dark",
    "Segue tema do sistema na primeira visita",
  );
  await page.emulateMedia({ colorScheme: "light" });
  await page.getByRole("button", { name: "Ativar tema escuro" }).waitFor();
  await page.getByRole("button", { name: "Ativar tema escuro" }).click();
  await page.reload();
  await page.getByRole("button", { name: "Ativar tema claro" }).waitFor();
  assert.equal(
    await page.locator("html").getAttribute("data-theme"),
    "dark",
    "Preferência explícita persiste sobre tema do sistema",
  );
  await page.getByRole("button", { name: "Ativar tema claro" }).click();
  await page.reload();
  await page.getByRole("button", { name: "Ativar tema escuro" }).waitFor();
  await page.getByRole("button", { name: "Ativar tema escuro" }).click();
  await page.getByLabel("Buscar questões").fill("#energia");
  await page.waitForResponse(
    (r) => r.url().includes("/api/questions?") && r.url().includes("energia"),
  );
  await page.locator(".question-card").first().waitFor();
  const disciplines = new Set(
    (
      await (await fetch(url + "/api/questions?q=energia&limit=100")).json()
    ).items.map((q) => q.discipline),
  );
  assert.ok(disciplines.size > 1, "Pesquisa deve cruzar áreas");
  await page
    .locator(".question-card")
    .first()
    .dragTo(page.locator(".dropzone"));
  assert.equal(await page.locator(".selected-question").count(), 1);
  await page
    .locator(".question-card")
    .nth(1)
    .getByRole("button", { name: /Adicionar questão/ })
    .click();
  assert.equal(await page.locator(".selected-question").count(), 2);
  const before = await page.locator(".selected-title").allTextContents();
  await page.getByLabel("Mover item 2 para cima").click();
  assert.deepEqual(
    await page.locator(".selected-title").allTextContents(),
    before.toReversed(),
  );
  const transfer = await page.evaluateHandle(() => new DataTransfer());
  await page
    .locator(".selected-question")
    .first()
    .dispatchEvent("dragstart", { dataTransfer: transfer });
  await page
    .locator(".selected-question")
    .first()
    .dispatchEvent("drop", { dataTransfer: transfer });
  assert.deepEqual(
    await page.locator(".selected-title").allTextContents(),
    before.toReversed(),
  );
  await page.getByRole("button", { name: "Cabeçalho e instruções" }).click();
  await page.getByLabel("Professor(a)", { exact: true }).fill("Professora Ana");
  await page.getByLabel("Escola", { exact: true }).fill("Escola de teste");
  await page.getByLabel("Turma", { exact: true }).fill("3º ano");
  await page.getByRole("button", { name: "Concluir", exact: true }).click();
  await page.getByRole("button", { name: "Salvar lista", exact: true }).click();
  await page.getByRole("status").waitFor();
  await page.reload();
  await page.locator(".selected-question").nth(1).waitFor();
  assert.equal(await page.locator(".selected-question").count(), 2);
  await page.getByRole("button", { name: "Minhas listas" }).click();
  await page.locator(".saved-row").first().waitFor();
  assert.equal(await page.locator(".saved-row").count(), 1);
  await page.getByRole("button", { name: "Abrir", exact: true }).click();
  await page.getByRole("button", { name: "Visualizar e imprimir" }).click();
  await page.locator(".print-question").nth(1).waitFor();
  assert.match(
    await page.locator(".print-sheet").innerText(),
    /Professora Ana/,
  );
  assert.equal(await page.locator(".answer-key").count(), 0);
  await page.getByLabel("Incluir gabarito separado").check();
  assert.equal(await page.locator(".answer-key").count(), 1);
  await page.emulateMedia({ media: "print" });
  assert.equal(await page.locator(".topbar").isVisible(), false);
  assert.equal(
    await page
      .locator(".print-sheet")
      .evaluate((el) => getComputedStyle(el).backgroundColor),
    "rgb(255, 255, 255)",
    "Folha permanece branca no modo escuro",
  );
  await page.pdf({ path: join(dir, "list.pdf"), format: "A4" });
  await page.emulateMedia({ media: "screen" });
  await page.getByRole("button", { name: "Voltar ao editor" }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
    "Sem overflow mobile",
  );
  await page.getByLabel("Buscar questões").fill("zxqnenhumaquestao999");
  await page.getByText("Nenhuma questão por aqui").waitFor();
  assert.deepEqual(errors, []);
  console.log(
    "PASS: temas claro/escuro/sistema, preferência persistida, busca multidisciplinar, drag/drop, reordenação, cabeçalho, salvar/reabrir, persistência, impressão/PDF, mobile e estado vazio.",
  );
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
  app.locals.store.close();
  rmSync(dir, { recursive: true, force: true });
}
