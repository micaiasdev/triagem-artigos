"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  FileDown,
  Loader2,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  RotateCcw,
  SkipForward,
  SlidersHorizontal,
  Star,
} from "lucide-react";
import type {
  AppState,
  Article,
  ArticlePatch,
  Criterion,
  Decision,
} from "@/lib/types";
import ArticleCard from "./ArticleCard";
import ArticleList, { type Filter } from "./ArticleList";
import CriteriaManager from "./CriteriaManager";
import CriteriaPicker from "./CriteriaPicker";
import DecisionBar from "./DecisionBar";
import FullTextPanel from "./FullTextPanel";
import FullTextViewer from "./FullTextViewer";
import ThemeToggle from "./ThemeToggle";

type Stage = "triage" | "fulltext";

export default function TriageScreen({ initialState }: { initialState: AppState }) {
  const router = useRouter();
  const [criteria, setCriteria] = useState(initialState.criteria);
  const inclusionCriteria = useMemo(
    () => criteria.filter((c) => c.type === "inclusion"),
    [criteria]
  );
  const exclusionCriteria = useMemo(
    () => criteria.filter((c) => c.type === "exclusion"),
    [criteria]
  );

  const [articles, setArticles] = useState<Article[]>(initialState.articles);
  const [index, setIndex] = useState(0);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [managerOpen, setManagerOpen] = useState(false);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [stage, setStage] = useState<Stage>("triage");
  const [uploading, setUploading] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [panelCollapsed, setPanelCollapsed] = useState(false);

  const current = articles[index];

  const counts = useMemo(() => {
    let included = 0;
    let excluded = 0;
    let pending = 0;
    let favorites = 0;
    let ftIncluded = 0;
    let ftExcluded = 0;
    let ftPending = 0;
    for (const a of articles) {
      if (a.decision === "included") included++;
      else if (a.decision === "excluded") excluded++;
      else pending++;
      if (a.favorite) favorites++;
      if (a.fullTextDecision === "included") ftIncluded++;
      else if (a.fullTextDecision === "excluded") ftExcluded++;
      else ftPending++;
    }
    return {
      total: articles.length,
      included,
      excluded,
      pending,
      favorites,
      ftIncluded,
      ftExcluded,
      ftPending,
    };
  }, [articles]);

  const isFt = stage === "fulltext";
  const activeIncluded = isFt ? counts.ftIncluded : counts.included;
  const activeExcluded = isFt ? counts.ftExcluded : counts.excluded;
  const activePending = isFt ? counts.ftPending : counts.pending;
  const activeClassified = activeIncluded + activeExcluded;
  const activeProgress = counts.total
    ? Math.round((activeClassified / counts.total) * 100)
    : 0;

  // -------- persistência --------
  const patch = useCallback(async (id: string, body: ArticlePatch) => {
    setSaving(true);
    try {
      await fetch(`/api/articles/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } finally {
      setSaving(false);
    }
  }, []);

  const updateCurrent = useCallback(
    (patchObj: Partial<Article>, body: ArticlePatch) => {
      if (!current) return;
      const id = current.id;
      setArticles((prev) =>
        prev.map((x) => (x.id === id ? { ...x, ...patchObj } : x))
      );
      patch(id, body);
    },
    [current, patch]
  );

  // -------- triagem (etapa 1) --------
  const setDecision = useCallback(
    (clicked: Decision) => {
      if (!current) return;
      const decision: Decision = current.decision === clicked ? "pending" : clicked;
      updateCurrent({ decision, criteriaCodes: [] }, { decision, criteriaCodes: [] });
    },
    [current, updateCurrent]
  );

  const toggleCriterion = useCallback(
    (code: string) => {
      if (!current) return;
      const has = current.criteriaCodes.includes(code);
      const criteriaCodes = has
        ? current.criteriaCodes.filter((c) => c !== code)
        : [...current.criteriaCodes, code];
      updateCurrent({ criteriaCodes }, { criteriaCodes });
    },
    [current, updateCurrent]
  );

  const visibleCriteria =
    current?.decision === "included"
      ? inclusionCriteria
      : current?.decision === "excluded"
        ? exclusionCriteria
        : [];

  const setAllCriteria = useCallback(
    (select: boolean) => {
      const criteriaCodes = select ? visibleCriteria.map((c) => c.code) : [];
      updateCurrent({ criteriaCodes }, { criteriaCodes });
    },
    [visibleCriteria, updateCurrent]
  );

  const justTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const setJustification = useCallback(
    (text: string) => {
      if (!current) return;
      const id = current.id;
      setArticles((prev) =>
        prev.map((x) => (x.id === id ? { ...x, justification: text } : x))
      );
      if (justTimer.current) clearTimeout(justTimer.current);
      justTimer.current = setTimeout(() => patch(id, { justification: text }), 500);
    },
    [current, patch]
  );

  const toggleFavorite = useCallback(() => {
    if (!current) return;
    updateCurrent({ favorite: !current.favorite }, { favorite: !current.favorite });
  }, [current, updateCurrent]);

  // -------- full-text (etapa 2) --------
  const setFullTextDecision = useCallback(
    (clicked: Decision) => {
      if (!current) return;
      const fullTextDecision: Decision =
        current.fullTextDecision === clicked ? "pending" : clicked;
      updateCurrent(
        { fullTextDecision, fullTextCriteriaCodes: [] },
        { fullTextDecision, fullTextCriteriaCodes: [] }
      );
    },
    [current, updateCurrent]
  );

  const toggleFullTextCriterion = useCallback(
    (code: string) => {
      if (!current) return;
      const has = current.fullTextCriteriaCodes.includes(code);
      const fullTextCriteriaCodes = has
        ? current.fullTextCriteriaCodes.filter((c) => c !== code)
        : [...current.fullTextCriteriaCodes, code];
      updateCurrent({ fullTextCriteriaCodes }, { fullTextCriteriaCodes });
    },
    [current, updateCurrent]
  );

  const visibleFullTextCriteria =
    current?.fullTextDecision === "included"
      ? inclusionCriteria
      : current?.fullTextDecision === "excluded"
        ? exclusionCriteria
        : [];

  const setAllFullTextCriteria = useCallback(
    (select: boolean) => {
      const fullTextCriteriaCodes = select
        ? visibleFullTextCriteria.map((c) => c.code)
        : [];
      updateCurrent({ fullTextCriteriaCodes }, { fullTextCriteriaCodes });
    },
    [visibleFullTextCriteria, updateCurrent]
  );

  const ftJustTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const setFullTextJustification = useCallback(
    (text: string) => {
      if (!current) return;
      const id = current.id;
      setArticles((prev) =>
        prev.map((x) => (x.id === id ? { ...x, fullTextJustification: text } : x))
      );
      if (ftJustTimer.current) clearTimeout(ftJustTimer.current);
      ftJustTimer.current = setTimeout(
        () => patch(id, { fullTextJustification: text }),
        500
      );
    },
    [current, patch]
  );

  const ftLinkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const setFullTextLink = useCallback(
    (link: string) => {
      if (!current) return;
      const id = current.id;
      setArticles((prev) =>
        prev.map((x) => (x.id === id ? { ...x, fullTextLink: link } : x))
      );
      if (ftLinkTimer.current) clearTimeout(ftLinkTimer.current);
      ftLinkTimer.current = setTimeout(() => patch(id, { fullTextLink: link }), 500);
    },
    [current, patch]
  );

  const uploadPdf = useCallback(
    async (file: File) => {
      if (!current) return;
      const id = current.id;
      setUploading(true);
      try {
        const form = new FormData();
        form.append("pdf", file);
        const res = await fetch(`/api/articles/${id}/pdf`, {
          method: "PUT",
          body: form,
        });
        const data = await res.json();
        if (res.ok && data.article) {
          setArticles((prev) =>
            prev.map((x) =>
              x.id === id ? { ...x, pdfName: data.article.pdfName } : x
            )
          );
        } else {
          alert(data.error ?? "Falha ao enviar o PDF.");
        }
      } catch (e) {
        alert("Erro de rede: " + (e as Error).message);
      } finally {
        setUploading(false);
      }
    },
    [current]
  );

  const removePdf = useCallback(async () => {
    if (!current) return;
    const id = current.id;
    setArticles((prev) =>
      prev.map((x) => (x.id === id ? { ...x, pdfName: "" } : x))
    );
    await fetch(`/api/articles/${id}/pdf`, { method: "DELETE" });
  }, [current]);

  // -------- navegação --------
  const goTo = useCallback(
    (i: number) => setIndex(Math.max(0, Math.min(articles.length - 1, i))),
    [articles.length]
  );
  const next = useCallback(() => goTo(index + 1), [goTo, index]);
  const prev = useCallback(() => goTo(index - 1), [goTo, index]);
  const nextPending = useCallback(() => {
    const n = articles.length;
    for (let off = 1; off <= n; off++) {
      const i = (index + off) % n;
      const d = isFt ? articles[i].fullTextDecision : articles[i].decision;
      if (d === "pending") {
        setIndex(i);
        return;
      }
    }
  }, [articles, index, isFt]);

  // -------- atalhos de teclado --------
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (managerOpen) return;
      const el = document.activeElement as HTMLElement | null;
      const typing =
        el &&
        (el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA" ||
          el.tagName === "SELECT" ||
          el.isContentEditable);
      if (typing) return;

      if (e.key === "ArrowRight") {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        prev();
      } else if (e.key === "i" || e.key === "I") {
        isFt ? setFullTextDecision("included") : setDecision("included");
      } else if (e.key === "e" || e.key === "E") {
        isFt ? setFullTextDecision("excluded") : setDecision("excluded");
      } else if (e.key === "f" || e.key === "F") {
        toggleFavorite();
      } else if (e.key >= "1" && e.key <= "9") {
        const list = isFt ? visibleFullTextCriteria : visibleCriteria;
        const c = list[Number(e.key) - 1];
        if (c) (isFt ? toggleFullTextCriterion : toggleCriterion)(c.code);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    next,
    prev,
    isFt,
    setDecision,
    setFullTextDecision,
    toggleCriterion,
    toggleFullTextCriterion,
    toggleFavorite,
    visibleCriteria,
    visibleFullTextCriteria,
    managerOpen,
  ]);

  // -------- lista filtrada (sidebar; filtro pela decisão da triagem) --------
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return articles
      .map((a, i) => ({ a, i }))
      .filter(({ a }) => (filter === "all" ? true : a.decision === filter))
      .filter(({ a }) => (favoritesOnly ? a.favorite : true))
      .filter(({ a }) => (q === "" ? true : a.title.toLowerCase().includes(q)));
  }, [articles, filter, search, favoritesOnly]);

  const handleCriteriaChange = useCallback(
    (nextCriteria: Criterion[], deletedCode?: string) => {
      setCriteria(nextCriteria);
      if (deletedCode) {
        setArticles((prev) =>
          prev.map((a) => ({
            ...a,
            criteriaCodes: a.criteriaCodes.filter((c) => c !== deletedCode),
            fullTextCriteriaCodes: a.fullTextCriteriaCodes.filter(
              (c) => c !== deletedCode
            ),
          }))
        );
      }
    },
    []
  );

  const reimportar = useCallback(async () => {
    if (
      !confirm(
        "Isto apaga o dataset atual (artigos e todas as classificações). Exporte antes se precisar. Continuar?"
      )
    )
      return;
    await fetch("/api/state", { method: "DELETE" });
    router.refresh();
  }, [router]);

  if (!current) {
    return (
      <div className="p-8 text-slate-500 dark:text-slate-400">
        Nenhum artigo carregado.
      </div>
    );
  }

  const exportBase = isFt ? "/api/export-fulltext" : "/api/export";

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <header className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-slate-200 bg-white px-5 py-3 dark:border-slate-800 dark:bg-slate-900">
        <h1 className="text-lg font-bold text-slate-900 dark:text-slate-50">
          Triagem de Artigos
        </h1>

        {/* Abas de etapa */}
        <div className="flex rounded-lg border border-slate-200 p-0.5 dark:border-slate-700">
          {(
            [
              ["triage", "Triagem"],
              ["fulltext", "Full-text"],
            ] as [Stage, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setStage(key)}
              className={`rounded-md px-3 py-1 text-sm font-medium transition ${
                stage === key
                  ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 text-sm">
          <span className="text-slate-500 dark:text-slate-400">
            {activeClassified}/{counts.total} classificados ({activeProgress}%)
          </span>
          <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            {activeIncluded}
          </span>
          <span className="inline-flex items-center gap-1 text-rose-700 dark:text-rose-400">
            <span className="h-2 w-2 rounded-full bg-rose-500" />
            {activeExcluded}
          </span>
          <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400">
            <span className="h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-600" />
            {activePending}
          </span>
          <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
            <Star className="h-3 w-3 fill-current" />
            {counts.favorites}
          </span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {saving && (
            <span className="inline-flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> salvando…
            </span>
          )}
          <a
            href={`${exportBase}?format=xlsx`}
            title={isFt ? "Exportar full-text (XLSX)" : "Exportar triagem (XLSX)"}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <FileDown className="h-4 w-4" /> XLSX
          </a>
          <a
            href={`${exportBase}?format=csv`}
            title={isFt ? "Exportar full-text (CSV)" : "Exportar triagem (CSV)"}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <FileDown className="h-4 w-4" /> CSV
          </a>
          <button
            onClick={() => setManagerOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <SlidersHorizontal className="h-4 w-4" /> Critérios
          </button>
          <button
            onClick={reimportar}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-500 hover:bg-rose-50 hover:text-rose-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-rose-950/50 dark:hover:text-rose-300"
          >
            <RotateCcw className="h-4 w-4" /> Reimportar
          </button>
          <ThemeToggle />
        </div>

        <div className="h-1 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div
            className="h-full bg-slate-900 transition-all dark:bg-slate-100"
            style={{ width: `${activeProgress}%` }}
          />
        </div>
      </header>

      {/* Corpo */}
      <div className="flex min-h-0 flex-1">
        {/* Sidebar */}
        {!sidebarCollapsed && (
          <aside className="hidden w-80 shrink-0 border-r border-slate-200 bg-white md:flex md:flex-col dark:border-slate-800 dark:bg-slate-900">
            <ArticleList
              items={filtered}
              currentId={current.id}
              onSelect={setIndex}
              filter={filter}
              setFilter={setFilter}
              search={search}
              setSearch={setSearch}
              favoritesOnly={favoritesOnly}
              setFavoritesOnly={setFavoritesOnly}
              dotDecision={isFt ? (a) => a.fullTextDecision : undefined}
            />
          </aside>
        )}

        {/* Painel principal */}
        <main className="flex min-w-0 flex-1 flex-col">
          {/* Navegação */}
          <div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-white px-5 py-2 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setSidebarCollapsed((v) => !v)}
                title={sidebarCollapsed ? "Mostrar lista" : "Ocultar lista"}
                className="hidden rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 md:inline-flex dark:text-slate-400 dark:hover:bg-slate-800"
              >
                {sidebarCollapsed ? (
                  <PanelLeftOpen className="h-4 w-4" />
                ) : (
                  <PanelLeftClose className="h-4 w-4" />
                )}
              </button>
              <button
                onClick={prev}
                disabled={index === 0}
                className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <ChevronLeft className="h-4 w-4" /> Anterior
              </button>
            </div>
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Artigo {index + 1} de {counts.total}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={nextPending}
                className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <SkipForward className="h-4 w-4" /> Próximo pendente
              </button>
              <button
                onClick={next}
                disabled={index === counts.total - 1}
                className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Próximo <ChevronRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPanelCollapsed((v) => !v)}
                title={panelCollapsed ? "Mostrar painel" : "Ocultar painel"}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                {panelCollapsed ? (
                  <PanelRightOpen className="h-4 w-4" />
                ) : (
                  <PanelRightClose className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Conteúdo */}
          <div
            className={`grid min-h-0 flex-1 grid-rows-[1fr] gap-0 overflow-hidden ${
              panelCollapsed ? "" : "lg:grid-cols-[minmax(0,1fr)_400px]"
            }`}
          >
            {/* Esquerda: artigo (triagem) ou full-text */}
            <section className="min-h-0 overflow-hidden border-b border-slate-200 p-5 lg:border-b-0 lg:border-r dark:border-slate-800">
              {isFt ? (
                <FullTextViewer article={current} />
              ) : (
                <ArticleCard article={current} onToggleFavorite={toggleFavorite} />
              )}
            </section>

            {/* Direita: painel de classificação */}
            {!panelCollapsed &&
              (isFt ? (
              <FullTextPanel
                article={current}
                visibleCriteria={visibleFullTextCriteria}
                onDecision={setFullTextDecision}
                onToggleCriterion={toggleFullTextCriterion}
                onSelectAllCriteria={setAllFullTextCriteria}
                onJustification={setFullTextJustification}
                onLinkChange={setFullTextLink}
                onUploadPdf={uploadPdf}
                onRemovePdf={removePdf}
                uploading={uploading}
              />
            ) : (
              <section className="min-h-0 space-y-5 overflow-y-auto bg-white p-5 dark:bg-slate-900">
                <div>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                    Decisão
                  </h3>
                  <DecisionBar decision={current.decision} onChange={setDecision} />
                </div>

                <div>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                    Justificativa (opcional)
                  </h3>
                  <textarea
                    value={current.justification}
                    onChange={(e) => setJustification(e.target.value)}
                    placeholder="Anote o raciocínio da decisão (vira coluna no export, útil para o RAG)…"
                    rows={4}
                    className="w-full resize-y rounded-lg border border-slate-200 p-3 text-sm outline-none focus:border-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:placeholder:text-slate-500 dark:focus:border-slate-500"
                  />
                </div>

                <div>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                    {current.decision === "included"
                      ? "Critérios de inclusão aplicáveis"
                      : current.decision === "excluded"
                        ? "Critérios de exclusão aplicáveis"
                        : "Critérios"}
                  </h3>
                  {current.decision === "pending" ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Escolha <strong>Incluso</strong> ou{" "}
                      <strong>Não incluso</strong> para marcar os critérios
                      correspondentes.
                    </p>
                  ) : (
                    <CriteriaPicker
                      criteria={visibleCriteria}
                      selected={current.criteriaCodes}
                      onToggle={toggleCriterion}
                      onSelectAll={setAllCriteria}
                      kindLabel={
                        current.decision === "included" ? "inclusão" : "exclusão"
                      }
                    />
                  )}
                </div>
              </section>
              ))}
          </div>
        </main>
      </div>

      {managerOpen && (
        <CriteriaManager
          criteria={criteria}
          onClose={() => setManagerOpen(false)}
          onChange={handleCriteriaChange}
        />
      )}
    </div>
  );
}
