import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import {
  BookOpen,
  Moon,
  Sun,
  Search,
  Plus,
  ArrowRight,
  GripVertical,
  X,
  Printer,
  Save,
  FolderOpen,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  Check,
  Layers,
  SlidersHorizontal,
  FileText,
  ExternalLink,
} from "lucide-react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-sans/600.css";
import "@fontsource/dm-sans/700.css";
import "@fontsource/manrope/500.css";
import "@fontsource/manrope/600.css";
import "@fontsource/manrope/700.css";
import "@fontsource/manrope/800.css";
import "./style.css";
const names = {
  matematica: "Matemática",
  linguagens: "Linguagens",
  "ciencias-humanas": "Ciências humanas",
  "ciencias-natureza": "Ciências da natureza",
};
const empty = () => ({
  title: "Minha lista de exercícios",
  teacher: "",
  school: "",
  className: "",
  instructions:
    "Leia as questões com atenção e assinale a alternativa correta.",
  questionIds: [],
});
async function api(path, options) {
  const r = await fetch("/api" + path, options);
  if (!r.ok) {
    let message;
    try {
      message = (await r.json()).error;
    } catch {}
    throw Error(message || "Não foi possível concluir. Tente novamente.");
  }
  return r.json();
}
function Rich({ text }) {
  return <Markdown remarkPlugins={[remarkGfm]}>{text || ""}</Markdown>;
}
function QuestionBody({ q, answers = false, printing = false }) {
  const referenced = q.context || "";
  return (
    <div className="question-body">
      <Rich text={q.context} />
      {(q.files || [])
        .filter((f) => !referenced.includes(f))
        .map((f, i) => (
          <img
            key={i}
            src={f}
            alt={`Figura da questão ${q.index}`}
            loading={printing ? "eager" : "lazy"}
          />
        ))}
      <Rich text={q.alternativesIntroduction} />
      <div className="alternatives">
        {(q.alternatives || []).map((a) => (
          <div
            key={a.letter}
            className={
              "alternative " + (answers && a.isCorrect ? "correct" : "")
            }
          >
            <b>{a.letter}</b>
            <div>
              <Rich text={a.text} />
              {a.file && (
                <img src={a.file} alt={`Figura da alternativa ${a.letter}`} />
              )}
            </div>
          </div>
        ))}
      </div>
      {q.qualityWarnings?.length > 0 && (
        <p className="warning">
          A fonte sinaliza conteúdo que precisa de conferência. Consulte a prova
          original antes de usar.
        </p>
      )}
    </div>
  );
}
function App() {
  const documentVersion = useRef(0);
  const [theme, setTheme] = useState(
    () => document.documentElement.dataset.theme || "light",
  );
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]').content =
      theme === "dark" ? "#171120" : "#6d28d9";
  }, [theme]);
  useEffect(() => {
    const system = window.matchMedia("(prefers-color-scheme: dark)");
    const followSystem = (event) => {
      let preference;
      try {
        preference = localStorage.getItem("lista-livre-theme");
      } catch {}
      if (preference !== "light" && preference !== "dark")
        setTheme(event.matches ? "dark" : "light");
    };
    system.addEventListener("change", followSystem);
    return () => system.removeEventListener("change", followSystem);
  }, []);
  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    try {
      localStorage.setItem("lista-livre-theme", next);
    } catch {}
  }
  const [stats, setStats] = useState({ total: 0, years: [], disciplines: [] }),
    [query, setQuery] = useState(""),
    [discipline, setDiscipline] = useState(""),
    [year, setYear] = useState(""),
    [page, setPage] = useState(1),
    [result, setResult] = useState({ items: [], total: 0, pages: 1 }),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [list, setList] = useState(() => {
      try {
        return JSON.parse(localStorage.getItem("lista-livre-draft")) || empty();
      } catch {
        return empty();
      }
    }),
    [selected, setSelected] = useState({}),
    [modal, setModal] = useState(null),
    [saved, setSaved] = useState([]),
    [preview, setPreview] = useState(false),
    [answers, setAnswers] = useState(false),
    [busy, setBusy] = useState(false),
    [over, setOver] = useState(false);
  useEffect(() => {
    if (!preview) return;
    const html = document.documentElement;
    html.classList.add("preview-open");
    return () => html.classList.remove("preview-open");
  }, [preview]);
  useEffect(() => {
    api("/stats")
      .then(setStats)
      .catch((e) => setError(e.message));
  }, []);
  useEffect(() => {
    let active = true;
    setLoading(true);
    const t = setTimeout(
      () =>
        api(
          `/questions?${new URLSearchParams({ q: query, discipline, year, page, limit: 12 })}`,
        )
          .then((data) => {
            if (active) {
              setResult(data);
              setError("");
              setSelected((old) => ({
                ...old,
                ...Object.fromEntries(data.items.map((q) => [q.id, q])),
              }));
            }
          })
          .catch((e) => active && setError(e.message))
          .finally(() => active && setLoading(false)),
      220,
    );
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [query, discipline, year, page]);
  useEffect(() => {
    localStorage.setItem("lista-livre-draft", JSON.stringify(list));
  }, [list]);
  useEffect(() => {
    let active = true;
    Promise.allSettled(
      list.questionIds
        .filter((id) => !selected[id])
        .map((id) => api("/questions/" + encodeURIComponent(id))),
    ).then((results) => {
      if (!active) return;
      const qs = results
        .filter((r) => r.status === "fulfilled")
        .map((r) => r.value);
      if (qs.length)
        setSelected((old) => ({
          ...old,
          ...Object.fromEntries(qs.map((q) => [q.id, q])),
        }));
      if (results.some((r) => r.status === "rejected"))
        setError(
          "Uma questão desta lista não está disponível. Remova o item que não carregou para imprimir.",
        );
    });
    return () => {
      active = false;
    };
  }, [list.questionIds, selected]);
  useEffect(() => {
    if (notice) {
      const t = setTimeout(() => setNotice(""), 3500);
      return () => clearTimeout(t);
    }
  }, [notice]);
  useEffect(() => {
    const fn = (e) => {
      if (e.key === "Escape") {
        setModal(null);
        setPreview(false);
      }
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, []);
  const change = (key, value) => setList((old) => ({ ...old, [key]: value }));
  function add(id, before) {
    if (id === before) return;
    setList((old) => {
      let ids = old.questionIds.filter((x) => x !== id);
      const index = before ? ids.indexOf(before) : -1;
      if (index >= 0) ids.splice(index, 0, id);
      else ids.push(id);
      return { ...old, questionIds: ids };
    });
  }
  function remove(id) {
    change(
      "questionIds",
      list.questionIds.filter((x) => x !== id),
    );
  }
  function move(id, delta) {
    const ids = [...list.questionIds],
      i = ids.indexOf(id),
      j = i + delta;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    change("questionIds", ids);
  }
  function drag(e, id) {
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "copyMove";
  }
  function drop(e, before) {
    e.preventDefault();
    e.stopPropagation();
    setOver(false);
    const id = e.dataTransfer.getData("text/plain");
    if (selected[id]) add(id, before);
  }
  async function save() {
    const version = documentVersion.current;
    const snapshot = list;
    setBusy(true);
    try {
      const value = await api(list.id ? "/lists/" + list.id : "/lists", {
        method: list.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(list),
      });
      if (documentVersion.current === version)
        setList((current) =>
          current === snapshot
            ? value
            : {
                ...current,
                id: value.id,
                createdAt: value.createdAt,
                updatedAt: value.updatedAt,
              },
        );
      setNotice("Lista salva no servidor.");
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function openLists() {
    try {
      setSaved(await api("/lists"));
      setModal("lists");
    } catch (e) {
      setError(e.message);
    }
  }
  async function printList() {
    setBusy(true);
    try {
      await document.fonts.ready;
      const images = [...document.querySelectorAll(".print-sheet img")];
      await Promise.all(images.map((img) => img.decode().catch(() => {})));
      if (images.some((img) => !img.naturalWidth)) {
        setError(
          "Uma imagem não carregou. Verifique a conexão e consulte a fonte antes de imprimir.",
        );
        setNotice("Impressão interrompida: há imagens indisponíveis.");
        return;
      }
      window.print();
    } finally {
      setBusy(false);
    }
  }
  const picked = list.questionIds.map((id) => selected[id]).filter(Boolean);
  return (
    <>
      <header className="topbar">
        <a href="/" className="brand">
          <span className="brand-mark">
            <Layers size={23} />
          </span>
          lista<span>livre</span>
          <small>BETA</small>
        </a>
        <nav>
          <button
            className="nav-active"
            onClick={() => {
              setModal(null);
              setPreview(false);
            }}
          >
            <BookOpen size={17} />
            Banco de questões
          </button>
          <button onClick={openLists}>
            <FolderOpen size={17} />
            Minhas listas
          </button>
        </nav>
        <div className="header-actions">
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={
              theme === "dark" ? "Ativar tema claro" : "Ativar tema escuro"
            }
            title={
              theme === "dark" ? "Ativar tema claro" : "Ativar tema escuro"
            }
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <div className="profile">
            P<span>Espaço do professor</span>
          </div>
        </div>
      </header>
      <main className="workspace">
        <section className="bank">
          <div className="eyebrow">MENOS FORMATAÇÃO. MAIS ENSINO.</div>
          <h1>
            Boas questões.
            <br />
            <span>Infinitas conexões.</span>
          </h1>
          <p className="intro">
            Encontre questões de diferentes áreas e monte uma lista do seu
            jeito.
          </p>
          <div className="search-wrap">
            <Search size={21} />
            <input
              id="search"
              name="q"
              aria-label="Buscar questões"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Busque por assunto, #hashtag ou texto da questão"
            />
            <kbd>BUSCAR</kbd>
          </div>
          <div className="filters">
            <SlidersHorizontal size={17} />
            <select
              id="filter-discipline"
              name="discipline"
              aria-label="Filtrar por área"
              value={discipline}
              onChange={(e) => {
                setDiscipline(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Todas as áreas</option>
              {stats.disciplines.map((d) => (
                <option key={d} value={d}>
                  {names[d] || d}
                </option>
              ))}
            </select>
            <select
              id="filter-year"
              name="year"
              aria-label="Filtrar por ano"
              value={year}
              onChange={(e) => {
                setYear(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Todos os anos</option>
              {stats.years.map((y) => (
                <option key={y}>{y}</option>
              ))}
            </select>
            <span className="source-pill">ENEM · Acervo público</span>
          </div>
          <div className="suggestions">
            <span>Explore conexões</span>
            {["meio-ambiente", "energia", "tecnologia", "porcentagem"].map(
              (t) => (
                <button
                  key={t}
                  onClick={() => {
                    setQuery("#" + t);
                    setPage(1);
                  }}
                >
                  #{t}
                </button>
              ),
            )}
          </div>
          <div className="results-heading">
            <h2>
              {loading
                ? "Buscando questões…"
                : `${result.total.toLocaleString("pt-BR")} questões encontradas`}
            </h2>
            <span>{stats.total.toLocaleString("pt-BR")} no acervo</span>
          </div>
          <p className="tag-note">
            Assuntos e hashtags sugeridos automaticamente; revise a pertinência
            pedagógica.
          </p>
          {error && (
            <div role="alert" className="error">
              {error}
              <button onClick={() => setError("")} aria-label="Fechar aviso">
                <X size={15} />
              </button>
            </div>
          )}
          <div className={"question-grid " + (loading ? "loading" : "")}>
            {result.items.map((q) => {
              const added = list.questionIds.includes(q.id);
              return (
                <article
                  className="question-card"
                  key={q.id}
                  draggable
                  onDragStart={(e) => drag(e, q.id)}
                >
                  <div className="card-top">
                    <span className={"area " + q.discipline}>
                      {names[q.discipline] || q.discipline}
                    </span>
                    <GripVertical size={19} className="grip" />
                  </div>
                  <div className="exam-meta">
                    ENEM {q.year} <span>•</span> Questão {q.index}
                    {q.language && ` · ${q.language}`}
                  </div>
                  <button
                    className="question-excerpt"
                    onClick={() => setModal(q)}
                  >
                    <Rich
                      text={q.context || q.alternativesIntroduction || q.title}
                    />
                  </button>
                  <div className="tags">
                    {(q.tags || []).slice(0, 3).map((t) => (
                      <button
                        key={t}
                        onClick={() => {
                          setQuery("#" + t);
                          setPage(1);
                        }}
                      >
                        #{t}
                      </button>
                    ))}
                  </div>
                  <footer>
                    <button className="text-button" onClick={() => setModal(q)}>
                      Ver questão <ArrowRight size={14} />
                    </button>
                    <button
                      className={"add-button " + (added ? "added" : "")}
                      aria-label={
                        added
                          ? "Remover questão " + q.index
                          : "Adicionar questão " + q.index
                      }
                      onClick={() => (added ? remove(q.id) : add(q.id))}
                    >
                      {added ? <Check size={16} /> : <Plus size={16} />}{" "}
                      {added ? "Adicionada" : "Adicionar"}
                    </button>
                  </footer>
                </article>
              );
            })}
          </div>
          {!loading && !result.items.length && (
            <div className="empty-results">
              <Search size={30} />
              <h3>Nenhuma questão por aqui</h3>
              <p>Tente outro assunto ou amplie os filtros.</p>
              <button
                onClick={() => {
                  setQuery("");
                  setDiscipline("");
                  setYear("");
                  setPage(1);
                }}
              >
                Limpar filtros
              </button>
            </div>
          )}
          <div className="pagination">
            <button
              aria-label="Página anterior"
              disabled={page <= 1 || loading}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft size={18} />
            </button>
            <span>
              Página {page} de {Math.max(1, result.pages)}
            </span>
            <button
              aria-label="Próxima página"
              disabled={page >= result.pages || loading}
              onClick={() => setPage(page + 1)}
            >
              <ChevronRight size={18} />
            </button>
          </div>
          <p className="attribution">
            Questões via{" "}
            <a href="https://enem.dev" target="_blank" rel="noreferrer">
              ENEM API
            </a>{" "}
            · Provas originais do{" "}
            <a
              href="https://www.gov.br/inep/pt-br/areas-de-atuacao/avaliacao-e-exames-educacionais/enem/provas-e-gabaritos"
              target="_blank"
              rel="noreferrer"
            >
              INEP <ExternalLink size={11} />
            </a>
          </p>
        </section>
        <aside className="builder">
          <div className="builder-heading">
            <span className="paper-icon">
              <FileText size={21} />
            </span>
            <div>
              <h2>Sua próxima lista</h2>
              <p>Um espaço para juntar boas ideias.</p>
            </div>
            <span className="counter">{list.questionIds.length}</span>
          </div>
          <label className="field-label">
            TÍTULO DA LISTA
            <input
              name="title"
              value={list.title}
              onChange={(e) => change("title", e.target.value)}
              placeholder="Dê um nome à lista"
            />
          </label>
          <button
            className="settings-button"
            onClick={() => setModal("settings")}
          >
            <SlidersHorizontal size={14} /> Cabeçalho e instruções{" "}
            <ChevronRight size={14} />
          </button>
          <div
            className={"dropzone " + (over ? "drag-over" : "")}
            onDragOver={(e) => {
              e.preventDefault();
              setOver(true);
            }}
            onDragLeave={() => setOver(false)}
            onDrop={(e) => drop(e)}
          >
            {!list.questionIds.length ? (
              <div className="empty-list">
                <div className="empty-illustration">
                  <FileText size={43} />
                  <span>
                    <Plus size={18} />
                  </span>
                </div>
                <h3>Comece com uma boa questão</h3>
                <p>
                  Arraste as questões para cá
                  <br />
                  ou clique em <strong>Adicionar</strong>.
                </p>
                <div className="dashed-line" />
              </div>
            ) : (
              <div className="selected-list">
                {list.questionIds.map((id, i) => {
                  const q = selected[id];
                  return (
                    <div
                      className="selected-question"
                      key={id}
                      draggable
                      onDragStart={(e) => drag(e, id)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => drop(e, id)}
                    >
                      <div className="selected-top">
                        <GripVertical size={16} />
                        <span>{String(i + 1).padStart(2, "0")}</span>
                        <b>
                          {q
                            ? names[q.discipline] || q.discipline
                            : "Carregando…"}
                        </b>
                        <button
                          aria-label={`Remover item ${i + 1}`}
                          onClick={() => remove(id)}
                        >
                          <X size={15} />
                        </button>
                      </div>
                      <button
                        className="selected-title"
                        onClick={() => q && setModal(q)}
                      >
                        {q ? `ENEM ${q.year} · Questão ${q.index}` : id}
                      </button>
                      <div className="reorder">
                        <button
                          aria-label={`Mover item ${i + 1} para cima`}
                          disabled={i === 0}
                          onClick={() => move(id, -1)}
                        >
                          <ArrowUp size={13} />
                        </button>
                        <button
                          aria-label={`Mover item ${i + 1} para baixo`}
                          disabled={i === list.questionIds.length - 1}
                          onClick={() => move(id, 1)}
                        >
                          <ArrowDown size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
                <p className="drop-hint">Arraste mais questões para cá</p>
              </div>
            )}
          </div>
          <div className="builder-bottom">
            <div className="summary">
              <span>{list.questionIds.length} questões</span>
              <span>
                {new Set(picked.map((q) => q.discipline)).size} áreas de
                conhecimento
              </span>
            </div>
            <button
              className="primary wide"
              disabled={
                !list.questionIds.length ||
                picked.length !== list.questionIds.length
              }
              onClick={() => setPreview(true)}
            >
              <Printer size={17} /> Visualizar e imprimir{" "}
              <ArrowRight size={16} />
            </button>
            <button
              className="save-button"
              disabled={busy || !list.title.trim()}
              onClick={save}
            >
              <Save size={16} />
              {busy ? "Salvando…" : "Salvar lista"}
            </button>
            <p className="local-note">
              <span /> Rascunho salvo neste navegador
            </p>
            <button
              className="text-button new-list"
              onClick={() => setModal("new")}
            >
              Criar outra lista
            </button>
          </div>
        </aside>
      </main>
      {notice && (
        <div className="toast" role="status">
          <Check size={17} />
          {notice}
        </div>
      )}
      {modal && (
        <div className="modal-backdrop" onClick={() => setModal(null)}>
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label={
              typeof modal === "object"
                ? "Detalhes da questão"
                : "Configurações da lista"
            }
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="close-modal"
              aria-label="Fechar janela"
              onClick={() => setModal(null)}
            >
              <X size={21} />
            </button>
            {typeof modal === "object" ? (
              <>
                <div className="eyebrow">
                  {names[modal.discipline] || modal.discipline}
                </div>
                <h2>
                  ENEM {modal.year} · Questão {modal.index}
                </h2>
                <QuestionBody q={modal} />
                <details>
                  <summary>Conferir gabarito</summary>
                  <p>
                    Alternativa{" "}
                    {(modal.alternatives || []).find((a) => a.isCorrect)
                      ?.letter || "não disponível"}
                  </p>
                </details>
                <a
                  href={modal.sourceUrl || "https://enem.dev"}
                  target="_blank"
                  rel="noreferrer"
                >
                  Consultar fonte <ExternalLink size={13} />
                </a>
                <button
                  className="primary wide"
                  onClick={() => {
                    if (!list.questionIds.includes(modal.id)) add(modal.id);
                    setModal(null);
                  }}
                >
                  {list.questionIds.includes(modal.id)
                    ? "Já está na sua lista"
                    : "Adicionar à lista"}
                </button>
              </>
            ) : modal === "settings" ? (
              <>
                <h2>Uma lista com a sua cara</h2>
                <p>Essas informações aparecem na versão impressa.</p>
                {[
                  ["teacher", "Professor(a)"],
                  ["school", "Escola"],
                  ["className", "Turma"],
                ].map(([key, label]) => (
                  <label className="form-label" key={key}>
                    {label}
                    <input
                      name={key}
                      value={list[key] || ""}
                      onChange={(e) => change(key, e.target.value)}
                    />
                  </label>
                ))}
                <label className="form-label">
                  Instruções
                  <textarea
                    name="instructions"
                    value={list.instructions || ""}
                    onChange={(e) => change("instructions", e.target.value)}
                  />
                </label>
                <button className="primary wide" onClick={() => setModal(null)}>
                  Concluir
                </button>
              </>
            ) : modal === "lists" ? (
              <>
                <h2>Minhas listas</h2>
                <p>
                  {stats.demo
                    ? "Salvas no servidor e ligadas a este navegador: outro navegador ou dispositivo não vê estas listas."
                    : "Salvas no servidor desta instalação da Lista Livre."}
                </p>
                {!saved.length && (
                  <p className="empty-results">
                    Você ainda não salvou nenhuma lista.
                  </p>
                )}
                {saved.map((item) => (
                  <div className="saved-row" key={item.id}>
                    <div>
                      <b>{item.title}</b>
                      <small>{item.questionIds.length} questões</small>
                    </div>
                    <button
                      onClick={() => {
                        documentVersion.current++;
                        setList(item);
                        setModal(null);
                        setNotice("Lista carregada.");
                      }}
                    >
                      Abrir <ArrowRight size={15} />
                    </button>
                  </div>
                ))}
              </>
            ) : (
              <>
                <h2>Criar outra lista?</h2>
                <p>
                  Salve a lista atual primeiro, caso queira abrir novamente
                  depois.
                </p>
                <button
                  className="primary wide"
                  onClick={async () => {
                    if (await save()) {
                      documentVersion.current++;
                      setList(empty());
                      setModal(null);
                    }
                  }}
                >
                  Salvar e criar outra lista
                </button>
                <button
                  className="save-button"
                  onClick={() => {
                    documentVersion.current++;
                    setList(empty());
                    setModal(null);
                  }}
                >
                  Começar uma lista vazia
                </button>
              </>
            )}
          </section>
        </div>
      )}
      {preview && (
        <div className="preview">
          <div className="preview-toolbar">
            <button onClick={() => setPreview(false)}>
              <ChevronLeft size={18} />
              Voltar ao editor
            </button>
            <label>
              <input
                type="checkbox"
                name="answers"
                checked={answers}
                onChange={(e) => setAnswers(e.target.checked)}
              />{" "}
              Incluir gabarito separado
            </label>
            <button className="primary" disabled={busy} onClick={printList}>
              <Printer size={17} />
              Imprimir / salvar PDF
            </button>
          </div>
          <article className="print-sheet">
            <header>
              <div className="print-school">
                {list.school || "LISTA DE EXERCÍCIOS"}
              </div>
              <h1>{list.title}</h1>
              <div className="print-meta">
                {list.teacher && <span>Professor(a): {list.teacher}</span>}
                {list.className && <span>Turma: {list.className}</span>}
              </div>
              <p className="print-student">
                <span>Nome:</span>
                <span className="print-blank" />
                <span>Data: ____/____/______</span>
              </p>
              <p className="instructions">{list.instructions}</p>
            </header>
            {picked.map((q, i) => (
              <section className="print-question" key={q.id}>
                <h3>
                  {i + 1}.{" "}
                  <span>
                    ENEM {q.year} · {names[q.discipline] || q.discipline} ·
                    Questão {q.index}
                  </span>
                </h3>
                <QuestionBody q={q} printing />
              </section>
            ))}
            {answers && (
              <section className="answer-key">
                <h2>Gabarito · {list.title}</h2>
                <div>
                  {picked.map((q, i) => (
                    <p key={q.id}>
                      <b>{i + 1}.</b>{" "}
                      {(q.alternatives || []).find((a) => a.isCorrect)
                        ?.letter || "Não disponível"}
                    </p>
                  ))}
                </div>
              </section>
            )}
            <footer>
              Fonte: provas do INEP, disponibilizadas pela ENEM API (enem.dev).
            </footer>
          </article>
        </div>
      )}
    </>
  );
}
createRoot(document.getElementById("root")).render(<App />);
