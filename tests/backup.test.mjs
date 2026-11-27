import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdirSync,
  mkdtempSync,
  writeFileSync,
  rmSync,
  readdirSync,
  copyFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createStore } from "../server/store.mjs";
import { backupDatabase } from "../server/backup.mjs";

function fixture(t) {
  const dir = mkdtempSync(join(tmpdir(), "lista-livre-backup-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const dataPath = join(dir, "questions.json");
  writeFileSync(
    dataPath,
    JSON.stringify([
      { id: "q1", year: 2023, discipline: "matematica", title: "Questão 1" },
      { id: "q2", year: 2024, discipline: "linguagens", title: "Questão 2" },
    ]),
  );
  return { dir, dataPath, dbPath: join(dir, "app.sqlite") };
}

test("backup runs while the store is open and restores lists", (t) => {
  const { dir, dataPath, dbPath } = fixture(t);
  const store = createStore({ dbPath, dataPath });
  const list = store.saveList({ title: "Revisão", questionIds: ["q2"] });
  // The write may still sit in the WAL; the snapshot must include it.
  const result = backupDatabase({
    dbPath,
    dir: join(dir, "backups"),
    now: new Date("2026-11-27T03:00:00Z"),
  });
  store.close();
  assert.equal(result.questions, 2);
  assert.equal(result.lists, 1);
  assert.match(result.file, /app-20261127T030000Z\.sqlite$/);

  // Restore test: the backup alone is a working database.
  const restoredDir = join(dir, "restored");
  const restoredDb = join(dir, "restored.sqlite");
  copyFileSync(result.file, restoredDb);
  const restored = createStore({
    dbPath: restoredDb,
    dataPath: join(restoredDir, "missing.json"),
  });
  t.after(() => restored.close());
  assert.equal(restored.health(), 2);
  assert.equal(restored.list(list.id).title, "Revisão");
});

test("backup keeps only the newest files", (t) => {
  const { dir, dataPath, dbPath } = fixture(t);
  createStore({ dbPath, dataPath }).close();
  const backups = join(dir, "backups");
  mkdirSync(backups);
  // Files that are not backups are never rotated away.
  writeFileSync(join(backups, "notes.txt"), "");
  for (const hour of ["01", "02", "03"])
    backupDatabase({
      dbPath,
      dir: backups,
      keep: 2,
      now: new Date(`2026-11-27T${hour}:00:00Z`),
    });
  assert.deepEqual(readdirSync(backups).sort(), [
    "app-20261127T020000Z.sqlite",
    "app-20261127T030000Z.sqlite",
    "notes.txt",
  ]);
});

test("backup fails clearly when the database is missing", (t) => {
  const { dir } = fixture(t);
  assert.throws(
    () => backupDatabase({ dbPath: join(dir, "nope.sqlite"), dir }),
    /Banco não encontrado/,
  );
});
