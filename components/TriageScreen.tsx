"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  FileDown,
  Loader2,
  RotateCcw,
  SkipForward,
} from "lucide-react";
import type { AppState, Article, ArticlePatch, Decision } from "@/lib/types";
import ArticleCard from "./ArticleCard";
import ArticleList, { type Filter } from "./ArticleList";
import CriteriaPicker from "./CriteriaPicker";
import DecisionBar from "./DecisionBar";

export default function TriageScreen({ initialState }: { initialState: AppState }) {
  const router = useRouter();
  const criteria = initialState.criteria;
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

  const current = articles[index];

  const counts = useMemo(() => {
    let included = 0;
    let excluded = 0;
    let pending = 0;
    for (const a of articles) {
      if (a.decision === "included") included++;
      else if (a.decision === "excluded") excluded++;
      else pending++;
    }
    return { total: articles.length, included, excluded, pending };
  }, [articles]);

  const classified = counts.included + counts.excluded;
  const progress = counts.total ? Math.round((classified / counts.total) * 100) : 0;

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

  const setDecision = useCallback(
    (clicked: Decision) => {
      if (!current) return;
      const decision: Decision = current.decision === clicked ? "pending" : clicked;
      setArticles((prev) =>
        prev.map((x) =>
          x.id === current.id ? { ...x, decision, criteriaCodes: [] } : x
        )
      );
      patch(current.id, { decision, criteriaCodes: [] });
    },
    [current, patch]
  );

  const toggleCriterion = useCallback(
    (code: string) => {
      if (!current) return;
      const has = current.criteriaCodes.includes(code);
      const criteriaCodes = has
        ? current.criteriaCodes.filter((c) => c !== code)
        : [...current.criteriaCodes, code];
      setArticles((prev) =>
        prev.map((x) => (x.id === current.id ? { ...x, criteriaCodes } : x))
      );
      patch(current.id, { criteriaCodes });
    },
    [current, patch]
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
      if (articles[i].decision === "pending") {
        setIndex(i);
        return;
      }
    }
  }, [articles, index]);

  const visibleCriteria =
    current?.decision === "included"
      ? inclusionCriteria
      : current?.decision === "excluded"
        ? exclusionCriteria
        : [];

  // -------- atalhos de teclado --------
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
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
        setDecision("included");
      } else if (e.key === "e" || e.key === "E") {
        setDecision("excluded");
      } else if (e.key >= "1" && e.key <= "9") {
        const c = visibleCriteria[Number(e.key) - 1];
        if (c) toggleCriterion(c.code);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, setDecision, toggleCriterion, visibleCriteria]);

  // -------- lista filtrada (sidebar) --------
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return articles
      .map((a, i) => ({ a, i }))
      .filter(({ a }) => (filter === "all" ? true : a.decision === filter))
      .filter(({ a }) => (q === "" ? true : a.title.toLowerCase().includes(q)));
  }, [articles, filter, search]);

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
    return <div className="p-8 text-slate-500">Nenhum artigo carregado.</div>;
  }

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <header className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-slate-200 bg-white px-5 py-3">
        <h1 className="text-lg font-bold text-slate-900">Triagem de Artigos</h1>

        <div className="flex items-center gap-3 text-sm">
          <span className="text-slate-500">
            {classified}/{counts.total} classificados ({progress}%)
          </span>
          <span className="inline-flex items-center gap-1 text-emerald-700">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            {counts.included}
          </span>
          <span className="inline-flex items-center gap-1 text-rose-700">
            <span className="h-2 w-2 rounded-full bg-rose-500" />
            {counts.excluded}
          </span>
          <span className="inline-flex items-center gap-1 text-slate-500">
            <span className="h-2 w-2 rounded-full bg-slate-300" />
            {counts.pending}
          </span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {saving && (
            <span className="inline-flex items-center gap-1 text-xs text-slate-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> salvando…
            </span>
          )}
          <a
            href="/api/export?format=xlsx"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <FileDown className="h-4 w-4" /> XLSX
          </a>
          <a
            href="/api/export?format=csv"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <FileDown className="h-4 w-4" /> CSV
          </a>
          <button
            onClick={reimportar}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-500 hover:bg-rose-50 hover:text-rose-700"
          >
            <RotateCcw className="h-4 w-4" /> Reimportar
          </button>
        </div>

        <div className="h-1 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full bg-slate-900 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </header>

      {/* Corpo */}
      <div className="flex min-h-0 flex-1">
        {/* Sidebar */}
        <aside className="hidden w-80 shrink-0 border-r border-slate-200 bg-white md:flex md:flex-col">
          <ArticleList
            items={filtered}
            currentId={current.id}
            onSelect={setIndex}
            filter={filter}
            setFilter={setFilter}
            search={search}
            setSearch={setSearch}
          />
        </aside>

        {/* Painel principal */}
        <main className="flex min-w-0 flex-1 flex-col">
          {/* Navegação */}
          <div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-white px-5 py-2">
            <button
              onClick={prev}
              disabled={index === 0}
              className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" /> Anterior
            </button>
            <span className="text-sm font-medium text-slate-500">
              Artigo {index + 1} de {counts.total}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={nextPending}
                className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
              >
                <SkipForward className="h-4 w-4" /> Próximo pendente
              </button>
              <button
                onClick={next}
                disabled={index === counts.total - 1}
                className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-40"
              >
                Próximo <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Conteúdo rolável: artigo + decisão + critérios + justificativa */}
          <div className="grid min-h-0 flex-1 grid-rows-[1fr] gap-0 overflow-hidden lg:grid-cols-[minmax(0,1fr)_380px]">
            {/* Artigo */}
            <section className="min-h-0 overflow-hidden border-b border-slate-200 p-5 lg:border-b-0 lg:border-r">
              <ArticleCard article={current} />
            </section>

            {/* Painel de classificação */}
            <section className="min-h-0 space-y-5 overflow-y-auto bg-white p-5">
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Decisão
                </h3>
                <DecisionBar decision={current.decision} onChange={setDecision} />
              </div>

              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {current.decision === "included"
                    ? "Critérios de inclusão aplicáveis"
                    : current.decision === "excluded"
                      ? "Critérios de exclusão aplicáveis"
                      : "Critérios"}
                </h3>
                {current.decision === "pending" ? (
                  <p className="text-sm text-slate-500">
                    Escolha <strong>Incluso</strong> ou <strong>Não incluso</strong>{" "}
                    para marcar os critérios correspondentes.
                  </p>
                ) : (
                  <CriteriaPicker
                    criteria={visibleCriteria}
                    selected={current.criteriaCodes}
                    onToggle={toggleCriterion}
                    kindLabel={
                      current.decision === "included" ? "inclusão" : "exclusão"
                    }
                  />
                )}
              </div>

              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Justificativa (opcional)
                </h3>
                <textarea
                  value={current.justification}
                  onChange={(e) => setJustification(e.target.value)}
                  placeholder="Anote o raciocínio da decisão (vira coluna no export, útil para o RAG)…"
                  rows={4}
                  className="w-full resize-y rounded-lg border border-slate-200 p-3 text-sm outline-none focus:border-slate-400"
                />
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
