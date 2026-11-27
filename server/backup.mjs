// Online SQLite backup: consistent snapshot while the server keeps running.
// Usage: node server/backup.mjs   (or docker compose exec lista-livre node server/backup.mjs)
import { DatabaseSync } from "node:sqlite";
import { mkdirSync, readdirSync, rmSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const pattern = /^app-\d{8}T\d{6}Z\.sqlite$/;

export function verifyBackup(file) {
  const db = new DatabaseSync(file, { readOnly: true });
  try {
    const integrity = db.prepare("PRAGMA integrity_check").get();
    if (Object.values(integrity)[0] !== "ok")
      throw new Error(`Backup corrompido: ${file}`);
    return {
      questions: db.prepare("SELECT COUNT(*) AS n FROM questions").get().n,
      lists: db.prepare("SELECT COUNT(*) AS n FROM lists").get().n,
    };
  } finally {
    db.close();
  }
}

export function backupDatabase({ dbPath, dir, keep = 7, now = new Date() }) {
  if (!existsSync(dbPath)) throw new Error(`Banco não encontrado: ${dbPath}`);
  mkdirSync(dir, { recursive: true });
  const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  const file = join(dir, `app-${stamp}.sqlite`);
  if (existsSync(file)) throw new Error(`Backup já existe: ${file}`);
  // VACUUM INTO reads one transaction-consistent snapshot, WAL included,
  // and writes a compact standalone file without the -wal/-shm companions.
  const source = new DatabaseSync(dbPath, { readOnly: true });
  try {
    source.prepare("VACUUM INTO ?").run(file);
  } finally {
    source.close();
  }
  let counts;
  try {
    counts = verifyBackup(file);
  } catch (error) {
    rmSync(file, { force: true });
    throw error;
  }
  const removed = readdirSync(dir)
    .filter((name) => pattern.test(name))
    .sort()
    .reverse()
    .slice(Math.max(1, keep));
  for (const name of removed) rmSync(join(dir, name));
  return { file, ...counts, removed };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const dataDir = process.env.DATA_DIR || resolve(root, "data");
  const result = backupDatabase({
    dbPath: resolve(dataDir, "app.sqlite"),
    dir: process.env.BACKUP_DIR || resolve(dataDir, "backups"),
    keep: Number(process.env.BACKUP_KEEP) || 7,
  });
  console.log(JSON.stringify(result));
}
