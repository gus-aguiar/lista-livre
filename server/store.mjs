import { DatabaseSync } from "node:sqlite";
import { mkdirSync, existsSync, readFileSync, statSync } from "node:fs";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";

export const normalize = (value) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
export function createStore({ dbPath, dataPath }) {
  if (dbPath !== ":memory:") mkdirSync(dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
    CREATE TABLE IF NOT EXISTS metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS questions (id TEXT PRIMARY KEY, year INTEGER, discipline TEXT, payload TEXT NOT NULL);
    CREATE VIRTUAL TABLE IF NOT EXISTS question_search USING fts5(id UNINDEXED, text, tokenize='unicode61 remove_diacritics 2');
    CREATE INDEX IF NOT EXISTS questions_filter ON questions(discipline, year);
    CREATE TABLE IF NOT EXISTS lists (id TEXT PRIMARY KEY, payload TEXT NOT NULL, updatedAt TEXT NOT NULL);`);
  if (existsSync(dataPath)) {
    const stat = statSync(dataPath);
    const signature = `${dataPath}:${stat.size}:${stat.mtimeMs}`;
    if (
      db.prepare("SELECT value FROM metadata WHERE key=?").get("source")
        ?.value !== signature
    ) {
      const source = JSON.parse(readFileSync(dataPath, "utf8"));
      if (!Array.isArray(source))
        throw new Error("data/questions.json precisa conter um array.");
      const insert = db.prepare("INSERT INTO questions VALUES (?, ?, ?, ?)");
      const search = db.prepare(
        "INSERT INTO question_search (id,text) VALUES (?,?)",
      );
      db.exec("BEGIN");
      try {
        db.exec("DELETE FROM questions; DELETE FROM question_search;");
        for (const item of source) {
          const question = { ...item, id: String(item.id) };
          insert.run(
            question.id,
            Number(question.year) || null,
            question.discipline || "",
            JSON.stringify(question),
          );
          search.run(
            question.id,
            normalize(
              [
                question.title,
                question.context,
                question.alternativesIntroduction,
                question.discipline,
                ...(question.tags || []),
                ...(question.alternatives || []).map((a) => a.text),
              ]
                .filter(Boolean)
                .join(" "),
            ),
          );
        }
        db.prepare("INSERT OR REPLACE INTO metadata VALUES (?,?)").run(
          "source",
          signature,
        );
        db.exec("COMMIT");
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
    }
  }
  return {
    close: () => db.close(),
    stats() {
      return {
        total: db.prepare("SELECT COUNT(*) AS n FROM questions").get().n,
        years: db
          .prepare(
            "SELECT DISTINCT year FROM questions WHERE year IS NOT NULL ORDER BY year DESC",
          )
          .all()
          .map((r) => r.year),
        disciplines: db
          .prepare(
            "SELECT DISTINCT discipline FROM questions WHERE discipline != '' ORDER BY discipline",
          )
          .all()
          .map((r) => r.discipline),
      };
    },
    questions({
      q = "",
      discipline = "",
      year = "",
      page = 1,
      limit = 20,
    } = {}) {
      const parsedPage = Math.max(1, Math.floor(Number(page)) || 1);
      const parsedLimit = Math.min(
        100,
        Math.max(1, Math.floor(Number(limit)) || 20),
      );
      const terms = normalize(q).match(/[\p{L}\p{N}]+/gu) || [];
      const where = [],
        args = [];
      if (terms.length) {
        where.push("id IN (SELECT id FROM question_search WHERE text MATCH ?)");
        args.push(
          terms
            .slice(0, 30)
            .map((t) => `"${t}"*`)
            .join(" AND "),
        );
      }
      if (discipline) {
        where.push("discipline = ?");
        args.push(String(discipline));
      }
      if (year) {
        where.push("year = ?");
        args.push(Number(year));
      }
      const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
      const total = db
        .prepare(`SELECT COUNT(*) AS n FROM questions ${clause}`)
        .get(...args).n;
      const items = db
        .prepare(
          `SELECT payload FROM questions ${clause} ORDER BY year DESC, CAST(json_extract(payload, '$.index') AS INTEGER), id LIMIT ? OFFSET ?`,
        )
        .all(...args, parsedLimit, (parsedPage - 1) * parsedLimit)
        .map((r) => JSON.parse(r.payload));
      return {
        items,
        total,
        page: parsedPage,
        pages: Math.ceil(total / parsedLimit),
      };
    },
    question(id) {
      const row = db
        .prepare("SELECT payload FROM questions WHERE id=?")
        .get(String(id));
      return row ? JSON.parse(row.payload) : null;
    },
    lists() {
      return db
        .prepare("SELECT payload FROM lists ORDER BY updatedAt DESC")
        .all()
        .map((r) => JSON.parse(r.payload));
    },
    list(id) {
      const row = db.prepare("SELECT payload FROM lists WHERE id=?").get(id);
      return row ? JSON.parse(row.payload) : null;
    },
    saveList(input, id) {
      const previous = id ? this.list(id) : null;
      if (id && !previous) return null;
      if (!input || typeof input !== "object" || Array.isArray(input))
        throw new Error("Lista inválida.");
      const merged = { ...previous, ...input };
      if (typeof merged.title !== "string" || !merged.title.trim())
        throw new Error("Informe um título para a lista.");
      if (!Array.isArray(merged.questionIds) || merged.questionIds.length > 500)
        throw new Error("A lista deve conter até 500 questões.");
      const questionIds = merged.questionIds.map(String);
      if (new Set(questionIds).size !== questionIds.length)
        throw new Error("A lista contém questões repetidas.");
      if (questionIds.some((qid) => !this.question(qid)))
        throw new Error("A lista contém uma questão inexistente.");
      const now = new Date().toISOString();
      const list = {
        id: previous?.id || randomUUID(),
        title: merged.title.trim().slice(0, 200),
        questionIds,
        createdAt: previous?.createdAt || now,
        updatedAt: now,
      };
      for (const field of ["teacher", "school", "className", "instructions"])
        list[field] = String(merged[field] ?? "").slice(
          0,
          field === "instructions" ? 5000 : 200,
        );
      db.prepare("INSERT OR REPLACE INTO lists VALUES (?, ?, ?)").run(
        list.id,
        JSON.stringify(list),
        list.updatedAt,
      );
      return list;
    },
    deleteList(id) {
      return db.prepare("DELETE FROM lists WHERE id=?").run(id).changes > 0;
    },
  };
}
